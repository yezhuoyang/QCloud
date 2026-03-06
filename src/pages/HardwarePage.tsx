import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { HARDWARE_PROVIDERS, type HardwareProvider } from '../data/hardwareProviders'

const hardwareProviders = HARDWARE_PROVIDERS

const typeLabels: Record<string, string> = {
  superconducting: 'Superconducting',
  trapped_ion: 'Trapped Ion',
  photonic: 'Photonic',
  neutral_atom: 'Neutral Atom',
  simulator: 'Simulator'
}

const typeColors: Record<string, string> = {
  superconducting: 'bg-blue-100 text-blue-700',
  trapped_ion: 'bg-purple-100 text-purple-700',
  photonic: 'bg-amber-100 text-amber-700',
  neutral_atom: 'bg-green-100 text-green-700',
  simulator: 'bg-gray-100 text-gray-700'
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  online: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  offline: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  maintenance: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  coming_soon: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' }
}

function HardwarePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [showOnlineOnly, setShowOnlineOnly] = useState(false)
  const [userCredentials, setUserCredentials] = useState<Record<string, boolean>>({})

  // Load user's configured credentials from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('qcloud_hardware_credentials')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUserCredentials(parsed)
      } catch {
        // ignore
      }
    }
  }, [])

  // Get unique companies
  const companies = [...new Set(hardwareProviders.map(h => h.company))]
  const types = [...new Set(hardwareProviders.map(h => h.type))]

  // Filter hardware
  const filteredHardware = hardwareProviders.filter(hw => {
    if (selectedType && hw.type !== selectedType) return false
    if (selectedCompany && hw.company !== selectedCompany) return false
    if (showOnlineOnly && hw.status !== 'online') return false
    return true
  })

  const handleSelectHardware = (hw: HardwareProvider) => {
    if (hw.status === 'online') {
      navigate(`/hardware/${hw.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80">
              <Logo size="small" />
              <span className="font-semibold text-lg text-qcloud-text">QuantumArena</span>
            </Link>
            <span className="text-qcloud-muted">/</span>
            <h1 className="font-semibold text-qcloud-text">Quantum Hardware</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/hardware/leaderboard"
              className="px-4 py-2 text-sm text-qcloud-muted hover:bg-qcloud-primary/5 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Leaderboard
            </Link>
            <Link
              to="/jobs"
              className="px-4 py-2 text-sm text-qcloud-muted hover:bg-qcloud-primary/5 rounded-lg transition-colors"
            >
              Job History
            </Link>
            <Link
              to="/editor"
              className="px-4 py-2 text-sm text-qcloud-primary hover:bg-qcloud-primary/5 rounded-lg transition-colors"
            >
              Code Editor
            </Link>
            {user ? (
              <Link
                to="/profile"
                className="px-4 py-2 text-sm bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors"
              >
                {user.username}
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-qcloud-text mb-2">Quantum Hardware</h2>
          <p className="text-qcloud-muted">
            Access real quantum computers from leading providers. Configure your API credentials to run circuits on actual hardware.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-qcloud-border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Company Filter */}
            <div>
              <label className="text-xs text-qcloud-muted block mb-1">Company</label>
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(e.target.value || null)}
                className="px-3 py-2 border border-qcloud-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20"
              >
                <option value="">All Companies</option>
                {companies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-xs text-qcloud-muted block mb-1">Technology</label>
              <select
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || null)}
                className="px-3 py-2 border border-qcloud-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20"
              >
                <option value="">All Types</option>
                {types.map(t => (
                  <option key={t} value={t}>{typeLabels[t]}</option>
                ))}
              </select>
            </div>

            {/* Online Only Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="checkbox"
                id="onlineOnly"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="rounded border-qcloud-border text-qcloud-primary focus:ring-qcloud-primary/20"
              />
              <label htmlFor="onlineOnly" className="text-sm text-qcloud-text cursor-pointer">
                Available now
              </label>
            </div>
          </div>
        </div>

        {/* Hardware Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHardware.map(hw => (
            <div
              key={hw.id}
              onClick={() => handleSelectHardware(hw)}
              className={`bg-white rounded-xl border border-qcloud-border overflow-hidden transition-all ${
                hw.status === 'online'
                  ? 'cursor-pointer hover:border-qcloud-primary hover:shadow-lg'
                  : 'opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-qcloud-border bg-gradient-to-r from-qcloud-primary/5 to-qcloud-secondary/5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-qcloud-text">{hw.name}</h3>
                    <p className="text-sm text-qcloud-muted">{hw.company}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${statusColors[hw.status].bg} ${statusColors[hw.status].text}`}>
                    <span className={`w-2 h-2 rounded-full ${statusColors[hw.status].dot}`} />
                    {hw.status === 'coming_soon' ? 'Coming Soon' : hw.status.charAt(0).toUpperCase() + hw.status.slice(1)}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                {/* Stats */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-qcloud-primary">{hw.qubits}</div>
                    <div className="text-xs text-qcloud-muted">Qubits</div>
                  </div>
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${typeColors[hw.type]}`}>
                      {typeLabels[hw.type]}
                    </span>
                  </div>
                  {userCredentials[hw.company] && hw.apiRequired && (
                    <div className="text-green-500" title="API configured">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-qcloud-muted mb-4 line-clamp-2">{hw.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {hw.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-qcloud-bg rounded text-xs text-qcloud-muted">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-qcloud-border">
                  <span className="text-xs text-qcloud-muted">{hw.pricing}</span>
                  {hw.status === 'online' ? (
                    <span className="text-sm text-qcloud-primary font-medium flex items-center gap-1">
                      Configure
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  ) : (
                    <span className="text-xs text-qcloud-muted">Not available yet</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredHardware.length === 0 && (
          <div className="text-center py-12">
            <p className="text-qcloud-muted">No hardware matches your filters</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-xl border border-qcloud-border p-6">
          <h3 className="font-semibold text-lg text-qcloud-text mb-4">About Quantum Hardware Access</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-10 h-10 bg-qcloud-primary/10 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-qcloud-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h4 className="font-medium text-qcloud-text mb-2">API Credentials</h4>
              <p className="text-sm text-qcloud-muted">
                Each provider requires their own API credentials. Sign up on their platform and configure your tokens here.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-qcloud-primary/10 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-qcloud-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-qcloud-text mb-2">Queue Times</h4>
              <p className="text-sm text-qcloud-muted">
                Real quantum hardware has queue times. Jobs may take minutes to hours depending on demand.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-qcloud-primary/10 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-qcloud-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-medium text-qcloud-text mb-2">Secure Storage</h4>
              <p className="text-sm text-qcloud-muted">
                Your API credentials are stored locally in your browser. We never transmit them to our servers.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default HardwarePage
export { hardwareProviders, typeLabels, typeColors, statusColors }
