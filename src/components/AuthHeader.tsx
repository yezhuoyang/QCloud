import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface AuthHeaderProps {
  className?: string
}

function AuthHeader({ className = '' }: AuthHeaderProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-qcloud-border animate-pulse" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Link
          to="/login"
          className="px-4 py-2 text-qcloud-text hover:text-qcloud-primary font-medium transition-colors"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="px-4 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
        >
          Sign Up
        </Link>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary flex items-center justify-center text-white font-medium">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <span className="text-qcloud-text font-medium hidden sm:block">
          {user.username}
        </span>
        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-qcloud-muted transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-qcloud-border py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-qcloud-border">
            <div className="font-medium text-qcloud-text">{user.username}</div>
            <div className="text-sm text-qcloud-muted truncate">{user.email}</div>
            {user.stats && (
              <div className="flex items-center gap-3 mt-2 text-xs text-qcloud-muted">
                <span>{user.stats.total_score} pts</span>
                <span>•</span>
                <span>Rank #{user.stats.global_rank || '-'}</span>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              to="/profile"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-qcloud-text hover:bg-qcloud-bg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </Link>
            <Link
              to="/competition"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-qcloud-text hover:bg-qcloud-bg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Competitions
            </Link>
            <Link
              to="/editor"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-qcloud-text hover:bg-qcloud-bg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Code Editor
            </Link>
            {user.is_admin && (
              <Link
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin Dashboard
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-qcloud-border pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuthHeader
