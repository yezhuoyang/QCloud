import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get redirect path from state or default to home
  const from = (location.state as { from?: string })?.from || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    setIsSubmitting(true)

    try {
      const user = await login(email, password)

      // If admin mode, verify user is admin
      if (isAdminMode) {
        if (!user.is_admin) {
          setLocalError('Access denied. This account does not have admin privileges.')
          setIsSubmitting(false)
          return
        }
        // Redirect to admin dashboard
        navigate('/admin', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch {
      // Error is handled by context
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setIsAdminMode(!isAdminMode)
    clearError()
    setLocalError(null)
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <Logo size="medium" />
          </Link>
          <h1 className={`text-3xl font-bold mt-4 bg-clip-text text-transparent ${
            isAdminMode
              ? 'bg-gradient-to-r from-purple-600 to-purple-800'
              : 'bg-gradient-to-r from-qcloud-primary to-qcloud-secondary'
          }`}>
            {isAdminMode ? 'Admin Portal' : 'Welcome Back'}
          </h1>
          <p className="text-qcloud-muted mt-2">
            {isAdminMode
              ? 'Sign in with your admin account'
              : 'Sign in to your QuantumArena account'
            }
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-lg border border-qcloud-border p-1 bg-white">
            <button
              type="button"
              onClick={() => !isAdminMode || toggleMode()}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isAdminMode
                  ? 'bg-qcloud-primary text-white'
                  : 'text-qcloud-muted hover:text-qcloud-text'
              }`}
            >
              User Sign In
            </button>
            <button
              type="button"
              onClick={() => isAdminMode || toggleMode()}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isAdminMode
                  ? 'bg-purple-600 text-white'
                  : 'text-qcloud-muted hover:text-qcloud-text'
              }`}
            >
              Admin Sign In
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className={`bg-white rounded-xl shadow-sm border p-8 ${
          isAdminMode ? 'border-purple-200' : 'border-qcloud-border'
        }`}>
          {/* Admin Mode Banner */}
          {isAdminMode && (
            <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
              <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="text-sm text-purple-700">
                <strong>Admin Access Only</strong> - Only admin accounts can sign in here.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {displayError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {displayError}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-qcloud-text mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  isAdminMode
                    ? 'border-purple-200 focus:ring-purple-200 focus:border-purple-500'
                    : 'border-qcloud-border focus:ring-qcloud-primary/20 focus:border-qcloud-primary'
                }`}
                placeholder="you@example.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-qcloud-text mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  isAdminMode
                    ? 'border-purple-200 focus:ring-purple-200 focus:border-purple-500'
                    : 'border-qcloud-border focus:ring-qcloud-primary/20 focus:border-qcloud-primary'
                }`}
                placeholder="Enter your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
                isAdminMode
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700'
                  : 'bg-gradient-to-r from-qcloud-primary to-qcloud-secondary'
              }`}
            >
              {isSubmitting
                ? 'Signing in...'
                : isAdminMode
                  ? 'Sign In as Admin'
                  : 'Sign In'
              }
            </button>
          </form>

          {/* Register Link - only show for non-admin mode */}
          {!isAdminMode && (
            <div className="mt-6 text-center text-sm text-qcloud-muted">
              Don't have an account?{' '}
              <Link
                to="/register"
                state={{ from }}
                className="text-qcloud-primary hover:text-qcloud-secondary font-medium"
              >
                Create one
              </Link>
            </div>
          )}

          {/* Admin help text */}
          {isAdminMode && (
            <div className="mt-6 text-center text-sm text-qcloud-muted">
              Need help?{' '}
              <span className="text-purple-600">
                Contact the system administrator
              </span>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-qcloud-muted hover:text-qcloud-text transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
