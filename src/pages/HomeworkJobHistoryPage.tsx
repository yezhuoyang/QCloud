import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import CodeEditor from '../components/CodeEditor'
import { homeworkApi, type HomeworkSubmissionResult, type FakeHardwareSubmissionDetail } from '../utils/api'

function downloadMeasurements(
  measurements: Record<string, number>,
  meta: { backend: string; id: string; date: string; shots: number }
) {
  const lines = [
    `# Measurements from ${meta.backend} job ${meta.id}`,
    `# Date: ${meta.date}`,
    `# Shots: ${meta.shots}`,
    `# bitstring\tcount`,
  ]
  const sorted = Object.entries(measurements).sort((a, b) => b[1] - a[1])
  for (const [bitstring, count] of sorted) {
    lines.push(`${bitstring}\t${count}`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `measurements_${meta.backend}_${meta.id.slice(0, 8)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    running: 'bg-blue-100 text-blue-700',
    queued: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function EvalBadge({ method }: { method?: string }) {
  if (!method || method === 'legacy') return null
  const color = method === 'inverse_bell' ? 'bg-teal-50 text-teal-700' :
    method === 'tomography' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-500'
  const label = method === 'inverse_bell' ? 'InvBell' : method === 'tomography' ? 'Tomo' : method
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>{label}</span>
}

function HomeworkJobHistoryPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [hwJobs, setHwJobs] = useState<HomeworkSubmissionResult[]>([])
  const [fakeJobs, setFakeJobs] = useState<FakeHardwareSubmissionDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('No token provided')
      setIsLoading(false)
      return
    }
    async function fetchAll() {
      try {
        const [hwData, fakeData] = await Promise.all([
          homeworkApi.getSubmissions(token),
          homeworkApi.getFakeHardwareSubmissions(token),
        ])
        setHwJobs(hwData.submissions)
        setFakeJobs(fakeData.submissions)
      } catch (err: any) {
        setError(err.message || 'Failed to load job history')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [token])

  const handleLoadCircuit = (code: string) => {
    if (!homeworkId) return
    localStorage.setItem(`hw_load_code_${homeworkId}`, code)
    navigate(`/homework/${homeworkId}?token=${encodeURIComponent(token)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/"><Logo size="small" /></Link>
          <div>
            <h1 className="text-lg font-bold text-qcloud-text">Job History</h1>
            <p className="text-sm text-qcloud-muted">All your hardware and fake hardware submissions</p>
          </div>
        </div>
        <Link
          to={`/homework/${homeworkId}`}
          className="px-4 py-2 text-sm bg-qcloud-primary/10 text-qcloud-primary rounded-lg hover:bg-qcloud-primary/20 transition-colors"
        >
          Back to Homework
        </Link>
      </header>

      <div className="max-w-[1400px] mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : (
          <div className="space-y-8">
            {/* Hardware Jobs */}
            <section>
              <h2 className="text-base font-bold text-green-700 mb-3">
                Hardware Jobs ({hwJobs.length})
              </h2>
              {hwJobs.length === 0 ? (
                <div className="bg-white rounded-xl border border-qcloud-border p-8 text-center text-qcloud-muted">
                  No hardware submissions yet
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-qcloud-border text-left text-xs text-qcloud-muted">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Backend</th>
                        <th className="px-3 py-2">Eval</th>
                        <th className="px-3 py-2 text-right">Fidelity</th>
                        <th className="px-3 py-2 text-right">Succ. Prob.</th>
                        <th className="px-3 py-2 text-right">Circuit</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hwJobs.map((job) => (<React.Fragment key={job.id}>
                        <tr className="border-b border-qcloud-border hover:bg-qcloud-bg/30 transition-colors">
                          <td className="px-3 py-2 text-xs text-qcloud-muted">
                            {new Date(job.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                              {job.backend_name}
                            </span>
                          </td>
                          <td className="px-3 py-2"><EvalBadge method={job.eval_method} /></td>
                          <td className="px-3 py-2 text-right">
                            {job.fidelity_after != null ? (
                              <span className="font-semibold text-sm text-qcloud-primary">
                                {(job.fidelity_after * 100).toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-amber-600">
                            {job.success_probability != null
                              ? `${(job.success_probability * 100).toFixed(1)}%`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-[10px] text-qcloud-muted">
                            {job.qubit_count != null && <span>Q:{job.qubit_count} </span>}
                            {job.gate_count != null && <span>G:{job.gate_count} </span>}
                            {job.circuit_depth != null && <span>D:{job.circuit_depth}</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {job.code && (
                                <>
                                  <button
                                    onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                                    className={`text-[10px] px-2 py-1 rounded transition-colors ${expandedId === job.id ? 'bg-purple-200 text-purple-800' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
                                    title="View submitted code"
                                  >
                                    Code
                                  </button>
                                  <button
                                    onClick={() => handleLoadCircuit(job.code!)}
                                    className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                    title="Load this circuit into the editor"
                                  >
                                    Load
                                  </button>
                                </>
                              )}
                              {job.measurements_after && Object.keys(job.measurements_after).length > 0 && (
                                <button
                                  onClick={() => downloadMeasurements(job.measurements_after!, {
                                    backend: job.backend_name,
                                    id: job.id,
                                    date: new Date(job.created_at).toISOString(),
                                    shots: job.shots,
                                  })}
                                  className="text-[10px] px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                                  title="Download measurement results as .txt"
                                >
                                  Download
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedId === job.id && job.code && (
                          <tr>
                            <td colSpan={8} className="px-3 py-3 bg-gray-50">
                              <div className="h-48 border rounded overflow-hidden">
                                <CodeEditor value={job.code} onChange={() => {}} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Fake Hardware Jobs */}
            <section>
              <h2 className="text-base font-bold text-orange-600 mb-3">
                Fake Hardware Jobs ({fakeJobs.length})
              </h2>
              {fakeJobs.length === 0 ? (
                <div className="bg-white rounded-xl border border-qcloud-border p-8 text-center text-qcloud-muted">
                  No fake hardware submissions yet
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-orange-50 border-b border-qcloud-border text-left text-xs text-qcloud-muted">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Eval</th>
                        <th className="px-3 py-2 text-right">Fidelity</th>
                        <th className="px-3 py-2 text-right">Succ. Prob.</th>
                        <th className="px-3 py-2 text-right">Circuit</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fakeJobs.map((job) => (<React.Fragment key={job.id}>
                        <tr className="border-b border-qcloud-border hover:bg-orange-50/30 transition-colors">
                          <td className="px-3 py-2 text-xs text-qcloud-muted">
                            {new Date(job.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
                          <td className="px-3 py-2"><EvalBadge method={job.eval_method} /></td>
                          <td className="px-3 py-2 text-right">
                            {job.fidelity_after != null ? (
                              <span className="font-semibold text-sm text-orange-600">
                                {(job.fidelity_after * 100).toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-amber-600">
                            {job.success_probability != null
                              ? `${(job.success_probability * 100).toFixed(1)}%`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-[10px] text-qcloud-muted">
                            {job.qubit_count != null && <span>Q:{job.qubit_count} </span>}
                            {job.gate_count != null && <span>G:{job.gate_count} </span>}
                            {job.circuit_depth != null && <span>D:{job.circuit_depth}</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                                className={`text-[10px] px-2 py-1 rounded transition-colors ${expandedId === job.id ? 'bg-purple-200 text-purple-800' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
                                title="View submitted code"
                              >
                                Code
                              </button>
                              <button
                                onClick={() => handleLoadCircuit(job.code)}
                                className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                title="Load this circuit into the editor"
                              >
                                Load
                              </button>
                              {job.measurements && Object.keys(job.measurements).length > 0 && (
                                <button
                                  onClick={() => downloadMeasurements(job.measurements!, {
                                    backend: 'fake_4x4',
                                    id: job.id,
                                    date: new Date(job.created_at).toISOString(),
                                    shots: job.shots,
                                  })}
                                  className="text-[10px] px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                                  title="Download measurement results as .txt"
                                >
                                  Download
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedId === job.id && (
                          <tr>
                            <td colSpan={7} className="px-3 py-3 bg-orange-50/50">
                              <div className="space-y-2">
                                {job.initial_layout && (
                                  <div className="text-xs text-qcloud-muted">
                                    <span className="font-medium">INITIAL_LAYOUT:</span> [{job.initial_layout.join(', ')}]
                                  </div>
                                )}
                                <div className="h-48 border rounded overflow-hidden">
                                  <CodeEditor value={job.code} onChange={() => {}} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomeworkJobHistoryPage
