import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import AuthHeader from '../components/AuthHeader'
import { examplesApi, type ExampleCategoryWithExamples } from '../utils/api'
// Fallback to static data if API fails
import { QUANTUM_APPLICATIONS, type Category as StaticCategory, type Example as StaticExample } from '../utils/exampleCodes'

interface CategoryCardProps {
  category: { id: string; name: string; description: string | null; icon: string; exampleCount?: number; examples?: unknown[] }
  isSelected: boolean
  onClick: () => void
}

function CategoryCard({ category, isSelected, onClick }: CategoryCardProps) {
  const count = category.exampleCount ?? (category.examples as unknown[])?.length ?? 0
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all ${
        isSelected
          ? 'bg-qcloud-primary/10 border-qcloud-primary'
          : 'bg-white border-qcloud-border hover:border-qcloud-primary/50 shadow-sm'
      }`}
    >
      <div className="text-3xl mb-2">{category.icon}</div>
      <h3 className="font-semibold text-lg text-qcloud-text">{category.name}</h3>
      <p className="text-sm text-qcloud-muted mt-1">{category.description}</p>
      <div className="mt-2 text-xs text-qcloud-muted">
        {count} examples
      </div>
    </button>
  )
}

interface ExampleCardProps {
  example: { id: string; title: string; description: string | null; difficulty: string }
  categoryIcon: string
  onClick: () => void
  isAdmin?: boolean
}

function ExampleCard({ example, categoryIcon, onClick, isAdmin }: ExampleCardProps) {
  const difficultyColors: Record<string, string> = {
    Beginner: 'bg-green-100 text-green-700 border-green-200',
    Intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Advanced: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full p-4 rounded-xl bg-white border border-qcloud-border hover:border-qcloud-primary hover:shadow-md transition-all text-left shadow-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{categoryIcon}</span>
            <h4 className="font-semibold text-qcloud-text group-hover:text-qcloud-primary transition-colors">
              {example.title}
            </h4>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs border ${difficultyColors[example.difficulty] || difficultyColors.Beginner}`}
          >
            {example.difficulty}
          </span>
        </div>
        <p className="text-sm text-qcloud-muted mt-2">{example.description}</p>
        <div className="mt-3 flex items-center gap-2 text-qcloud-primary text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Open in Editor</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </button>
      {isAdmin && (
        <Link
          to={`/admin/examples/${example.id}`}
          className="absolute top-3 right-3 p-2 bg-white/95 rounded-lg shadow-sm border border-qcloud-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50 z-10"
          onClick={e => e.stopPropagation()}
          title="Edit example"
        >
          <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Link>
      )}
    </div>
  )
}

// Adapter to convert API data to unified format
interface UnifiedCategory {
  id: string
  name: string
  description: string | null
  icon: string
  examples: UnifiedExample[]
}

interface UnifiedExample {
  id: string
  title: string
  description: string | null
  difficulty: string
  code: string
}

function convertApiData(data: ExampleCategoryWithExamples[]): UnifiedCategory[] {
  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    examples: cat.examples.map(ex => ({
      id: ex.id,
      title: ex.title,
      description: ex.description,
      difficulty: ex.difficulty,
      code: ex.code,
    }))
  }))
}

function convertStaticData(data: StaticCategory[]): UnifiedCategory[] {
  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    examples: cat.examples.map((ex: StaticExample) => ({
      id: ex.id,
      title: ex.name,
      description: ex.description,
      difficulty: ex.difficulty,
      code: ex.code,
    }))
  }))
}

function ApplicationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<UnifiedCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.is_admin ?? false

  // Fetch examples from API
  useEffect(() => {
    const fetchExamples = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await examplesApi.getExamplesGrouped()
        if (data && data.length > 0) {
          setCategories(convertApiData(data))
          setUsingFallback(false)
        } else {
          // Use static data as fallback
          setCategories(convertStaticData(QUANTUM_APPLICATIONS))
          setUsingFallback(true)
        }
      } catch {
        // Use static data as fallback on error
        setCategories(convertStaticData(QUANTUM_APPLICATIONS))
        setUsingFallback(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExamples()
  }, [])

  const selectedCategoryData = categories.find(
    (cat) => cat.id === selectedCategory
  )

  const handleExampleClick = (example: UnifiedExample) => {
    navigate('/editor', { state: { code: example.code, name: example.title } })
  }

  const totalExamples = categories.reduce((acc, cat) => acc + cat.examples.length, 0)
  const beginnerCount = categories.reduce(
    (acc, cat) => acc + cat.examples.filter((e) => e.difficulty === 'Beginner').length,
    0
  )
  const advancedCount = categories.reduce(
    (acc, cat) => acc + cat.examples.filter((e) => e.difficulty === 'Advanced').length,
    0
  )

  return (
    <div className="min-h-screen bg-qcloud-bg">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
            <span className="font-semibold text-lg text-qcloud-text">QuantumArena</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            to="/editor"
            className="px-4 py-2 text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Editor
          </Link>
          <Link
            to="/composer"
            className="px-4 py-2 text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Circuit Composer
          </Link>
          <Link
            to="/competition"
            className="px-4 py-2 text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Challenges
          </Link>
          <Link
            to="/applications"
            className="px-4 py-2 text-sm text-qcloud-primary font-medium"
          >
            Examples
          </Link>
          <AuthHeader />
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Admin Banner */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <div className="font-medium text-purple-800">Admin Mode</div>
                <div className="text-sm text-purple-600">You can manage examples{usingFallback ? ' (using static data - run seed script)' : ''}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/examples/new"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                + New Example
              </Link>
              <Link
                to="/admin"
                className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
            Quantum Applications
          </h1>
          <p className="text-qcloud-muted mt-3 max-w-2xl mx-auto">
            Explore ready-to-run quantum algorithms. Select a category to browse examples,
            then click on any example to open it in the editor.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qcloud-primary"></div>
            <span className="ml-3 text-qcloud-muted">Loading examples...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Categories Grid */}
        {!isLoading && (
          <>
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-qcloud-text">
                <span>Algorithm Categories</span>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-sm text-qcloud-muted hover:text-qcloud-primary ml-2"
                  >
                    (Clear selection)
                  </button>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    isSelected={selectedCategory === category.id}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === category.id ? null : category.id
                      )
                    }
                  />
                ))}
              </div>
            </section>

            {/* Examples Section */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-qcloud-text">
                {selectedCategoryData
                  ? `${selectedCategoryData.icon} ${selectedCategoryData.name} Examples`
                  : 'All Examples'}
              </h2>

              {selectedCategoryData ? (
                /* Show examples for selected category */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCategoryData.examples.map((example) => (
                    <ExampleCard
                      key={example.id}
                      example={example}
                      categoryIcon={selectedCategoryData.icon}
                      onClick={() => handleExampleClick(example)}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              ) : (
                /* Show all examples grouped by category */
                <div className="space-y-8">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2 text-qcloud-text">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                        <span className="text-sm text-qcloud-muted">
                          ({category.examples.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.examples.map((example) => (
                          <ExampleCard
                            key={example.id}
                            example={example}
                            categoryIcon={category.icon}
                            onClick={() => handleExampleClick(example)}
                            isAdmin={isAdmin}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Stats */}
            <section className="mt-12 p-6 bg-white rounded-xl border border-qcloud-border shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-qcloud-primary">
                    {categories.length}
                  </div>
                  <div className="text-sm text-qcloud-muted">Categories</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-qcloud-secondary">
                    {totalExamples}
                  </div>
                  <div className="text-sm text-qcloud-muted">Examples</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-500">
                    {beginnerCount}
                  </div>
                  <div className="text-sm text-qcloud-muted">Beginner</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-500">
                    {advancedCount}
                  </div>
                  <div className="text-sm text-qcloud-muted">Advanced</div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default ApplicationsPage
