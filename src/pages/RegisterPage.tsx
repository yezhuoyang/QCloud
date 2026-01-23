import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'

function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get redirect path from state or default to home
  const from = (location.state as { from?: string })?.from || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    // Validate username
    if (username.length < 3) {
      setLocalError('Username must be at least 3 characters')
      return
    }

    setIsSubmitting(true)

    try {
      await register(email, username, password)
      navigate(from, { replace: true })
    } catch {
      // Error is handled by context
    } finally {
      setIsSubmitting(false)
    }
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
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-qcloud-muted mt-2">
            Join QCloud and start quantum computing
          </p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="w-full px-4 py-3 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20 focus:border-qcloud-primary transition-colors"
                placeholder="you@example.com"
              />
            </div>

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-qcloud-text mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={50}
                className="w-full px-4 py-3 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20 focus:border-qcloud-primary transition-colors"
                placeholder="quantum_coder"
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
                minLength={6}
                className="w-full px-4 py-3 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20 focus:border-qcloud-primary transition-colors"
                placeholder="At least 6 characters"
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-qcloud-text mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/20 focus:border-qcloud-primary transition-colors"
                placeholder="Re-enter your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-qcloud-muted">
            Already have an account?{' '}
            <Link
              to="/login"
              state={{ from }}
              className="text-qcloud-primary hover:text-qcloud-secondary font-medium"
            >
              Sign in
            </Link>
          </div>
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

export default RegisterPage
