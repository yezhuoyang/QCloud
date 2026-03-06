import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { adminApi, type Category } from '../utils/api'

function AdminProblemEditorPage() {
  const { problemId } = useParams()
  const isNew = problemId === 'new'
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    category: '',
    difficulty: 'Easy' as string,
    max_qubits: 10,
    max_gate_count: 100,
    max_circuit_depth: 50,
    min_fidelity: 0.8,
    target_fidelity: 0.95,
    fidelity_metric: 'state_fidelity',
    hints: [] as string[],
    starter_code: '',
    solution_template: '',
    author: 'QuantumArena Team',
    tags: [] as string[],
    max_score: 100,
    time_bonus: false,
    is_active: true,
    is_featured: false,
    order: 0,
    test_cases: [] as unknown[]
  })

  const [hintsText, setHintsText] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [testCasesText, setTestCasesText] = useState('[]')

  // Check admin access
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login', { state: { from: '/admin' } })
      } else if (user && !user.is_admin) {
        navigate('/')
      }
    }
  }, [authLoading, isAuthenticated, user, navigate])

  // Load categories and problem data
  useEffect(() => {
    if (!user?.is_admin) return

    const loadData = async () => {
      try {
        const cats = await adminApi.listCategories(true)
        setCategories(cats)

        if (!isNew && problemId) {
          const problem = await adminApi.getProblem(problemId)
          setForm({
            id: problem.id,
            title: problem.title,
            description: problem.description,
            category: problem.category,
            difficulty: problem.difficulty,
            max_qubits: problem.max_qubits,
            max_gate_count: problem.max_gate_count,
            max_circuit_depth: problem.max_circuit_depth,
            min_fidelity: problem.min_fidelity,
            target_fidelity: problem.target_fidelity,
            fidelity_metric: problem.fidelity_metric,
            hints: problem.hints || [],
            starter_code: problem.starter_code || '',
            solution_template: problem.solution_template || '',
            author: problem.author,
            tags: problem.tags || [],
            max_score: problem.max_score,
            time_bonus: problem.time_bonus,
            is_active: problem.is_active,
            is_featured: problem.is_featured,
            order: problem.order,
            test_cases: problem.test_cases || []
          })
          setHintsText((problem.hints || []).join('\n'))
          setTagsText((problem.tags || []).join(', '))
          setTestCasesText(JSON.stringify(problem.test_cases || [], null, 2))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isNew, problemId, user?.is_admin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      // Parse hints and tags
      const hints = hintsText.split('\n').filter(h => h.trim())
      const tags = tagsText.split(',').map(t => t.trim()).filter(t => t)

      // Parse test cases
      let testCases: unknown[] = []
      try {
        testCases = JSON.parse(testCasesText)
      } catch {
        throw new Error('Invalid test cases JSON')
      }

      const data = {
        ...form,
        hints,
        tags,
        test_cases: testCases,
        id: isNew ? (form.id || undefined) : form.id
      }

      if (isNew) {
        await adminApi.createProblem(data)
      } else {
        await adminApi.updateProblem(problemId!, data)
      }

      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save problem')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
        <div className="text-qcloud-muted">Loading...</div>
      </div>
    )
  }

  if (!user?.is_admin) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/admin" className="text-qcloud-muted hover:text-qcloud-text mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-qcloud-text">
            {isNew ? 'Create New Problem' : 'Edit Problem'}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              {isNew && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-qcloud-text mb-1">
                    Problem ID (optional, auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={e => setForm({ ...form, id: e.target.value })}
                    className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                    placeholder="e.g., grover-2qubit-basic"
                  />
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-qcloud-text mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Difficulty *</label>
                <select
                  value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-qcloud-text mb-1">
                  Description * (Markdown supported)
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  required
                  rows={10}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Constraints */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Constraints</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Max Qubits</label>
                <input
                  type="number"
                  value={form.max_qubits}
                  onChange={e => setForm({ ...form, max_qubits: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Max Gate Count</label>
                <input
                  type="number"
                  value={form.max_gate_count}
                  onChange={e => setForm({ ...form, max_gate_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Max Circuit Depth</label>
                <input
                  type="number"
                  value={form.max_circuit_depth}
                  onChange={e => setForm({ ...form, max_circuit_depth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Fidelity Requirements */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Fidelity Requirements</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Min Fidelity</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.min_fidelity}
                  onChange={e => setForm({ ...form, min_fidelity: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Target Fidelity</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.target_fidelity}
                  onChange={e => setForm({ ...form, target_fidelity: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Metric</label>
                <select
                  value={form.fidelity_metric}
                  onChange={e => setForm({ ...form, fidelity_metric: e.target.value })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                >
                  <option value="state_fidelity">State Fidelity</option>
                  <option value="probability_overlap">Probability Overlap</option>
                  <option value="expectation_value">Expectation Value</option>
                </select>
              </div>
            </div>
          </div>

          {/* Code Templates */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Code Templates</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">
                  Starter Code (shown to users)
                </label>
                <textarea
                  value={form.starter_code}
                  onChange={e => setForm({ ...form, starter_code: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg font-mono text-sm"
                  placeholder="# Your starter code here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">
                  Solution Template (hidden, for evaluation)
                </label>
                <textarea
                  value={form.solution_template}
                  onChange={e => setForm({ ...form, solution_template: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg font-mono text-sm"
                  placeholder="# Reference solution..."
                />
              </div>
            </div>
          </div>

          {/* Test Cases */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Test Cases (JSON)</h2>
            <textarea
              value={testCasesText}
              onChange={e => setTestCasesText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-qcloud-border rounded-lg font-mono text-sm"
            />
          </div>

          {/* Hints and Tags */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Hints & Tags</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">
                  Hints (one per line)
                </label>
                <textarea
                  value={hintsText}
                  onChange={e => setHintsText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                  placeholder="Hint 1&#10;Hint 2&#10;Hint 3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={e => setTagsText(e.target.value)}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                  placeholder="quantum, grover, search"
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Metadata</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Author</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Max Score</label>
                <input
                  type="number"
                  value={form.max_score}
                  onChange={e => setForm({ ...form, max_score: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Display Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setForm({ ...form, order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.time_bonus}
                    onChange={e => setForm({ ...form, time_bonus: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Time Bonus</span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              to="/admin"
              className="px-6 py-3 border border-qcloud-border rounded-lg text-qcloud-text hover:bg-qcloud-bg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : (isNew ? 'Create Problem' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminProblemEditorPage
