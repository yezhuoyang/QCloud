import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import AuthHeader from '../components/AuthHeader'
import CodeEditor from '../components/CodeEditor'
import {
  homeworkApi,
  type HomeworkListItem,
  type HomeworkTokenAdmin,
  type HomeworkBudgetSummary,
  type HomeworkTokenGenResult,
} from '../utils/api'

function AdminHomeworkPage() {
  // Homework list
  const [homeworks, setHomeworks] = useState<HomeworkListItem[]>([])
  const [selectedHomework, setSelectedHomework] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createTitle, setCreateTitle] = useState('CS 238B State Distillation')
  const [createDescription, setCreateDescription] = useState('')
  const [createApiKey, setCreateApiKey] = useState('')
  const [createBackends, setCreateBackends] = useState('ibm_torino, ibm_fez, ibm_marrakesh, ibm_brisbane, ibm_kyoto, ibm_osaka')
  const [createBudget, setCreateBudget] = useState(21600)
  const [createStudents, setCreateStudents] = useState(30)
  const [createConcurrency, setCreateConcurrency] = useState(3)
  const [createChannel, setCreateChannel] = useState('ibm_cloud')
  const [createInstance, setCreateInstance] = useState('')
  const [createReferenceCircuit, setCreateReferenceCircuit] = useState(`# Reference Bell Pair Circuit (baseline)
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])
`)
  const [createJudgeCode, setCreateJudgeCode] = useState(`# Custom Judging Code
# Inputs: counts_before, total_before, counts_after, total_after
# Must set: fidelity_before (float), fidelity_after (float), score (int 0-100)

# Compute Bell fidelity: P(|00>) + P(|11>)
bell_before = (counts_before.get("00", 0) + counts_before.get("11", 0)) / total_before
bell_after = (counts_after.get("00", 0) + counts_after.get("11", 0)) / total_after

fidelity_before = bell_before
fidelity_after = bell_after

# Score: 70pts from fidelity, 30pts from improvement
fidelity_score = max(0, (fidelity_after - 0.5) / 0.5) * 70
improvement = max(0, fidelity_after - fidelity_before)
improvement_score = min(1.0, improvement / 0.3) * 30
score = min(100, int(fidelity_score + improvement_score))
`)
  const [isCreating, setIsCreating] = useState(false)

  // Token generation
  const [studentUids, setStudentUids] = useState('')
  const [generatedTokens, setGeneratedTokens] = useState<HomeworkTokenGenResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Budget view
  const [budgetSummary, setBudgetSummary] = useState<HomeworkBudgetSummary | null>(null)
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false)

  useEffect(() => {
    fetchHomeworks()
  }, [])

  useEffect(() => {
    if (selectedHomework) {
      fetchBudgets(selectedHomework)
    }
  }, [selectedHomework])

  const fetchHomeworks = async () => {
    try {
      const data = await homeworkApi.listHomeworks()
      setHomeworks(data)
      if (data.length > 0) {
        setSelectedHomework(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load homeworks:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBudgets = async (hwId: string) => {
    setIsLoadingBudgets(true)
    try {
      const data = await homeworkApi.getBudgets(hwId)
      setBudgetSummary(data)
    } catch (err) {
      console.error('Failed to load budgets:', err)
    } finally {
      setIsLoadingBudgets(false)
    }
  }

  const handleCreate = async () => {
    if (!createApiKey.trim() || !createTitle.trim()) return
    setIsCreating(true)
    try {
      const backends = createBackends.split(',').map(b => b.trim()).filter(Boolean)
      const result = await homeworkApi.create({
        title: createTitle,
        description: createDescription,
        ibmq_api_key: createApiKey,
        ibmq_channel: createChannel,
        ibmq_instance: createInstance || undefined,
        allowed_backends: backends,
        total_budget_seconds: createBudget,
        num_students: createStudents,
        max_concurrent_jobs: createConcurrency,
        reference_circuit: createReferenceCircuit || undefined,
        judge_code: createJudgeCode || undefined,
      })
      setShowCreateForm(false)
      fetchHomeworks()
      setSelectedHomework(result.id)
    } catch (err: any) {
      alert(err.detail || 'Failed to create homework')
    } finally {
      setIsCreating(false)
    }
  }

  const handleGenerateTokens = async () => {
    if (!selectedHomework || !studentUids.trim()) return
    setIsGenerating(true)
    try {
      const uids = studentUids.split('\n').map(u => u.trim()).filter(Boolean)
      const result = await homeworkApi.generateTokens(selectedHomework, uids)
      setGeneratedTokens(result)
    } catch (err: any) {
      alert(err.detail || 'Failed to generate tokens')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadTokensCSV = () => {
    if (!generatedTokens) return
    const csv = 'student_uid,token\n' + generatedTokens.tokens.map(t => `${t.student_uid},${t.token}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'homework_tokens.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="small" />
          </Link>
          <h1 className="text-lg font-bold text-qcloud-text">Homework Admin</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="px-3 py-1 text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Admin Panel
          </Link>
          <AuthHeader />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-qcloud-text">Manage Homeworks</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors"
          >
            {showCreateForm ? 'Cancel' : '+ New Homework'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl border border-qcloud-border p-6 mb-6">
            <h3 className="font-semibold text-qcloud-text mb-4">Create New Homework</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Title</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">IBM Channel</label>
                <select
                  value={createChannel}
                  onChange={e => setCreateChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                >
                  <option value="ibm_cloud">ibm_cloud</option>
                  <option value="ibm_quantum">ibm_quantum</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-qcloud-muted block mb-1">IBM API Key (will be encrypted)</label>
                <input
                  type="password"
                  value={createApiKey}
                  onChange={e => setCreateApiKey(e.target.value)}
                  placeholder="Paste your IBM Quantum API key..."
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">IBM Instance (optional)</label>
                <input
                  type="text"
                  value={createInstance}
                  onChange={e => setCreateInstance(e.target.value)}
                  placeholder="e.g., ibm-q/open/main"
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Allowed Backends (comma-separated)</label>
                <input
                  type="text"
                  value={createBackends}
                  onChange={e => setCreateBackends(e.target.value)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Total Budget (seconds)</label>
                <input
                  type="number"
                  value={createBudget}
                  onChange={e => setCreateBudget(parseInt(e.target.value) || 21600)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Number of Students</label>
                <input
                  type="number"
                  value={createStudents}
                  onChange={e => setCreateStudents(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Max Concurrent Jobs</label>
                <input
                  type="number"
                  value={createConcurrency}
                  onChange={e => setCreateConcurrency(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-qcloud-muted block mb-1">Description (markdown, optional)</label>
                <textarea
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                  placeholder="Homework description..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-qcloud-muted block mb-1">
                  Reference Circuit (baseline, run alongside student's circuit)
                </label>
                <div className="h-48 border border-qcloud-border rounded-lg overflow-hidden">
                  <CodeEditor
                    value={createReferenceCircuit}
                    onChange={(v) => setCreateReferenceCircuit(v || '')}
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-qcloud-muted block mb-1">
                  Custom Judging Code (computes fidelity/score from measurements)
                </label>
                <div className="h-64 border border-qcloud-border rounded-lg overflow-hidden">
                  <CodeEditor
                    value={createJudgeCode}
                    onChange={(v) => setCreateJudgeCode(v || '')}
                  />
                </div>
                <p className="text-xs text-qcloud-muted mt-1">
                  Inputs: counts_before, total_before, counts_after, total_after.
                  Must set: fidelity_before, fidelity_after, score (0-100).
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCreate}
                disabled={isCreating || !createApiKey.trim() || !createTitle.trim()}
                className="px-6 py-2 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Homework'}
              </button>
            </div>
          </div>
        )}

        {/* Homework Selector */}
        {homeworks.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {homeworks.map(hw => (
              <button
                key={hw.id}
                onClick={() => setSelectedHomework(hw.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedHomework === hw.id
                    ? 'bg-qcloud-primary text-white'
                    : 'bg-white border border-qcloud-border text-qcloud-text hover:bg-qcloud-bg'
                }`}
              >
                {hw.title}
                {!hw.is_active && <span className="ml-2 text-xs opacity-60">(inactive)</span>}
              </button>
            ))}
          </div>
        )}

        {selectedHomework && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Token Generation */}
            <div className="bg-white rounded-xl border border-qcloud-border p-6">
              <h3 className="font-semibold text-qcloud-text mb-4">Generate Tokens</h3>
              <p className="text-sm text-qcloud-muted mb-3">
                Enter student UIDs (one per line). Tokens will be generated and can be downloaded as CSV.
              </p>
              <textarea
                value={studentUids}
                onChange={e => setStudentUids(e.target.value)}
                rows={8}
                placeholder="123456789&#10;987654321&#10;..."
                className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm font-mono mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateTokens}
                  disabled={isGenerating || !studentUids.trim()}
                  className="px-4 py-2 bg-qcloud-primary text-white rounded-lg text-sm hover:bg-qcloud-secondary transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Tokens'}
                </button>
                {generatedTokens && (
                  <button
                    onClick={downloadTokensCSV}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                  >
                    Download CSV ({generatedTokens.count} tokens)
                  </button>
                )}
              </div>

              {generatedTokens && (
                <div className="mt-4 max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-qcloud-muted">
                        <th className="pb-1">UID</th>
                        <th className="pb-1">Token</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedTokens.tokens.map(t => (
                        <tr key={t.student_uid} className="border-t border-qcloud-border">
                          <td className="py-1 font-mono">{t.student_uid}</td>
                          <td className="py-1 font-mono truncate max-w-[200px]">{t.token}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Budget Summary */}
            <div className="bg-white rounded-xl border border-qcloud-border p-6">
              <h3 className="font-semibold text-qcloud-text mb-4">Budget Summary</h3>
              {isLoadingBudgets ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-3 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : budgetSummary ? (
                <div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-qcloud-primary">
                        {Math.round(budgetSummary.total_used_seconds)}s
                      </div>
                      <div className="text-xs text-qcloud-muted">Used</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-600">
                        {Math.round(budgetSummary.total_remaining_seconds)}s
                      </div>
                      <div className="text-xs text-qcloud-muted">Remaining</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold">{budgetSummary.num_students}</div>
                      <div className="text-xs text-qcloud-muted">Students</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold">{budgetSummary.num_active_tokens}</div>
                      <div className="text-xs text-qcloud-muted">Active Tokens</div>
                    </div>
                  </div>

                  {/* Overall budget bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-qcloud-primary h-3 rounded-full"
                        style={{
                          width: `${(budgetSummary.total_used_seconds / budgetSummary.total_budget_seconds) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-qcloud-muted mt-1">
                      {((budgetSummary.total_used_seconds / budgetSummary.total_budget_seconds) * 100).toFixed(1)}% of total budget used
                    </p>
                  </div>

                  {/* Per-student table */}
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-qcloud-muted">
                          <th className="pb-1">Student</th>
                          <th className="pb-1 text-right">Used</th>
                          <th className="pb-1 text-right">Limit</th>
                          <th className="pb-1 text-right">Subs</th>
                          <th className="pb-1 text-right">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetSummary.students.map(s => (
                          <tr key={s.id} className="border-t border-qcloud-border">
                            <td className="py-1 font-mono">{s.student_uid_hash.slice(0, 8)}</td>
                            <td className="py-1 text-right">{Math.round(s.budget_used_seconds)}s</td>
                            <td className="py-1 text-right">{s.budget_limit_seconds}s</td>
                            <td className="py-1 text-right">{s.submission_count}</td>
                            <td className="py-1 text-right">
                              <span className={s.is_active ? 'text-green-600' : 'text-red-500'}>
                                {s.is_active ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-qcloud-muted">No data available.</p>
              )}
            </div>

            {/* Homework Link */}
            <div className="bg-white rounded-xl border border-qcloud-border p-6 lg:col-span-2">
              <h3 className="font-semibold text-qcloud-text mb-2">Student Links</h3>
              <p className="text-sm text-qcloud-muted mb-3">
                Share this URL with students. They will need their token to access it.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm break-all">
                {window.location.origin}/homework/{selectedHomework}
              </div>
              <div className="mt-3 flex gap-3">
                <Link
                  to={`/homework/${selectedHomework}`}
                  className="text-sm text-qcloud-primary hover:text-qcloud-secondary"
                >
                  Open Student View
                </Link>
                <Link
                  to={`/homework/${selectedHomework}/leaderboard`}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && homeworks.length === 0 && !showCreateForm && (
          <div className="text-center py-20 text-qcloud-muted">
            <p className="text-lg mb-2">No homeworks created yet.</p>
            <p className="text-sm">Click "New Homework" to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminHomeworkPage
