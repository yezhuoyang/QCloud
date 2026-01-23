import { LeaderboardEntry } from '../../types/competition'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  type: 'problem' | 'global'
  currentUserId?: string
  showProblemsSolved?: boolean
}

export default function Leaderboard({
  entries,
  type,
  currentUserId = 'user-anonymous',
  showProblemsSolved = false
}: LeaderboardProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full font-bold">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.5-.8L10 2z" />
          </svg>
        </span>
      )
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-200 text-slate-600 rounded-full font-bold text-sm">
          2
        </span>
      )
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-bold text-sm">
          3
        </span>
      )
    }
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 text-qcloud-muted font-medium">
        {rank}
      </span>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-qcloud-bg rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-qcloud-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-qcloud-muted">No submissions yet</p>
        <p className="text-sm text-qcloud-muted mt-1">Be the first to solve this challenge!</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-qcloud-border">
      <table className="w-full">
        <thead className="bg-qcloud-bg">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
              Score
            </th>
            {showProblemsSolved && (
              <th className="px-4 py-3 text-center text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
                Solved
              </th>
            )}
            {type === 'problem' && (
              <th className="px-4 py-3 text-center text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
                Time
              </th>
            )}
            <th className="px-4 py-3 text-center text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
              Submissions
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
              Last Submit
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-qcloud-border bg-white">
          {entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId
            return (
              <tr
                key={entry.userId}
                className={`${
                  isCurrentUser
                    ? 'bg-qcloud-primary/5 border-l-2 border-l-qcloud-primary'
                    : 'hover:bg-qcloud-bg/50'
                } transition-colors`}
              >
                <td className="px-4 py-3">
                  {getRankBadge(entry.rank)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary flex items-center justify-center text-white font-medium text-sm">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-medium ${isCurrentUser ? 'text-qcloud-primary' : 'text-qcloud-text'}`}>
                        {entry.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-qcloud-primary/10 text-qcloud-primary px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-bold text-lg ${
                    entry.rank <= 3 ? 'text-qcloud-primary' : 'text-qcloud-text'
                  }`}>
                    {entry.score}
                  </span>
                </td>
                {showProblemsSolved && (
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-qcloud-text">
                      {entry.problemsSolved}
                    </span>
                  </td>
                )}
                {type === 'problem' && entry.executionTime && (
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-sm text-qcloud-muted">
                      {formatTime(entry.executionTime)}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <span className="text-qcloud-muted">
                    {entry.totalSubmissions}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-qcloud-muted">
                    {formatDate(entry.submittedAt)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Compact leaderboard for sidebar/widget use
interface CompactLeaderboardProps {
  entries: LeaderboardEntry[]
  title?: string
  showViewAll?: boolean
  onViewAll?: () => void
}

export function CompactLeaderboard({
  entries,
  title = 'Top Solvers',
  showViewAll = true,
  onViewAll
}: CompactLeaderboardProps) {
  const topEntries = entries.slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-qcloud-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-qcloud-text">{title}</h3>
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-qcloud-primary hover:text-qcloud-secondary transition-colors"
          >
            View All
          </button>
        )}
      </div>

      <div className="space-y-3">
        {topEntries.map((entry, index) => (
          <div key={entry.userId} className="flex items-center gap-3">
            <span className={`w-6 text-center font-medium ${
              index === 0 ? 'text-yellow-500' :
              index === 1 ? 'text-slate-400' :
              index === 2 ? 'text-orange-400' :
              'text-qcloud-muted'
            }`}>
              {index + 1}
            </span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary flex items-center justify-center text-white text-xs font-medium">
              {entry.username.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 font-medium text-qcloud-text truncate">
              {entry.username}
            </span>
            <span className="font-bold text-qcloud-primary">
              {entry.score}
            </span>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-center text-sm text-qcloud-muted py-4">
          No entries yet
        </p>
      )}
    </div>
  )
}
