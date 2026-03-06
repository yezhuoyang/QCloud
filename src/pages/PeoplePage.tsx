import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import AuthHeader from '../components/AuthHeader'
import { useAuth } from '../contexts/AuthContext'
import { siteApi, type ContributorInfo } from '../utils/api'

function PeoplePage() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin

  const [people, setPeople] = useState<ContributorInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', affiliation: '', email: '', role: '', bio: '', url: '', display_order: 0 })
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', affiliation: '', email: '', role: '', bio: '', url: '', display_order: 0 })

  useEffect(() => {
    siteApi.getPeople()
      .then(setPeople)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const added = await siteApi.addContributor(form)
      setPeople(prev => [...prev, added])
      setForm({ name: '', affiliation: '', email: '', role: '', bio: '', url: '', display_order: 0 })
      setShowAdd(false)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (p: ContributorInfo) => {
    setEditingId(p.id)
    setEditForm({ name: p.name, affiliation: p.affiliation || '', email: p.email || '', role: p.role || '', bio: p.bio || '', url: p.url || '', display_order: p.display_order })
  }

  const handleSaveEdit = async () => {
    if (editingId === null) return
    setSaving(true)
    try {
      const updated = await siteApi.updateContributor(editingId, editForm)
      setPeople(prev => prev.map(p => p.id === editingId ? updated : p))
      setEditingId(null)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this contributor?')) return
    try {
      await siteApi.deleteContributor(id)
      setPeople(prev => prev.filter(p => p.id !== id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-qcloud-bg">
      <header className="bg-white/80 backdrop-blur border-b border-qcloud-border px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
            <span className="text-xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
              QuantumArena
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/about" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">About</Link>
          <Link to="/people" className="text-sm text-qcloud-primary font-medium">People</Link>
          <AuthHeader />
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-qcloud-text">People</h1>
          <p className="text-qcloud-muted mt-2">Contributors to the QuantumArena platform</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {people.map(person => (
              <div key={person.id} className="bg-white rounded-xl border border-qcloud-border p-5">
                {editingId === person.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                      <input value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} placeholder="Role" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                      <input value={editForm.affiliation} onChange={e => setEditForm(f => ({ ...f, affiliation: e.target.value }))} placeholder="Affiliation" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                      <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                      <input value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="Website URL" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                      <input type="number" value={editForm.display_order} onChange={e => setEditForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} placeholder="Order" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                    </div>
                    <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio" className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm resize-y h-20" />
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} disabled={saving} className="px-3 py-1.5 bg-qcloud-primary text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-qcloud-border rounded-lg text-sm text-qcloud-muted">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-qcloud-text text-lg">{person.name}</h3>
                        {person.role && (
                          <span className="px-2 py-0.5 bg-qcloud-primary/10 text-qcloud-primary rounded text-xs font-medium">{person.role}</span>
                        )}
                      </div>
                      {person.affiliation && (
                        <p className="text-sm text-qcloud-muted mt-0.5">{person.affiliation}</p>
                      )}
                      {person.email && (
                        <a href={`mailto:${person.email}`} className="text-sm text-qcloud-primary hover:underline">{person.email}</a>
                      )}
                      {person.url && (
                        <a href={person.url} target="_blank" rel="noopener noreferrer" className="text-sm text-qcloud-primary hover:underline ml-3">{person.url}</a>
                      )}
                      {person.bio && (
                        <p className="text-sm text-qcloud-muted mt-2 whitespace-pre-wrap">{person.bio}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleEdit(person)} className="text-xs text-qcloud-primary hover:underline">Edit</button>
                        <button onClick={() => handleDelete(person.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {people.length === 0 && (
              <div className="text-center py-12 text-qcloud-muted">No contributors yet.</div>
            )}
          </div>
        )}

        {/* Admin: Add contributor */}
        {isAdmin && (
          <div className="mt-6">
            {showAdd ? (
              <div className="bg-white rounded-xl border border-qcloud-border p-5 space-y-3">
                <h3 className="font-semibold text-qcloud-text">Add Contributor</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name *" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                  <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Role" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                  <input value={form.affiliation} onChange={e => setForm(f => ({ ...f, affiliation: e.target.value }))} placeholder="Affiliation" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="Website URL" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                  <input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} placeholder="Display Order" className="px-3 py-2 border border-qcloud-border rounded-lg text-sm" />
                </div>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio" className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm resize-y h-20" />
                <div className="flex gap-2">
                  <button onClick={handleAdd} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-qcloud-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Adding...' : 'Add'}</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-qcloud-border rounded-lg text-sm text-qcloud-muted">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full py-3 border-2 border-dashed border-qcloud-border rounded-xl text-qcloud-muted hover:border-qcloud-primary hover:text-qcloud-primary transition-colors text-sm font-medium"
              >
                + Add Contributor
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PeoplePage
