import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import AuthHeader from '../components/AuthHeader'
import { useAuth } from '../contexts/AuthContext'
import { siteApi, type AboutContent } from '../utils/api'

function AboutPage() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin

  const [about, setAbout] = useState<AboutContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    siteApi.getAbout()
      .then(setAbout)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleEdit = (section: string, currentValue: string) => {
    setEditing(section)
    setEditValue(currentValue)
  }

  const handleSave = async () => {
    if (!editing || !about) return
    setSaving(true)
    try {
      const updated = await siteApi.updateAbout({ [editing]: editValue })
      setAbout(updated)
      setEditing(null)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const renderSection = (title: string, key: keyof AboutContent, content: string) => (
    <div className="bg-white rounded-xl border border-qcloud-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-qcloud-text">{title}</h2>
        {isAdmin && editing !== key && (
          <button
            onClick={() => handleEdit(key, content)}
            className="text-sm text-qcloud-primary hover:text-qcloud-secondary"
          >
            Edit
          </button>
        )}
      </div>
      {editing === key ? (
        <div className="space-y-3">
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="w-full h-48 px-4 py-3 border border-qcloud-border rounded-lg text-sm font-mono focus:outline-none focus:border-qcloud-primary resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-qcloud-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-qcloud-secondary transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 border border-qcloud-border rounded-lg text-sm text-qcloud-muted hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-qcloud-muted">Supports plain text with blank lines for paragraphs. Use **bold** for emphasis.</p>
        </div>
      ) : (
        <div className="text-sm text-qcloud-muted whitespace-pre-wrap leading-relaxed">
          {content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={i} className="text-qcloud-text">{part.slice(2, -2)}</strong>
              : part
          )}
        </div>
      )}
    </div>
  )

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
          <Link to="/about" className="text-sm text-qcloud-primary font-medium">About</Link>
          <Link to="/people" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">People</Link>
          <AuthHeader />
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-qcloud-text">About QuantumArena</h1>
          <p className="text-qcloud-muted mt-2">Our mission, and how to get involved</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : about ? (
          <>
            {renderSection('Mission & Goals', 'mission', about.mission)}
            {renderSection('Support & Donate', 'donate', about.donate)}
            {renderSection('Collaborate With Us', 'collaborate', about.collaborate)}
          </>
        ) : (
          <div className="text-center py-12 text-qcloud-muted">Failed to load content.</div>
        )}
      </div>
    </div>
  )
}

export default AboutPage
