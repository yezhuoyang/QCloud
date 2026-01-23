import { ProblemDifficulty, DIFFICULTY_COLORS } from '../../types/competition'

interface DifficultyBadgeProps {
  difficulty: ProblemDifficulty
  size?: 'small' | 'medium' | 'large'
}

export default function DifficultyBadge({ difficulty, size = 'medium' }: DifficultyBadgeProps) {
  const colors = DIFFICULTY_COLORS[difficulty]

  const sizeClasses = {
    small: 'text-xs px-1.5 py-0.5',
    medium: 'text-xs px-2 py-1',
    large: 'text-sm px-3 py-1.5'
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]}`}
    >
      {difficulty}
    </span>
  )
}
