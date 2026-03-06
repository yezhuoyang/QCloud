import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import CodeEditor from '../components/CodeEditor'
import {
  challengeApi,
  type ChallengePublicDetail,
  type ChallengeBudgetSummary,
  type ChallengeListItem,
  type AdminChallengeSubmissionList,
} from '../utils/api'

function AdminChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const { user } = useAuth()

  // Views
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'tokens' | 'submissions'>('overview')

  // List
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)

  // Detail
  const [challengeDetail, setChallengeDetail] = useState<ChallengePublicDetail | null>(null)
  const [budgetSummary, setBudgetSummary] = useState<ChallengeBudgetSummary | null>(null)
  const [submissions, setSubmissions] = useState<AdminChallengeSubmissionList | null>(null)

  // Create form
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    category: '',
    tags: '',
    ibmq_api_key: '',
    allowed_backends: 'ibm_torino',
    evaluate_code: `def evaluate(counts, shots, **kwargs):
    """
    Score a submission based on measurement counts.

    Args:
        counts: dict of bitstring -> count  (e.g. {"00": 500, "11": 500})
        shots: total number of shots

    Returns:
        float between 0.0 and 1.0
    """
    # Example: fraction of |00> outcomes
    target_count = counts.get("00", 0)
    return target_count / shots
`,
    starter_code: '',
    reference_circuit: '',
    total_budget_seconds: '21600',
    num_participants: '50',
    max_concurrent_jobs: '3',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  // Token generation
  const [tokenUids, setTokenUids] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTokens, setGeneratedTokens] = useState<Array<{ participant_uid: string; token: string }>>([])

  // Load challenge list
  useEffect(() => {
    challengeApi.adminListChallenges()
      .then(r => setChallenges(r.challenges))
      .catch(() => {})
      .finally(() => setIsLoadingList(false))
  }, [])

  // Load detail if challengeId provided
  useEffect(() => {
    if (!challengeId) return
    challengeApi.getInfo(challengeId).then(setChallengeDetail).catch(() => {})
    challengeApi.getBudgets(challengeId).then(setBudgetSummary).catch(() => {})
    challengeApi.getAdminSubmissions(challengeId, { page_size: 50 }).then(setSubmissions).catch(() => {})
  }, [challengeId])

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-qcloud-bg flex items-center justify-center">
        <p className="text-red-500 text-lg">Admin access required</p>
      </div>
    )
  }

  // Create challenge
  const handleCreate = async () => {
    setIsCreating(true)
    setCreateError(null)
    setCreateSuccess(null)
    try {
      const backends = createForm.allowed_backends.split(',').map(b => b.trim()).filter(Boolean)
      const tags = createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined
      const result = await challengeApi.create({
        title: createForm.title,
        description: createForm.description || undefined,
        difficulty: createForm.difficulty,
        category: createForm.category || undefined,
        tags,
        ibmq_api_key: createForm.ibmq_api_key,
        allowed_backends: backends,
        evaluate_code: createForm.evaluate_code,
        starter_code: createForm.starter_code || undefined,
        reference_circuit: createForm.reference_circuit || undefined,
        total_budget_seconds: parseInt(createForm.total_budget_seconds),
        num_participants: parseInt(createForm.num_participants),
        max_concurrent_jobs: parseInt(createForm.max_concurrent_jobs),
      })
      setCreateSuccess(`Challenge created: ${result.id}`)
      // Refresh list
      challengeApi.adminListChallenges().then(r => setChallenges(r.challenges)).catch(() => {})
    } catch (err: any) {
      setCreateError(err?.detail || err?.message || 'Failed to create challenge')
    } finally {
      setIsCreating(false)
    }
  }

  // Generate tokens
  const handleGenerateTokens = async () => {
    if (!challengeId || !tokenUids.trim()) return
    setIsGenerating(true)
    try {
      const uids = tokenUids.split('\n').map(u => u.trim()).filter(Boolean)
      const participants = uids.map(uid => ({ uid, display_name: undefined }))
      const result = await challengeApi.generateTokens(challengeId, participants)
      setGeneratedTokens(result.tokens)
    } catch {
      // ignore
    } finally {
      setIsGenerating(false)
    }
  }

  // Render challenge list or detail
  if (challengeId) {
    return (
      <div className="min-h-screen bg-qcloud-bg">
        <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/challenges" className="text-qcloud-primary hover:underline text-sm">
              ← All Challenges
            </Link>
            <h1 className="text-lg font-bold text-qcloud-text">
              {challengeDetail?.title || 'Challenge Admin'}
            </h1>
          </div>
          <Link to={`/challenge/${challengeId}`} className="text-sm text-qcloud-muted hover:text-qcloud-primary">
            View Challenge →
          </Link>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b border-qcloud-border px-6">
          <div className="flex gap-6">
            {(['overview', 'tokens', 'submissions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-qcloud-primary text-qcloud-primary'
                    : 'border-transparent text-qcloud-muted hover:text-qcloud-text'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6">
          {activeTab === 'overview' && budgetSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-2xl font-bold text-qcloud-primary">{budgetSummary.num_participants}</div>
                  <div className="text-sm text-qcloud-muted">Participants</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-2xl font-bold text-qcloud-text">{budgetSummary.num_active_tokens}</div>
                  <div className="text-sm text-qcloud-muted">Active Tokens</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(budgetSummary.total_used_seconds / 60)} min
                  </div>
                  <div className="text-sm text-qcloud-muted">Budget Used</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {Math.round(budgetSummary.total_remaining_seconds / 60)} min
                  </div>
                  <div className="text-sm text-qcloud-muted">Budget Remaining</div>
                </div>
              </div>

              {/* Participant budget table */}
              {budgetSummary.participants.length > 0 && (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-6 py-3 border-b bg-qcloud-bg/50">
                    <h3 className="font-semibold">Participant Budgets</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-qcloud-muted border-b">
                        <th className="px-4 py-2">UID</th>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Used</th>
                        <th className="px-4 py-2">Limit</th>
                        <th className="px-4 py-2">Submissions</th>
                        <th className="px-4 py-2">Active</th>
                      </tr></thead>
                      <tbody>
                        {budgetSummary.participants.map(p => (
                          <tr key={p.id} className="border-b">
                            <td className="px-4 py-2 font-mono text-xs">{p.participant_uid_raw || p.participant_uid_hash.slice(0, 8)}</td>
                            <td className="px-4 py-2">{p.display_name || '—'}</td>
                            <td className="px-4 py-2">{Math.round(p.budget_used_seconds / 60)} min</td>
                            <td className="px-4 py-2">{Math.round(p.budget_limit_seconds / 60)} min</td>
                            <td className="px-4 py-2">{p.submission_count}</td>
                            <td className="px-4 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {p.is_active ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold mb-3">Generate Tokens</h3>
                <p className="text-sm text-qcloud-muted mb-2">One UID per line:</p>
                <textarea
                  value={tokenUids}
                  onChange={e => setTokenUids(e.target.value)}
                  rows={6}
                  className="w-full border border-qcloud-border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="student1@email.com&#10;student2@email.com"
                />
                <button
                  onClick={handleGenerateTokens}
                  disabled={isGenerating || !tokenUids.trim()}
                  className="mt-3 px-4 py-2 bg-qcloud-primary text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Tokens'}
                </button>
              </div>

              {generatedTokens.length > 0 && (
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold mb-3">Generated Tokens ({generatedTokens.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left border-b text-qcloud-muted">
                        <th className="px-3 py-2">UID</th>
                        <th className="px-3 py-2">Token</th>
                      </tr></thead>
                      <tbody>
                        {generatedTokens.map((t, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-3 py-2">{t.participant_uid}</td>
                            <td className="px-3 py-2 font-mono text-xs break-all">{t.token}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => {
                      const csv = generatedTokens.map(t => `${t.participant_uid},${t.token}`).join('\n')
                      navigator.clipboard.writeText(csv)
                    }}
                    className="mt-3 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                  >
                    Copy as CSV
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'submissions' && submissions && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-6 py-3 border-b bg-qcloud-bg/50">
                <h3 className="font-semibold">Submissions ({submissions.total})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-qcloud-muted border-b">
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Participant</th>
                    <th className="px-4 py-2">Score</th>
                    <th className="px-4 py-2">Backend</th>
                    <th className="px-4 py-2">Created</th>
                  </tr></thead>
                  <tbody>
                    {submissions.submissions.map(s => (
                      <tr key={s.id} className="border-b hover:bg-qcloud-bg/30">
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            s.status === 'completed' ? 'bg-green-100 text-green-700' :
                            s.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-2">
                          {s.display_name || s.participant_label}
                        </td>
                        <td className="px-4 py-2 font-bold text-qcloud-primary">
                          {s.score != null ? (s.score * 100).toFixed(1) + '%' : '—'}
                        </td>
                        <td className="px-4 py-2">{s.backend_name}</td>
                        <td className="px-4 py-2 text-qcloud-muted">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Challenge list + create view
  return (
    <div className="min-h-screen bg-qcloud-bg">
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-qcloud-text">Challenge Administration</h1>
        <Link to="/" className="text-sm text-qcloud-muted hover:text-qcloud-primary">
          ← Home
        </Link>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'overview' ? 'bg-qcloud-primary text-white' : 'bg-white text-qcloud-muted border'
            }`}
          >
            All Challenges
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'create' ? 'bg-qcloud-primary text-white' : 'bg-white text-qcloud-muted border'
            }`}
          >
            + Create Challenge
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            {isLoadingList ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : challenges.length === 0 ? (
              <div className="text-center py-12 text-qcloud-muted">
                <p>No challenges created yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-qcloud-muted border-b bg-qcloud-bg/50">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr></thead>
                <tbody>
                  {challenges.map(c => (
                    <tr key={c.id} className="border-b hover:bg-qcloud-bg/30">
                      <td className="px-4 py-3 font-medium">{c.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          c.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          c.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{c.difficulty}</span>
                      </td>
                      <td className="px-4 py-3">{c.num_tokens}</td>
                      <td className="px-4 py-3">{c.num_submissions}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/challenges/${c.id}`} className="text-qcloud-primary hover:underline text-xs">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="text-lg font-bold text-qcloud-text">Create New Challenge</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Title *</label>
                <input
                  value={createForm.title}
                  onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Challenge title"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Difficulty</label>
                <select
                  value={createForm.difficulty}
                  onChange={e => setCreateForm(f => ({ ...f, difficulty: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-qcloud-muted block mb-1">Description (markdown)</label>
              <textarea
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Category</label>
                <input
                  value={createForm.category}
                  onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="e.g. error_correction"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Tags (comma-separated)</label>
                <input
                  value={createForm.tags}
                  onChange={e => setCreateForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="entanglement, qec"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-qcloud-muted block mb-1">IBM API Key *</label>
              <input
                type="password"
                value={createForm.ibmq_api_key}
                onChange={e => setCreateForm(f => ({ ...f, ibmq_api_key: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-qcloud-muted block mb-1">Allowed Backends (comma-separated) *</label>
              <input
                value={createForm.allowed_backends}
                onChange={e => setCreateForm(f => ({ ...f, allowed_backends: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="ibm_torino, ibm_fez"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Total Budget (seconds)</label>
                <input
                  value={createForm.total_budget_seconds}
                  onChange={e => setCreateForm(f => ({ ...f, total_budget_seconds: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Max Participants</label>
                <input
                  value={createForm.num_participants}
                  onChange={e => setCreateForm(f => ({ ...f, num_participants: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-qcloud-muted block mb-1">Max Concurrent Jobs</label>
                <input
                  value={createForm.max_concurrent_jobs}
                  onChange={e => setCreateForm(f => ({ ...f, max_concurrent_jobs: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-qcloud-muted block mb-1">
                Evaluation Code * <span className="text-xs">(def evaluate(counts, shots, **kwargs) → float 0-1)</span>
              </label>
              <CodeEditor
                value={createForm.evaluate_code}
                onChange={v => setCreateForm(f => ({ ...f, evaluate_code: v || '' }))}
              />
            </div>

            <div>
              <label className="text-sm text-qcloud-muted block mb-1">Starter Code (optional)</label>
              <CodeEditor
                value={createForm.starter_code}
                onChange={v => setCreateForm(f => ({ ...f, starter_code: v || '' }))}
              />
            </div>

            {createError && <p className="text-red-500 text-sm">{createError}</p>}
            {createSuccess && <p className="text-green-600 text-sm">{createSuccess}</p>}

            <button
              onClick={handleCreate}
              disabled={isCreating || !createForm.title || !createForm.ibmq_api_key || !createForm.evaluate_code}
              className="px-6 py-2.5 bg-qcloud-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-qcloud-secondary transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminChallengePage
