interface SubmitButtonProps {
  onClick: () => void
  disabled?: boolean
}

function SubmitButton({ onClick, disabled = false }: SubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-md text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-500/25"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Submit Job
    </button>
  )
}

export default SubmitButton
