import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { adminApi, type Category, type Problem, type Example, type User } from '../utils/api'

type Tab = 'problems' | 'categories' | 'examples' | 'users'

function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('problems')
  const [categories, setCategories] = useState<Category[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [examples, setExamples] = useState<Example[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Load data based on active tab
  useEffect(() => {
    if (!user?.is_admin) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        switch (activeTab) {
          case 'categories':
            const cats = await adminApi.listCategories(true)
            setCategories(cats)
            break
          case 'problems':
            const probs = await adminApi.listProblems({ includeInactive: true })
            setProblems(probs)
            break
          case 'examples':
            const exs = await adminApi.listExamples({ includeInactive: true })
            setExamples(exs)
            break
          case 'users':
            const usrs = await adminApi.listUsers({ limit: 100 })
            setUsers(usrs)
            break
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [activeTab, user?.is_admin])

  const handleToggleAdmin = async (userId: string) => {
    try {
      const result = await adminApi.toggleUserAdmin(userId)
      setUsers(users.map(u => u.id === userId ? { ...u, is_admin: result.is_admin } : u))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleDeleteProblem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return
    try {
      await adminApi.deleteProblem(id)
      setProblems(problems.filter(p => p.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete problem')
    }
  }

  const handleDeleteExample = async (id: string) => {
    if (!confirm('Are you sure you want to delete this example?')) return
    try {
      await adminApi.deleteExample(id)
      setExamples(examples.filter(e => e.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete example')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      await adminApi.deleteCategory(id)
      setCategories(categories.filter(c => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
        <div className="text-qcloud-muted">Loading...</div>
      </div>
    )
  }

  if (!user.is_admin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="text-qcloud-muted hover:text-qcloud-text mb-2 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
          <div className="text-sm text-qcloud-muted">
            Logged in as <span className="font-medium text-qcloud-text">{user.username}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-qcloud-border pb-2">
          {(['problems', 'categories', 'examples', 'users'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-qcloud-primary text-white'
                  : 'text-qcloud-muted hover:text-qcloud-text hover:bg-qcloud-bg'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
          {isLoading ? (
            <div className="text-center py-12 text-qcloud-muted">Loading...</div>
          ) : (
            <>
              {/* Problems Tab */}
              {activeTab === 'problems' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Problems ({problems.length})</h2>
                    <Link
                      to="/admin/problems/new"
                      className="px-4 py-2 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors"
                    >
                      + New Problem
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-qcloud-border text-left">
                          <th className="pb-3 font-medium text-qcloud-muted">Title</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Category</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Difficulty</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Status</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Solved</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {problems.map(problem => (
                          <tr key={problem.id} className="border-b border-qcloud-border/50 hover:bg-qcloud-bg/50">
                            <td className="py-3 font-medium">{problem.title}</td>
                            <td className="py-3 text-qcloud-muted">{problem.category}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                problem.difficulty === 'Hard' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {problem.difficulty}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                problem.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {problem.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 text-qcloud-muted">{problem.solve_count}</td>
                            <td className="py-3">
                              <div className="flex gap-2">
                                <Link
                                  to={`/admin/problems/${problem.id}`}
                                  className="text-qcloud-primary hover:text-qcloud-secondary text-sm"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleDeleteProblem(problem.id)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {problems.length === 0 && (
                    <div className="text-center py-8 text-qcloud-muted">
                      No problems yet. Create your first problem!
                    </div>
                  )}
                </div>
              )}

              {/* Categories Tab */}
              {activeTab === 'categories' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Categories ({categories.length})</h2>
                    <Link
                      to="/admin/categories/new"
                      className="px-4 py-2 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors"
                    >
                      + New Category
                    </Link>
                  </div>
                  <div className="grid gap-4">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-4 bg-qcloud-bg/50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{cat.icon}</span>
                          <div>
                            <div className="font-medium">{cat.name}</div>
                            <div className="text-sm text-qcloud-muted">{cat.id} • {cat.problem_count} problems</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Link
                            to={`/admin/categories/${cat.id}`}
                            className="text-qcloud-primary hover:text-qcloud-secondary text-sm"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {categories.length === 0 && (
                    <div className="text-center py-8 text-qcloud-muted">
                      No categories yet. Create your first category!
                    </div>
                  )}
                </div>
              )}

              {/* Examples Tab */}
              {activeTab === 'examples' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Examples ({examples.length})</h2>
                    <Link
                      to="/admin/examples/new"
                      className="px-4 py-2 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors"
                    >
                      + New Example
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-qcloud-border text-left">
                          <th className="pb-3 font-medium text-qcloud-muted">Title</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Category</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Difficulty</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Status</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Views</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examples.map(example => (
                          <tr key={example.id} className="border-b border-qcloud-border/50 hover:bg-qcloud-bg/50">
                            <td className="py-3">
                              <span className="mr-2">{example.icon}</span>
                              {example.title}
                            </td>
                            <td className="py-3 text-qcloud-muted">{example.category}</td>
                            <td className="py-3 text-qcloud-muted">{example.difficulty}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                example.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {example.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 text-qcloud-muted">{example.view_count}</td>
                            <td className="py-3">
                              <div className="flex gap-2">
                                <Link
                                  to={`/admin/examples/${example.id}`}
                                  className="text-qcloud-primary hover:text-qcloud-secondary text-sm"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleDeleteExample(example.id)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {examples.length === 0 && (
                    <div className="text-center py-8 text-qcloud-muted">
                      No examples yet. Create your first example!
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Users ({users.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-qcloud-border text-left">
                          <th className="pb-3 font-medium text-qcloud-muted">Username</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Email</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Role</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Joined</th>
                          <th className="pb-3 font-medium text-qcloud-muted">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-qcloud-border/50 hover:bg-qcloud-bg/50">
                            <td className="py-3 font-medium">{u.username}</td>
                            <td className="py-3 text-qcloud-muted">{u.email}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                u.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {u.is_admin ? 'Admin' : 'User'}
                              </span>
                            </td>
                            <td className="py-3 text-qcloud-muted">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              {u.id !== user.id && (
                                <button
                                  onClick={() => handleToggleAdmin(u.id)}
                                  className="text-qcloud-primary hover:text-qcloud-secondary text-sm"
                                >
                                  {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
