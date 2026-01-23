import { CompetitionCategory } from '../../types/competition'

interface CategoryCardProps {
  category: CompetitionCategory
  isSelected?: boolean
  onClick?: () => void
}

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' }
}

export default function CategoryCard({ category, isSelected, onClick }: CategoryCardProps) {
  const colors = colorClasses[category.color] || colorClasses.blue

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 transition-all text-left ${
        isSelected
          ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-qcloud-primary`
          : 'bg-white border-qcloud-border hover:border-qcloud-primary/50 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{category.icon}</span>
        <span className={`font-semibold ${isSelected ? colors.text : 'text-qcloud-text'}`}>
          {category.name}
        </span>
      </div>
      <p className="text-sm text-qcloud-muted line-clamp-2">
        {category.description}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-sm font-medium ${colors.text}`}>
          {category.problemCount} problem{category.problemCount !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  )
}
