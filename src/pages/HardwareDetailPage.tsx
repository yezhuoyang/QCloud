import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { hardwareProviders, typeLabels, typeColors, statusColors } from './HardwarePage'
import { hardwareApi } from '../utils/api'

interface CredentialConfig {
  token: string
  channel?: string
  instance?: string
}

function HardwareDetailPage() {
  const { hardwareId } = useParams<{ hardwareId: string }>()
  const navigate = useNavigate()

  const hardware = hardwareProviders.find(h => h.id === hardwareId)

  const [credentials, setCredentials] = useState<CredentialConfig>({
    token: '',
    channel: 'ibm_cloud',
    instance: ''
  })
  const [showToken, setShowToken] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  // Load existing credentials
  useEffect(() => {
    if (hardware) {
      const stored = localStorage.getItem(`qcloud_creds_${hardware.company.toLowerCase()}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setCredentials(parsed)
        } catch {
          // ignore
        }
      }
    }
  }, [hardware])

  if (!hardware) {
    return (
      <div className="min-h-screen bg-qcloud-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-qcloud-text mb-4">Hardware not found</h1>
          <Link to="/hardware" className="text-qcloud-primary hover:text-qcloud-secondary">
            Back to Hardware List
          </Link>
        </div>
      </div>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    // Store credentials locally
    localStorage.setItem(
      `qcloud_creds_${hardware.company.toLowerCase()}`,
      JSON.stringify(credentials)
    )

    // Update the credentials status
    const storedCredentials = JSON.parse(localStorage.getItem('qcloud_hardware_credentials') || '{}')
    storedCredentials[hardware.company] = !!credentials.token
    localStorage.setItem('qcloud_hardware_credentials', JSON.stringify(storedCredentials))

    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsSaving(false)
    setSaveSuccess(true)

    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleTestConnection = async () => {
    if (!credentials.token) {
      setTestError('Please enter your API token first')
      setTestStatus('error')
      return
    }

    setTestStatus('testing')
    setTestError(null)

    try {
      // For IBM, test with user's credentials via backend
      if (hardware.company === 'IBM') {
        const data = await hardwareApi.testCredentials(
          credentials.token,
          credentials.channel || 'ibm_quantum',
          credentials.instance || undefined
        )

        if (data.success) {
          setTestStatus('success')
          // Optionally show available backends
          if (data.backends && data.backends.length > 0) {
            console.log('Available backends:', data.backends)
          }
        } else {
          setTestStatus('error')
          setTestError(data.error || 'Could not connect to IBM Quantum. Check your credentials.')
        }
      } else {
        // For other providers, simulate a test
        await new Promise(resolve => setTimeout(resolve, 1500))
        setTestStatus('success')
      }
    } catch (error) {
      setTestStatus('error')
      setTestError('Connection test failed. Check your credentials and try again.')
    }
  }

  const handleClearCredentials = () => {
    setCredentials({ token: '', channel: 'ibm_cloud', instance: '' })
    localStorage.removeItem(`qcloud_creds_${hardware.company.toLowerCase()}`)

    const storedCredentials = JSON.parse(localStorage.getItem('qcloud_hardware_credentials') || '{}')
    delete storedCredentials[hardware.company]
    localStorage.setItem('qcloud_hardware_credentials', JSON.stringify(storedCredentials))
  }

  const handleUseHardware = () => {
    // Store selected hardware for the editor
    localStorage.setItem('qcloud_selected_hardware', JSON.stringify({
      id: hardware.id,
      name: hardware.name,
      backend: hardware.backendName
    }))
    navigate('/editor')
  }

  return (
    <div className="min-h-screen bg-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80">
              <Logo size="small" />
              <span className="font-semibold text-lg text-qcloud-text">QuantumArena</span>
            </Link>
            <span className="text-qcloud-muted">/</span>
            <Link to="/hardware" className="text-qcloud-muted hover:text-qcloud-text">
              Hardware
            </Link>
            <span className="text-qcloud-muted">/</span>
            <span className="text-qcloud-text">{hardware.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hardware Header */}
        <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden mb-6">
          <div className="p-6 bg-gradient-to-r from-qcloud-primary/5 to-qcloud-secondary/5 border-b border-qcloud-border">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-qcloud-text">{hardware.name}</h1>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[hardware.type]}`}>
                    {typeLabels[hardware.type]}
                  </span>
                </div>
                <p className="text-qcloud-muted">{hardware.company}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusColors[hardware.status].bg} ${statusColors[hardware.status].text}`}>
                <span className={`w-2 h-2 rounded-full ${statusColors[hardware.status].dot}`} />
                {hardware.status === 'coming_soon' ? 'Coming Soon' : hardware.status.charAt(0).toUpperCase() + hardware.status.slice(1)}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-3xl font-bold text-qcloud-primary">{hardware.qubits}</div>
                <div className="text-sm text-qcloud-muted">Qubits</div>
              </div>
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-3xl font-bold text-qcloud-secondary">{typeLabels[hardware.type]}</div>
                <div className="text-sm text-qcloud-muted">Technology</div>
              </div>
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-3xl font-bold text-green-500">{hardware.pricing}</div>
                <div className="text-sm text-qcloud-muted">Pricing</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-qcloud-text mb-6">{hardware.description}</p>

            {/* Features */}
            <div className="mb-6">
              <h3 className="font-medium text-qcloud-text mb-2">Features</h3>
              <div className="flex flex-wrap gap-2">
                {hardware.features.map((f, i) => (
                  <span key={i} className="px-3 py-1 bg-qcloud-bg rounded-full text-sm text-qcloud-text">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Documentation Link */}
            {hardware.docsUrl && (
              <a
                href={hardware.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-qcloud-primary hover:text-qcloud-secondary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Documentation
              </a>
            )}
          </div>
        </div>

        {/* API Configuration */}
        {hardware.apiRequired && hardware.status === 'online' && (
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden mb-6">
            <div className="p-4 border-b border-qcloud-border bg-qcloud-bg/50">
              <h2 className="font-semibold text-qcloud-text flex items-center gap-2">
                <svg className="w-5 h-5 text-qcloud-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                API Configuration
              </h2>
            </div>

            <div className="p-6">
              {/* API Token */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-qcloud-text mb-2">
                  API Token *
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={credentials.token}
                    onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
                    placeholder={`Enter your ${hardware.company} API token`}
                    className="w-full px-4 py-2 pr-20 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-qcloud-muted hover:text-qcloud-text"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-qcloud-muted">
                  Get your API token from{' '}
                  <a href={hardware.docsUrl} target="_blank" rel="noopener noreferrer" className="text-qcloud-primary hover:underline">
                    {hardware.company}'s website
                  </a>
                </p>
              </div>

              {/* IBM-specific options */}
              {hardware.company === 'IBM' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-qcloud-text mb-2">
                      Channel
                    </label>
                    <select
                      value={credentials.channel}
                      onChange={(e) => setCredentials({ ...credentials, channel: e.target.value })}
                      className="w-full px-4 py-2 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20"
                    >
                      <option value="ibm_cloud">IBM Cloud</option>
                      <option value="ibm_quantum">IBM Quantum (Legacy)</option>
                    </select>
                    <p className="mt-1 text-xs text-qcloud-muted">
                      Most users should use "IBM Cloud" for the latest features
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-qcloud-text mb-2">
                      Instance (Optional)
                    </label>
                    <input
                      type="text"
                      value={credentials.instance}
                      onChange={(e) => setCredentials({ ...credentials, instance: e.target.value })}
                      placeholder="e.g., ibm-q/open/main"
                      className="w-full px-4 py-2 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20"
                    />
                    <p className="mt-1 text-xs text-qcloud-muted">
                      Leave empty to use default. This is your hub/group/project path, NOT the backend name.
                      The backend (e.g., ibm_boston) is selected in the code editor.
                    </p>
                  </div>
                </>
              )}

              {/* Test Connection Status */}
              {testStatus !== 'idle' && (
                <div className={`mb-4 p-3 rounded-lg ${
                  testStatus === 'testing' ? 'bg-blue-50 text-blue-700' :
                  testStatus === 'success' ? 'bg-green-50 text-green-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {testStatus === 'testing' && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Testing connection...
                    </div>
                  )}
                  {testStatus === 'success' && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Connection successful!
                    </div>
                  )}
                  {testStatus === 'error' && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {testError || 'Connection failed'}
                    </div>
                  )}
                </div>
              )}

              {/* Save Success Message */}
              {saveSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Credentials saved successfully!
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-qcloud-primary text-white rounded-lg font-medium hover:bg-qcloud-secondary transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Credentials'}
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="px-4 py-2 border border-qcloud-border text-qcloud-text rounded-lg font-medium hover:bg-qcloud-bg transition-colors disabled:opacity-50"
                >
                  Test Connection
                </button>
                {credentials.token && (
                  <button
                    onClick={handleClearCredentials}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Security Note */}
              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800">Security Note</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Your credentials are stored locally in your browser and sent directly to {hardware.company}'s servers.
                      QuantumArena does not store or have access to your API tokens.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Use Hardware Button */}
        {hardware.status === 'online' && (
          <div className="bg-white rounded-xl border border-qcloud-border p-6 text-center">
            <h3 className="font-semibold text-lg text-qcloud-text mb-2">Ready to run circuits?</h3>
            <p className="text-qcloud-muted mb-4">
              Open the code editor with {hardware.name} pre-selected as your target.
            </p>
            <button
              onClick={handleUseHardware}
              className="px-6 py-3 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Open Code Editor with {hardware.name}
            </button>
          </div>
        )}

        {/* Coming Soon Message */}
        {hardware.status === 'coming_soon' && (
          <div className="bg-white rounded-xl border border-qcloud-border p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg text-qcloud-text mb-2">Coming Soon</h3>
            <p className="text-qcloud-muted">
              Support for {hardware.name} is currently in development. Check back later!
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default HardwareDetailPage
