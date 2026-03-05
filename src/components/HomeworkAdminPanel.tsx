import { useState, useEffect, useCallback } from 'react'
import CodeEditor from './CodeEditor'
import {
  homeworkApi,
  type HomeworkBudgetSummary,
  type HomeworkTokenGenResult,
  type AdminSubmission,
  type AdminSubmissionList,
} from '../utils/api'

type AdminTab = 'submissions' | 'students' | 'submit' | 'settings'

const KNOWN_BACKENDS = [
  { name: 'ibm_torino', qubits: 133 },
  { name: 'ibm_fez', qubits: 156 },
  { name: 'ibm_kingston', qubits: 156 },
  { name: 'ibm_marrakesh', qubits: 156 },
  { name: 'ibm_boston', qubits: 156 },
  { name: 'ibm_pittsburgh', qubits: 156 },
  { name: 'ibm_miami', qubits: 120 },
]

interface Props {
  homeworkId: string
}

export default function HomeworkAdminPanel({ homeworkId }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('submissions')

  // Budget / students
  const [budgetSummary, setBudgetSummary] = useState<HomeworkBudgetSummary | null>(null)
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false)
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null)
  const [editBudgetValue, setEditBudgetValue] = useState(0)

  // Submissions
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([])
  const [submissionsTotal, setSubmissionsTotal] = useState(0)
  const [submissionsPage, setSubmissionsPage] = useState(1)
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Admin submit
  const [adminCode, setAdminCode] = useState(`qc = QuantumCircuit(4, 4)
qc.h(0)
qc.cx(0, 1)
qc.h(2)
qc.cx(2, 3)
qc.cx(0, 2)
qc.cx(1, 3)
qc.measure([0, 1, 2, 3], [0, 1, 2, 3])
POST_SELECT = {"00"}
`)
  const [adminBackend, setAdminBackend] = useState('ibm_torino')
  const [adminShots, setAdminShots] = useState(1024)
  const [adminEvalMethod, setAdminEvalMethod] = useState('inverse_bell')
  const [adminLabel, setAdminLabel] = useState('')
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false)
  const [adminSubmitMsg, setAdminSubmitMsg] = useState<string | null>(null)

  // Add student (token generation)
  const [newStudentUid, setNewStudentUid] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentBulk, setNewStudentBulk] = useState(false)
  const [generatedTokens, setGeneratedTokens] = useState<HomeworkTokenGenResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Settings (API key)
  const [apiKey, setApiKey] = useState('')
  const [isSavingApiKey, setIsSavingApiKey] = useState(false)
  const [apiKeyMsg, setApiKeyMsg] = useState<string | null>(null)

  // -- Data fetchers --

  const fetchBudgets = useCallback(async () => {
    setIsLoadingBudgets(true)
    try {
      setBudgetSummary(await homeworkApi.getBudgets(homeworkId))
    } catch (err) {
      console.error('Failed to load budgets:', err)
    } finally {
      setIsLoadingBudgets(false)
    }
  }, [homeworkId])

  const fetchSubmissions = useCallback(async (page = 1, status?: string) => {
    setSubmissionsLoading(true)
    try {
      const data: AdminSubmissionList = await homeworkApi.getAdminSubmissions(homeworkId, {
        page,
        page_size: 25,
        status: status || undefined,
      })
      setSubmissions(data.submissions)
      setSubmissionsTotal(data.total)
      setSubmissionsPage(data.page)
    } catch (err) {
      console.error('Failed to load submissions:', err)
    } finally {
      setSubmissionsLoading(false)
    }
  }, [homeworkId])

  useEffect(() => {
    if (activeTab === 'submissions') fetchSubmissions(1, statusFilter || undefined)
    else if (activeTab === 'students') fetchBudgets()
  }, [activeTab, fetchSubmissions, fetchBudgets, statusFilter])

  // -- Handlers --

  const handleBudgetSave = async (tokenId: string) => {
    try {
      await homeworkApi.updateToken(tokenId, { budget_limit_seconds: editBudgetValue })
      setEditingTokenId(null)
      fetchBudgets()
    } catch (err: any) {
      alert(err.detail || 'Failed to update budget')
    }
  }

  const handleToggleActive = async (tokenId: string, currentActive: boolean) => {
    try {
      await homeworkApi.updateToken(tokenId, { is_active: !currentActive })
      fetchBudgets()
    } catch (err: any) {
      alert(err.detail || 'Failed to toggle token')
    }
  }

  const handleDeleteSubmission = async (id: string) => {
    try {
      await homeworkApi.deleteSubmission(id)
      setDeletingId(null)
      fetchSubmissions(submissionsPage, statusFilter || undefined)
    } catch (err: any) {
      alert(err.detail || 'Failed to delete submission')
    }
  }

  const handleAdminSubmit = async () => {
    if (!adminCode.trim()) return
    setIsAdminSubmitting(true)
    setAdminSubmitMsg(null)
    try {
      const result = await homeworkApi.adminSubmit(homeworkId, {
        code: adminCode,
        backend_name: adminBackend,
        shots: adminShots,
        eval_method: adminEvalMethod,
        label: adminLabel || undefined,
      })
      setAdminSubmitMsg(`Submitted! ID: ${result.id}, Status: ${result.status}${result.queue_position ? `, Queue #${result.queue_position}` : ''}`)
    } catch (err: any) {
      setAdminSubmitMsg(`Error: ${err.detail || err.message || 'Failed to submit'}`)
    } finally {
      setIsAdminSubmitting(false)
    }
  }

  const handleAddStudents = async () => {
    const text = newStudentUid.trim()
    if (!text) return
    setIsGenerating(true)
    try {
      let students: Array<{ uid: string; display_name?: string }>
      if (newStudentBulk) {
        // Bulk: each line is "uid" or "uid, name"
        students = text.split('\n').map(line => {
          const parts = line.split(',').map(s => s.trim())
          return { uid: parts[0], display_name: parts[1] || undefined }
        }).filter(s => s.uid)
      } else {
        students = [{ uid: text, display_name: newStudentName.trim() || undefined }]
      }
      const result = await homeworkApi.generateTokens(homeworkId, students)
      setGeneratedTokens(result)
      setNewStudentUid('')
      setNewStudentName('')
      fetchBudgets() // Refresh student list
    } catch (err: any) {
      alert(err.detail || 'Failed to add students')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!apiKey.trim()) {
      setApiKeyMsg('No changes to save')
      return
    }
    setIsSavingApiKey(true)
    setApiKeyMsg(null)
    try {
      await homeworkApi.updateHomework(homeworkId, { ibmq_api_key: apiKey.trim() })
      setApiKeyMsg('API key updated successfully')
      setApiKey('')
    } catch (err: any) {
      setApiKeyMsg(`Error: ${err.detail || err.message || 'Failed to save settings'}`)
    } finally {
      setIsSavingApiKey(false)
    }
  }

  const downloadTokensCSV = () => {
    if (!generatedTokens) return
    const csv = 'student_uid,display_name,token\n' + generatedTokens.tokens.map(t =>
      `${t.student_uid},${t.display_name || ''},${t.token}`
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'homework_tokens.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // -- Helpers --

  const formatTime = (iso: string | null | undefined): string => {
    if (!iso) return '\u2014'
    const d = new Date(iso)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    return d.toLocaleDateString()
  }

  const statusBadge = (s: string) => {
    const cls = s === 'completed' ? 'bg-green-100 text-green-700'
      : s === 'running' ? 'bg-blue-100 text-blue-700'
      : s === 'queued' ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'
    return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>
  }

  const totalPages = Math.ceil(submissionsTotal / 25)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Admin Tab Navigation */}
      <div className="flex-shrink-0 border-b border-qcloud-border bg-white px-4">
        <div className="flex gap-1 -mb-px">
          {([
            ['submissions', 'Submissions'],
            ['students', 'Students'],
            ['submit', 'Submit Job'],
            ['settings', 'Settings'],
          ] as [AdminTab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-qcloud-primary text-qcloud-primary'
                  : 'border-transparent text-qcloud-muted hover:text-qcloud-text hover:border-gray-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
            <div className="px-4 py-3 border-b border-qcloud-border flex items-center gap-2">
              <span className="text-xs text-qcloud-muted mr-1">Filter:</span>
              {['', 'queued', 'running', 'completed', 'failed'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    statusFilter === s
                      ? 'bg-qcloud-primary text-white'
                      : 'bg-gray-100 text-qcloud-muted hover:bg-gray-200'
                  }`}>
                  {s || 'All'}
                </button>
              ))}
              <span className="ml-auto text-xs text-qcloud-muted">{submissionsTotal} total</span>
            </div>

            {submissionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-16 text-qcloud-muted">No submissions found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-qcloud-border text-left text-xs text-qcloud-muted">
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Backend</th>
                    <th className="px-3 py-2 text-right">Fidelity</th>
                    <th className="px-3 py-2 text-right">Succ. Prob</th>
                    <th className="px-3 py-2">Eval</th>
                    <th className="px-3 py-2 text-right">Submitted</th>
                    <th className="px-3 py-2 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => (
                    <tbody key={sub.id}>
                      <tr
                        className={`border-b border-qcloud-border hover:bg-qcloud-bg/30 cursor-pointer text-sm ${expandedSub === sub.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}>
                        <td className="px-3 py-2">
                          <div>
                            <span className="font-medium text-xs">{sub.display_name || sub.student_label}</span>
                            {sub.display_name && <span className="text-[10px] text-qcloud-muted ml-1 font-mono">{sub.student_label}</span>}
                          </div>
                          {sub.method_name && <div className="text-[10px] text-qcloud-muted">{sub.method_name}</div>}
                        </td>
                        <td className="px-3 py-2">{statusBadge(sub.status)}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{sub.backend_name}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {sub.fidelity_after != null ? (
                            <span className="font-semibold text-xs text-qcloud-primary">{(sub.fidelity_after * 100).toFixed(1)}%</span>
                          ) : '\u2014'}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-amber-600">
                          {sub.success_probability != null ? `${(sub.success_probability * 100).toFixed(1)}%` : '\u2014'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            sub.eval_method === 'inverse_bell' ? 'bg-teal-50 text-teal-700'
                              : sub.eval_method === 'tomography' ? 'bg-purple-50 text-purple-700'
                              : 'bg-gray-50 text-gray-500'
                          }`}>
                            {sub.eval_method === 'inverse_bell' ? 'InvBell' : sub.eval_method === 'tomography' ? 'Tomo' : sub.eval_method}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-qcloud-muted">{formatTime(sub.created_at)}</td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          {deletingId === sub.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDeleteSubmission(sub.id)}
                                className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded">Yes</button>
                              <button onClick={() => setDeletingId(null)}
                                className="text-[10px] px-2 py-0.5 bg-gray-200 rounded">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingId(sub.id)}
                              className="text-xs text-red-500 hover:text-red-700" title="Delete submission">
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedSub === sub.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                              <div><span className="text-qcloud-muted">Submission ID:</span> <span className="font-mono">{sub.id}</span></div>
                              <div><span className="text-qcloud-muted">Student UID Hash:</span> <span className="font-mono">{sub.student_uid_hash}</span></div>
                              <div><span className="text-qcloud-muted">Fidelity Before:</span> {sub.fidelity_before != null ? `${(sub.fidelity_before * 100).toFixed(2)}%` : '\u2014'}</div>
                              <div><span className="text-qcloud-muted">Fidelity After:</span> <span className="font-semibold">{sub.fidelity_after != null ? `${(sub.fidelity_after * 100).toFixed(2)}%` : '\u2014'}</span></div>
                              <div><span className="text-qcloud-muted">Shots:</span> {sub.shots}</div>
                              <div><span className="text-qcloud-muted">Post-selected shots:</span> {sub.post_selected_shots ?? '\u2014'}</div>
                              <div><span className="text-qcloud-muted">Circuit:</span> {sub.qubit_count ?? '?'}q, {sub.gate_count ?? '?'}g, depth {sub.circuit_depth ?? '?'}</div>
                              <div><span className="text-qcloud-muted">Exec time:</span> {sub.execution_time_seconds != null ? `${sub.execution_time_seconds.toFixed(1)}s` : '\u2014'}</div>
                              {sub.ibmq_job_id_before && <div><span className="text-qcloud-muted">IBM Job (ref):</span> <span className="font-mono text-[10px]">{sub.ibmq_job_id_before}</span></div>}
                              {sub.ibmq_job_id_after && <div><span className="text-qcloud-muted">IBM Job (student):</span> <span className="font-mono text-[10px]">{sub.ibmq_job_id_after}</span></div>}
                            </div>
                            {sub.error_message && (
                              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 mb-3">
                                <strong>Error:</strong> {sub.error_message}
                              </div>
                            )}
                            {sub.tomography_correlators && (
                              <div className="mb-3">
                                <span className="text-xs text-qcloud-muted">Tomography Correlators:</span>
                                <span className="ml-1 font-mono text-xs">{JSON.stringify(sub.tomography_correlators)}</span>
                              </div>
                            )}
                            {sub.measurements_after && (
                              <div className="mb-3">
                                <span className="text-xs text-qcloud-muted block mb-1">Measurements (student):</span>
                                <div className="bg-white border rounded p-2 font-mono text-[10px] max-h-24 overflow-y-auto">
                                  {Object.entries(sub.measurements_after).sort(([, a], [, b]) => b - a).map(([k, v]) => (
                                    <span key={k} className="inline-block mr-3">{k}: {v}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {sub.code_after && (
                              <div>
                                <span className="text-xs text-qcloud-muted block mb-1">Student Circuit Code:</span>
                                <div className="h-48 border rounded overflow-hidden">
                                  <CodeEditor value={sub.code_after} onChange={() => {}} />
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  ))}
                </tbody>
              </table>
            )}

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-qcloud-border flex items-center justify-between">
                <button
                  onClick={() => fetchSubmissions(submissionsPage - 1, statusFilter || undefined)}
                  disabled={submissionsPage <= 1}
                  className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-30 hover:bg-gray-200">
                  Previous
                </button>
                <span className="text-xs text-qcloud-muted">Page {submissionsPage} of {totalPages}</span>
                <button
                  onClick={() => fetchSubmissions(submissionsPage + 1, statusFilter || undefined)}
                  disabled={submissionsPage >= totalPages}
                  className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-30 hover:bg-gray-200">
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Unified Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Add Students Card */}
            <div className="bg-white rounded-xl border border-qcloud-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-qcloud-text">Add Students</h3>
                <button
                  onClick={() => setNewStudentBulk(!newStudentBulk)}
                  className="text-xs text-qcloud-muted hover:text-qcloud-primary transition-colors"
                >
                  {newStudentBulk ? 'Single entry' : 'Bulk entry'}
                </button>
              </div>

              {newStudentBulk ? (
                <div>
                  <p className="text-xs text-qcloud-muted mb-2">Enter students (one per line): <code className="bg-gray-100 px-1 rounded">uid, name</code></p>
                  <textarea
                    value={newStudentUid}
                    onChange={e => setNewStudentUid(e.target.value)}
                    rows={5}
                    placeholder={'alice123, Alice Smith\nbob456, Bob Jones\ncharlie789, Charlie Lee\n...'}
                    className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm font-mono mb-3"
                  />
                </div>
              ) : (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newStudentUid}
                    onChange={e => setNewStudentUid(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddStudents()}
                    placeholder="Student UID..."
                    className="flex-1 px-3 py-2 border border-qcloud-border rounded-lg text-sm font-mono"
                  />
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddStudents()}
                    placeholder="Student Name..."
                    className="flex-1 px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddStudents}
                  disabled={isGenerating || !newStudentUid.trim()}
                  className="px-4 py-2 bg-qcloud-primary text-white rounded-lg text-sm hover:bg-qcloud-secondary transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Adding...' : 'Add & Generate Token'}
                </button>
                {generatedTokens && (
                  <button onClick={downloadTokensCSV}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors">
                    Download CSV ({generatedTokens.count} tokens)
                  </button>
                )}
              </div>

              {/* Show newly generated tokens */}
              {generatedTokens && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-700 mb-2">
                    Generated {generatedTokens.count} token{generatedTokens.count !== 1 ? 's' : ''} (copy now - tokens are shown only once):
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-green-600">
                          <th className="pb-1 pr-4">UID</th>
                          <th className="pb-1 pr-4">Name</th>
                          <th className="pb-1">Token</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedTokens.tokens.map(t => (
                          <tr key={t.student_uid} className="border-t border-green-200">
                            <td className="py-1 pr-4 font-mono text-green-800">{t.student_uid}</td>
                            <td className="py-1 pr-4 text-green-800">{t.display_name || '\u2014'}</td>
                            <td className="py-1 font-mono text-green-700 break-all">{t.token}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Budget Summary + Student Table */}
            <div className="bg-white rounded-xl border border-qcloud-border p-5">
              <h3 className="font-semibold text-qcloud-text mb-4">All Students</h3>
              {isLoadingBudgets ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-3 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : budgetSummary ? (
                <div>
                  {/* Summary stats */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-qcloud-primary">{Math.round(budgetSummary.total_used_seconds)}s</div>
                      <div className="text-xs text-qcloud-muted">Used</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-600">{Math.round(budgetSummary.total_remaining_seconds)}s</div>
                      <div className="text-xs text-qcloud-muted">Remaining</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold">{budgetSummary.num_students}</div>
                      <div className="text-xs text-qcloud-muted">Students</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold">{budgetSummary.num_active_tokens}</div>
                      <div className="text-xs text-qcloud-muted">Active</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-qcloud-primary h-3 rounded-full"
                        style={{ width: `${Math.min(100, (budgetSummary.total_used_seconds / budgetSummary.total_budget_seconds) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-qcloud-muted mt-1">
                      {((budgetSummary.total_used_seconds / budgetSummary.total_budget_seconds) * 100).toFixed(1)}% of total budget used
                    </p>
                  </div>

                  {/* Student Link */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-qcloud-muted">Student URL: </span>
                    <span className="text-xs font-mono text-qcloud-primary">{window.location.origin}/homework/{homeworkId}</span>
                  </div>

                  {/* Student table */}
                  {budgetSummary.students.length === 0 ? (
                    <p className="text-sm text-qcloud-muted text-center py-8">No students added yet. Use the form above to add students.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-qcloud-muted bg-gray-50">
                          <th className="px-3 py-2">Student</th>
                          <th className="px-3 py-2">UID</th>
                          <th className="px-3 py-2">Token</th>
                          <th className="px-3 py-2 text-right">Used</th>
                          <th className="px-3 py-2 text-right">Budget Limit</th>
                          <th className="px-3 py-2 text-right">Submissions</th>
                          <th className="px-3 py-2 text-center">Active</th>
                          <th className="px-3 py-2 text-right">Last Used</th>
                          <th className="px-3 py-2">Usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetSummary.students.map(s => (
                          <tr key={s.id} className="border-t border-qcloud-border hover:bg-qcloud-bg/20">
                            <td className="px-3 py-2">
                              {s.display_name ? (
                                <div>
                                  <span className="font-medium">{s.display_name}</span>
                                  <span className="text-[10px] text-qcloud-muted ml-1 font-mono">{s.student_uid_hash.slice(0, 8)}</span>
                                </div>
                              ) : (
                                <span className="font-mono">{s.student_uid_hash.slice(0, 16)}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {s.student_uid_raw ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[10px]">{s.student_uid_raw}</span>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(s.student_uid_raw!); }}
                                    className="text-[10px] text-qcloud-primary hover:text-qcloud-secondary shrink-0"
                                    title="Copy UID"
                                  >
                                    Copy
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-qcloud-muted">--</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {s.token ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[10px] text-qcloud-muted truncate max-w-[120px]" title={s.token}>
                                    {s.token.slice(0, 8)}...
                                  </span>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(s.token!); }}
                                    className="text-[10px] text-qcloud-primary hover:text-qcloud-secondary shrink-0"
                                    title="Copy token"
                                  >
                                    Copy
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-qcloud-muted">--</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{Math.round(s.budget_used_seconds)}s</td>
                            <td className="px-3 py-2 text-right">
                              {editingTokenId === s.id ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input type="number" value={editBudgetValue}
                                    onChange={e => setEditBudgetValue(parseInt(e.target.value) || 0)}
                                    onKeyDown={e => e.key === 'Enter' && handleBudgetSave(s.id)}
                                    className="w-20 px-1.5 py-0.5 border rounded text-xs text-right"
                                    autoFocus />
                                  <button onClick={() => handleBudgetSave(s.id)}
                                    className="text-green-600 hover:text-green-700 text-[10px]">Save</button>
                                  <button onClick={() => setEditingTokenId(null)}
                                    className="text-gray-400 hover:text-gray-600 text-[10px]">Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingTokenId(s.id); setEditBudgetValue(s.budget_limit_seconds) }}
                                  className="hover:text-qcloud-primary cursor-pointer" title="Click to edit">
                                  {s.budget_limit_seconds}s
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{s.submission_count}</td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => handleToggleActive(s.id, s.is_active)}
                                className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer ${
                                  s.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}>
                                {s.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right text-qcloud-muted">{formatTime(s.last_used_at)}</td>
                            <td className="px-3 py-2 w-24">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-qcloud-primary h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, (s.budget_used_seconds / s.budget_limit_seconds) * 100)}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <p className="text-sm text-qcloud-muted">No data available.</p>
              )}
            </div>
          </div>
        )}

        {/* Submit Job Tab */}
        {activeTab === 'submit' && (
          <div className="bg-white rounded-xl border border-qcloud-border p-6">
            <h3 className="font-semibold text-qcloud-text mb-4">Admin Direct Submit</h3>
            <p className="text-sm text-qcloud-muted mb-4">
              Submit a circuit directly to IBM hardware. Uses a special admin token with unlimited budget.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Label (optional)</label>
                <input type="text" value={adminLabel} onChange={e => setAdminLabel(e.target.value)}
                  placeholder="e.g., Admin Test Run"
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Backend</label>
                <select value={adminBackend} onChange={e => setAdminBackend(e.target.value)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm">
                  {KNOWN_BACKENDS.map(b => (
                    <option key={b.name} value={b.name}>{b.name} ({b.qubits}q)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Shots</label>
                <input type="number" value={adminShots} onChange={e => setAdminShots(parseInt(e.target.value) || 1024)}
                  min={1} max={8192}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Eval Method</label>
                <select value={adminEvalMethod} onChange={e => setAdminEvalMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm">
                  <option value="inverse_bell">Inverse Bell</option>
                  <option value="tomography">Tomography</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-qcloud-muted block mb-1">Circuit Code</label>
              <div className="h-80 border border-qcloud-border rounded-lg overflow-hidden">
                <CodeEditor value={adminCode} onChange={(v) => setAdminCode(v || '')} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleAdminSubmit} disabled={isAdminSubmitting || !adminCode.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {isAdminSubmitting ? 'Submitting...' : 'Submit to Hardware'}
              </button>
              {adminSubmitMsg && (
                <span className={`text-sm ${adminSubmitMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {adminSubmitMsg}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-qcloud-border p-5">
              <h3 className="font-semibold text-qcloud-text mb-1">IBM Quantum API Key</h3>
              <p className="text-xs text-qcloud-muted mb-4">
                The API key used to submit jobs to IBM quantum hardware. It is stored encrypted. Enter a new key to replace the current one.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSettings()}
                  placeholder="Paste new IBM API key..."
                  className="flex-1 px-3 py-2 border border-qcloud-border rounded-lg text-sm font-mono"
                />
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingApiKey || !apiKey.trim()}
                  className="px-4 py-2 bg-qcloud-primary text-white rounded-lg text-sm hover:bg-qcloud-secondary transition-colors disabled:opacity-50"
                >
                  {isSavingApiKey ? 'Saving...' : 'Update Key'}
                </button>
              </div>
              {apiKeyMsg && (
                <p className={`text-xs ${apiKeyMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {apiKeyMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
