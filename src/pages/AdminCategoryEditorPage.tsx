import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { adminApi } from '../utils/api'

function AdminCategoryEditorPage() {
  const { categoryId } = useParams()
  const isNew = categoryId === 'new'
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    icon: '📦',
    color: 'blue',
    order: 0,
    is_active: true
  })

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

  // Load category data
  useEffect(() => {
    if (!user?.is_admin || isNew) return

    const loadData = async () => {
      try {
        const category = await adminApi.getCategory(categoryId!)
        setForm({
          id: category.id,
          name: category.name,
          description: category.description || '',
          icon: category.icon || '📦',
          color: category.color || 'blue',
          order: category.order || 0,
          is_active: category.is_active
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load category')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isNew, categoryId, user?.is_admin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      if (!form.id.trim()) {
        throw new Error('Category ID is required')
      }
      if (!form.name.trim()) {
        throw new Error('Category name is required')
      }

      if (isNew) {
        await adminApi.createCategory(form)
      } else {
        await adminApi.updateCategory(categoryId!, form)
      }

      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
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

  const colorOptions = ['blue', 'green', 'purple', 'orange', 'red', 'yellow', 'pink', 'teal']
  const iconOptions = ['📦', '🔬', '⚛️', '🧮', '💡', '🎯', '🚀', '⚡', '🔮', '🌀', '🎲', '📊', '🔧', '🛠️', '📐', '🧬']

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/admin" className="text-qcloud-muted hover:text-qcloud-text mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-qcloud-text">
            {isNew ? 'Create New Category' : 'Edit Category'}
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
            <h2 className="text-lg font-semibold mb-4">Category Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">
                  Category ID * {!isNew && <span className="text-qcloud-muted">(cannot be changed)</span>}
                </label>
                <input
                  type="text"
                  value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  disabled={!isNew}
                  required
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg disabled:bg-gray-100"
                  placeholder="e.g., grover, vqe, qaoa"
                />
                <p className="text-xs text-qcloud-muted mt-1">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                  placeholder="e.g., Grover's Algorithm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg"
                  placeholder="Brief description of this category..."
                />
              </div>
            </div>
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
                <div className="mt-2">
                  <input
                    type="text"
                    value={form.icon}
                    onChange={e => setForm({ ...form, icon: e.target.value })}
                    className="w-20 px-3 py-2 border border-qcloud-border rounded-lg text-center text-xl"
                    placeholder="📦"
                  />
                  <span className="text-xs text-qcloud-muted ml-2">Or type custom emoji</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`px-4 py-2 rounded-lg border-2 capitalize transition-colors ${
                        form.color === color
                          ? 'border-qcloud-primary font-medium'
                          : 'border-qcloud-border hover:border-qcloud-primary/50'
                      }`}
                      style={{
                        backgroundColor: color === 'blue' ? '#dbeafe' :
                                        color === 'green' ? '#dcfce7' :
                                        color === 'purple' ? '#f3e8ff' :
                                        color === 'orange' ? '#ffedd5' :
                                        color === 'red' ? '#fee2e2' :
                                        color === 'yellow' ? '#fef9c3' :
                                        color === 'pink' ? '#fce7f3' :
                                        '#ccfbf1'
                      }}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-sm font-medium text-qcloud-text mb-1">Display Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-qcloud-border rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Active (visible to users)</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            <div className="flex items-center gap-4 p-4 bg-qcloud-bg/50 rounded-lg">
              <span className="text-3xl">{form.icon}</span>
              <div>
                <div className="font-medium text-lg">{form.name || 'Category Name'}</div>
                <div className="text-sm text-qcloud-muted">{form.id || 'category-id'}</div>
              </div>
              <span className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                form.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
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
              {isSaving ? 'Saving...' : (isNew ? 'Create Category' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminCategoryEditorPage
