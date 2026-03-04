/**
 * Script to parse IBM hardware calibration CSVs and generate TypeScript data file.
 * Run: node scripts/generateHardwareData.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const HARDWARES_DIR = path.join(ROOT, 'hardwares')
const OUTPUT = path.join(ROOT, 'src', 'data', 'hardwareCalibrationData.ts')

const BACKENDS = [
  { dir: 'boston', name: 'ibm_boston' },
  { dir: 'fez', name: 'ibm_fez' },
  { dir: 'kingston', name: 'ibm_kingston' },
  { dir: 'marrakesh', name: 'ibm_marrakesh' },
  { dir: 'miami', name: 'ibm_miami' },
  { dir: 'pittsburgh', name: 'ibm_pittsburgh' },
  { dir: 'torino', name: 'ibm_torino' },
]

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = parseCSVLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || ''
    }
    rows.push(row)
  }
  return rows
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCZError(czErrorStr) {
  // Format: "15:0.002;1:0.003" → [{target: 15, error: 0.002}, {target: 1, error: 0.003}]
  if (!czErrorStr || czErrorStr.trim() === '') return []
  return czErrorStr.split(';').map(part => {
    const [target, error] = part.split(':')
    return { target: parseInt(target), error: parseFloat(error) }
  }).filter(e => !isNaN(e.target) && !isNaN(e.error))
}

function parseBackend(dirName, backendName) {
  const dirPath = path.join(HARDWARES_DIR, dirName)
  const files = fs.readdirSync(dirPath)
  const csvFile = files.find(f => f.endsWith('.csv'))
  if (!csvFile) throw new Error(`No CSV found for ${backendName}`)

  // Extract calibration date from filename
  const dateMatch = csvFile.match(/(\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}Z)/)
  const calibrationDate = dateMatch ? dateMatch[1].replace(/_/g, ':') : ''

  const csvText = fs.readFileSync(path.join(dirPath, csvFile), 'utf-8')
  const rows = parseCSV(csvText)

  const qubits = []
  const edgeSet = new Map() // "min-max" → {q1, q2, czError}
  // Track all physical connections (from Gate length column — most complete)
  const connectionSet = new Set()

  for (const row of rows) {
    const id = parseInt(row['Qubit'])
    const t1 = parseFloat(row['T1 (us)']) || 0
    const t2 = parseFloat(row['T2 (us)']) || 0
    const readoutError = parseFloat(row['Readout assignment error']) || 0
    const idError = parseFloat(row['ID error']) || 0
    const operational = row['Operational'] === 'Yes'

    qubits.push({ id, t1, t2, readoutError, idError, operational })

    // Parse CZ connections for error data
    const czConnections = parseCZError(row['CZ error'])
    for (const conn of czConnections) {
      const key = `${Math.min(id, conn.target)}-${Math.max(id, conn.target)}`
      if (!edgeSet.has(key)) {
        edgeSet.set(key, { q1: Math.min(id, conn.target), q2: Math.max(id, conn.target), czError: conn.error })
      }
      connectionSet.add(key)
    }

    // Parse RZZ connections (some qubits have RZZ but no CZ)
    const rzzConnections = parseCZError(row['RZZ error'] || '')
    for (const conn of rzzConnections) {
      const key = `${Math.min(id, conn.target)}-${Math.max(id, conn.target)}`
      connectionSet.add(key)
      if (!edgeSet.has(key)) {
        edgeSet.set(key, { q1: Math.min(id, conn.target), q2: Math.max(id, conn.target), czError: conn.error })
      }
    }

    // Parse Gate length column for complete connectivity (most reliable)
    const gateLenStr = row['Gate length (ns)'] || ''
    if (gateLenStr) {
      const parts = gateLenStr.split(';')
      for (const part of parts) {
        const [target] = part.split(':')
        const targetId = parseInt(target)
        if (!isNaN(targetId)) {
          const key = `${Math.min(id, targetId)}-${Math.max(id, targetId)}`
          connectionSet.add(key)
          if (!edgeSet.has(key)) {
            // Use a default error if no CZ/RZZ error available
            edgeSet.set(key, { q1: Math.min(id, targetId), q2: Math.max(id, targetId), czError: 0 })
          }
        }
      }
    }
  }

  const edges = Array.from(edgeSet.values()).sort((a, b) => a.q1 - b.q1 || a.q2 - b.q2)

  return {
    backendName,
    numQubits: qubits.length,
    calibrationDate,
    qubits,
    edges,
    connectionSet, // pass through for layout
  }
}

/**
 * Compute positions using chain-detection for IBM heavy-hex topologies.
 * IBM numbers qubits sequentially: chain0, bridges0, chain1, bridges1, ...
 * Chains are horizontal rows, bridges are vertical connectors between rows.
 */
function computeLayout(numQubits, edges, connectionSet) {
  // Build adjacency from connectionSet (most complete connectivity)
  const adj = Array.from({ length: numQubits }, () => new Set())
  if (connectionSet && connectionSet.size > 0) {
    for (const key of connectionSet) {
      const [a, b] = key.split('-').map(Number)
      adj[a].add(b)
      adj[b].add(a)
    }
  } else {
    for (const e of edges) {
      adj[e.q1].add(e.q2)
      adj[e.q2].add(e.q1)
    }
  }

  const chains = []       // Array of arrays: each is a chain of qubit IDs
  const bridgeSets = []   // Array of arrays: each is a set of bridge qubit IDs
  let cursor = 0

  while (cursor < numQubits) {
    // Trace a chain: follow sequential neighbors (cursor, cursor+1, cursor+2, ...)
    const chain = [cursor]
    let pos = cursor
    while (pos + 1 < numQubits && adj[pos].has(pos + 1)) {
      pos++
      chain.push(pos)
    }
    chains.push(chain)
    cursor = pos + 1

    // Collect bridge qubits: IDs after chain that DON'T connect to next sequential ID
    const bridges = []
    while (cursor < numQubits) {
      if (cursor + 1 < numQubits && adj[cursor].has(cursor + 1)) {
        // This qubit connects to the next one → start of new chain
        break
      }
      bridges.push(cursor)
      cursor++
    }
    if (bridges.length > 0) {
      bridgeSets.push(bridges)
    }
  }

  console.log(`    Detected ${chains.length} chains (lengths: ${chains.map(c => c.length).join(', ')})`)
  console.log(`    Detected ${bridgeSets.length} bridge sets (sizes: ${bridgeSets.map(b => b.length).join(', ')})`)

  // Assign positions
  const positions = new Array(numQubits)
  const maxChainLen = Math.max(...chains.map(c => c.length))
  const totalRows = chains.length
  // Each chain row + bridge row between them
  const totalVerticalSlots = totalRows * 2 - 1

  // Layout chains horizontally
  for (let r = 0; r < chains.length; r++) {
    const chain = chains[r]
    const y = (r * 2) / totalVerticalSlots
    for (let c = 0; c < chain.length; c++) {
      const x = chain.length > 1 ? c / (maxChainLen - 1) : 0.5
      positions[chain[c]] = { x, y }
    }
  }

  // Layout bridges: find which chain qubits they connect to and position midway
  for (let b = 0; b < bridgeSets.length; b++) {
    const bridges = bridgeSets[b]
    const bridgeY = (b * 2 + 1) / totalVerticalSlots
    for (const bridgeId of bridges) {
      const neighbors = [...adj[bridgeId]]
      // Find positions of connected chain qubits
      const neighborPositions = neighbors.map(n => positions[n]).filter(Boolean)
      if (neighborPositions.length >= 2) {
        positions[bridgeId] = {
          x: neighborPositions.reduce((s, p) => s + p.x, 0) / neighborPositions.length,
          y: bridgeY,
        }
      } else if (neighborPositions.length === 1) {
        positions[bridgeId] = {
          x: neighborPositions[0].x,
          y: bridgeY,
        }
      } else {
        positions[bridgeId] = { x: 0.5, y: bridgeY }
      }
    }
  }

  // Handle any unpositioned qubits (shouldn't happen for IBM backends)
  for (let i = 0; i < numQubits; i++) {
    if (!positions[i]) {
      positions[i] = { x: 0.5, y: 0.5 }
      console.warn(`    Warning: qubit ${i} had no position assigned`)
    }
  }

  // Round to 3 decimal places
  return positions.map(p => ({
    x: Math.round(p.x * 1000) / 1000,
    y: Math.round(p.y * 1000) / 1000,
  }))
}

// Main
const allData = {}
for (const backend of BACKENDS) {
  console.log(`Parsing ${backend.name}...`)
  const data = parseBackend(backend.dir, backend.name)
  console.log(`  ${data.numQubits} qubits, ${data.edges.length} edges`)

  console.log(`  Computing layout...`)
  data.positions = computeLayout(data.numQubits, data.edges, data.connectionSet)

  allData[backend.name] = data
}

// Generate TypeScript
let ts = `// Auto-generated from hardware calibration CSVs.
// Run: node scripts/generateHardwareData.mjs

export interface QubitCalibration {
  id: number
  t1: number
  t2: number
  readoutError: number
  idError: number
  operational: boolean
  x: number
  y: number
}

export interface CZEdge {
  q1: number
  q2: number
  czError: number
}

export interface HardwareCalibrationData {
  backendName: string
  numQubits: number
  calibrationDate: string
  qubits: QubitCalibration[]
  edges: CZEdge[]
}

`

for (const [name, data] of Object.entries(allData)) {
  const constName = name.replace(/^ibm_/, '').toUpperCase() + '_DATA'

  // Merge positions into qubits
  const qubitsWithPos = data.qubits.map((q, i) => ({
    ...q,
    x: data.positions[i].x,
    y: data.positions[i].y,
  }))

  ts += `export const ${constName}: HardwareCalibrationData = ${JSON.stringify({
    backendName: data.backendName,
    numQubits: data.numQubits,
    calibrationDate: data.calibrationDate,
    qubits: qubitsWithPos,
    edges: data.edges,
  })}\n\n`
}

ts += `export const HARDWARE_CALIBRATIONS: Record<string, HardwareCalibrationData> = {
${BACKENDS.map(b => `  '${b.name}': ${b.name.replace(/^ibm_/, '').toUpperCase()}_DATA,`).join('\n')}
}

export function getCalibrationData(backendName: string): HardwareCalibrationData | undefined {
  return HARDWARE_CALIBRATIONS[backendName]
}
`

fs.writeFileSync(OUTPUT, ts, 'utf-8')
console.log(`\nGenerated ${OUTPUT}`)
console.log(`Total size: ${(ts.length / 1024).toFixed(1)} KB`)
