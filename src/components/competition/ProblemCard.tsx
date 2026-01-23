import { Link } from 'react-router-dom'
import { CompetitionProblem, UserProblemProgress } from '../../types/competition'
import { getSolveRate } from '../../data/competitionProblems'
import DifficultyBadge from './DifficultyBadge'

interface ProblemCardProps {
  problem: CompetitionProblem
  progress?: UserProblemProgress
  onClick?: () => void
}

const categoryIcons: Record<string, string> = {
  grover: '🔍',
  shor: '🔢',
  vqe: '📊',
  qml: '🤖',
  error: '🛡️',
  optimization: '⚡',
  simulation: '🌊'
}

export default function ProblemCard({ problem, progress }: ProblemCardProps) {
  const solveRate = getSolveRate(problem)
  const statusIcon = progress?.status === 'solved'
    ? '✅'
    : progress?.status === 'attempted'
      ? '🔄'
      : null

  return (
    <Link
      to={`/competition/problem/${problem.id}`}
      className="block p-4 bg-white rounded-xl border border-qcloud-border hover:border-qcloud-primary/50 hover:shadow-lg transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryIcons[problem.category] || '📝'}</span>
          <h3 className="font-semibold text-qcloud-text group-hover:text-qcloud-primary transition-colors line-clamp-1">
            {problem.title}
          </h3>
        </div>
        {statusIcon && <span className="text-lg flex-shrink-0">{statusIcon}</span>}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <DifficultyBadge difficulty={problem.difficulty} size="small" />
        {problem.tags.slice(0, 2).map(tag => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 bg-qcloud-bg text-qcloud-muted rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-qcloud-muted">
            <span className="font-medium text-qcloud-text">{problem.solveCount}</span> solved
          </span>
          <span className="text-qcloud-muted">
            <span className={`font-medium ${
              solveRate >= 70 ? 'text-green-600' :
              solveRate >= 40 ? 'text-yellow-600' : 'text-red-600'
            }`}>{solveRate}%</span> success
          </span>
        </div>
        {problem.maxScore && (
          <span className="text-qcloud-muted">
            <span className="font-medium text-qcloud-primary">{problem.maxScore}</span> pts
          </span>
        )}
      </div>

      {/* Progress bar (if attempted) */}
      {progress && progress.bestScore > 0 && (
        <div className="mt-3 pt-3 border-t border-qcloud-border">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-qcloud-muted">Your best</span>
            <span className="font-medium text-qcloud-text">{progress.bestScore}/100</span>
          </div>
          <div className="h-1.5 bg-qcloud-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress.bestScore >= 100 ? 'bg-green-500' :
                progress.bestScore >= 60 ? 'bg-qcloud-primary' : 'bg-yellow-500'
              }`}
              style={{ width: `${progress.bestScore}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}
