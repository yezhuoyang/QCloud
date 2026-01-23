import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { adminApi } from '../utils/api'

function AdminExampleEditorPage() {
  const { exampleId } = useParams()
  const isNew = exampleId === 'new'
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    category: 'basic',
    difficulty: 'Beginner',
    code: '',
    explanation: '',
    author: 'QCloud Team',
    tags: [] as string[],
    icon: '📝',
    is_active: true,
    is_featured: false,
    order: 0
  })

  const [tagsText, setTagsText] = useState('')

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

  // Load example data
  useEffect(() => {
    if (!user?.is_admin || isNew) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      try {
        const example = await adminApi.getExample(exampleId!)
        setForm({
          id: example.id,
          title: example.title,
          description: example.description || '',
          category: example.category,
          difficulty: example.difficulty,
          code: example.code,
          explanation: example.explanation || '',
          author: example.author,
          tags: example.tags || [],
          icon: example.icon || '📝',
          is_active: example.is_active,
          is_featured: example.is_featured,
          order: example.order
        })
        setTagsText((example.tags || []).join(', '))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load example')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isNew, exampleId, user?.is_admin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      if (!form.title.trim()) {
        throw new Error('Title is required')
      }
      if (!form.code.trim()) {
        throw new Error('Code is required')
      }

      const tags = tagsText.split(',').map(t => t.trim()).filter(t => t)

      const data = {
        ...form,
        tags,
        id: isNew ? (form.id || undefined) : form.id
      }

      if (isNew) {
        await adminApi.createExample(data)
      } else {
        await adminApi.updateExample(exampleId!, data)
      }

      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save example')
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

  const categoryOptions = ['basic', 'algorithms', 'applications', 'advanced', 'tutorials']
  const difficultyOptions = ['Beginner', 'Intermediate', 'Advanced']
  const iconOptions = ['📝', '🔬', '⚛️', '🧮', '💡', '🎯', '🚀', '⚡', '🔮', '🌀', '🎲', '📊', '🔧', '🛠️', '📐', '🧬']

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/admin" className="text-qcloud-muted hover:text-qcloud-text mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-qcloud-text">
            {isNew ? 'Create New Example' : 'Edit Example'}
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
                    Example ID (optional, auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={e => setForm({ ...form, id: e.target.value })}
                    className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                    placeholder="e.g., bell-state-example"
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
                  placeholder="e.g., Bell State Creation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                >
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                >
                  {difficultyOptions.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-qcloud-text mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                  placeholder="Brief description of what this example demonstrates..."
                />
              </div>
            </div>
          </div>

          {/* Code */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Code *</h2>
            <textarea
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              required
              rows={15}
              className="w-full px-3 py-2 border border-qcloud-border rounded-lg font-mono text-sm"
              placeholder="# Enter your quantum circuit code here..."
            />
          </div>

          {/* Explanation */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Explanation (Markdown supported)</h2>
            <textarea
              value={form.explanation}
              onChange={e => setForm({ ...form, explanation: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
              placeholder="Explain the circuit step by step..."
            />
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Appearance</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-10 h-10 text-xl rounded-lg border-2 transition-colors ${
                        form.icon === icon
                          ? 'border-qcloud-primary bg-qcloud-light'
                          : 'border-qcloud-border hover:border-qcloud-primary/50'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
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
                  placeholder="quantum, entanglement, bell-state"
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
                <label className="block text-sm font-medium text-qcloud-text mb-1">Display Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <div className="col-span-2 flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Active (visible to users)</span>
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
              {isSaving ? 'Saving...' : (isNew ? 'Create Example' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminExampleEditorPage
