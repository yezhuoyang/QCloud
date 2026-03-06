import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import DifficultyBadge from '../components/competition/DifficultyBadge'
import CategoryCard from '../components/competition/CategoryCard'
import ProblemCard from '../components/competition/ProblemCard'
import { useAuth } from '../contexts/AuthContext'
import AuthHeader from '../components/AuthHeader'
import {
  COMPETITION_CATEGORIES,
  COMPETITION_PROBLEMS,
  getProblemsStats
} from '../data/competitionProblems'
import { problemsApi, type ProblemCategoryWithProblems, type ProblemSummary } from '../utils/api'
import {
  ProblemCategory,
  ProblemDifficulty,
  UserProblemProgress,
  CompetitionCategory,
  CompetitionProblem
} from '../types/competition'

type SortOption = 'newest' | 'popular' | 'difficulty' | 'solve_rate'

// Convert API category to local type
function convertApiCategory(apiCat: ProblemCategoryWithProblems): CompetitionCategory {
  // Strip "problem-" prefix for local id
  const localId = apiCat.id.replace('problem-', '') as ProblemCategory
  return {
    id: localId,
    name: apiCat.name,
    description: apiCat.description || '',
    icon: apiCat.icon,
    color: apiCat.color,
    problemCount: apiCat.problems.length
  }
}

// Convert API problem to local type
function convertApiProblem(apiProblem: ProblemSummary): CompetitionProblem {
  // Strip "problem-" prefix from category for local type
  const localCategory = apiProblem.category.replace('problem-', '') as ProblemCategory
  return {
    id: apiProblem.id,
    title: apiProblem.title,
    description: apiProblem.description,
    category: localCategory,
    difficulty: apiProblem.difficulty as ProblemDifficulty,
    constraints: {
      maxQubits: apiProblem.constraints.maxQubits,
      maxGateCount: apiProblem.constraints.maxGateCount,
      maxCircuitDepth: apiProblem.constraints.maxCircuitDepth
    },
    fidelityRequirement: {
      minFidelity: apiProblem.fidelityRequirement.minFidelity,
      targetFidelity: apiProblem.fidelityRequirement.targetFidelity,
      metric: apiProblem.fidelityRequirement.metric as 'state_fidelity' | 'process_fidelity' | 'success_probability'
    },
    testCases: [],
    hints: [],
    author: 'QuantumArena',
    maxScore: apiProblem.maxScore,
    timeBonus: apiProblem.timeBonus,
    solveCount: apiProblem.solveCount,
    attemptCount: apiProblem.attemptCount,
    tags: apiProblem.tags,
    createdAt: apiProblem.createdAt || new Date().toISOString()
  }
}

function CompetitionListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.is_admin ?? false
  const [selectedCategory, setSelectedCategory] = useState<ProblemCategory | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<ProblemDifficulty | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [userProgress, setUserProgress] = useState<Record<string, UserProblemProgress>>({})

  // State for API data
  const [categories, setCategories] = useState<CompetitionCategory[]>(COMPETITION_CATEGORIES)
  const [problems, setProblems] = useState<CompetitionProblem[]>(COMPETITION_PROBLEMS)
  const [isLoading, setIsLoading] = useState(true)
  const [usingStaticData, setUsingStaticData] = useState(false)

  // Load user progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('qcloud-competition-progress')
    if (saved) {
      try {
        setUserProgress(JSON.parse(saved))
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [])

  // Fetch data from API
  useEffect(() => {
    async function fetchData() {
      try {
        const groupedData = await problemsApi.getProblemsGrouped()

        // Convert API data to local types
        const apiCategories = groupedData.map(convertApiCategory)
        const apiProblems: CompetitionProblem[] = []

        for (const cat of groupedData) {
          for (const problem of cat.problems) {
            apiProblems.push(convertApiProblem(problem))
          }
        }

        if (apiCategories.length > 0) {
          setCategories(apiCategories)
          setProblems(apiProblems)
          setUsingStaticData(false)
        } else {
          // API returned empty, use static data
          setUsingStaticData(true)
        }
      } catch (error) {
        console.error('Failed to fetch problems from API, using static data:', error)
        setUsingStaticData(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate stats from current data
  const stats = usingStaticData ? getProblemsStats() : {
    totalProblems: problems.length,
    byDifficulty: {
      Easy: problems.filter(p => p.difficulty === 'Easy').length,
      Medium: problems.filter(p => p.difficulty === 'Medium').length,
      Hard: problems.filter(p => p.difficulty === 'Hard').length,
      Expert: problems.filter(p => p.difficulty === 'Expert').length
    }
  }

  // Filter problems
  let filteredProblems = [...problems]

  if (selectedCategory) {
    filteredProblems = filteredProblems.filter(p => p.category === selectedCategory)
  }

  if (selectedDifficulty) {
    filteredProblems = filteredProblems.filter(p => p.difficulty === selectedDifficulty)
  }

  // Sort problems
  const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3, Expert: 4 }

  switch (sortBy) {
    case 'newest':
      filteredProblems.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      break
    case 'popular':
      filteredProblems.sort((a, b) => b.attemptCount - a.attemptCount)
      break
    case 'difficulty':
      filteredProblems.sort((a, b) =>
        difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
      )
      break
    case 'solve_rate':
      filteredProblems.sort((a, b) => {
        const rateA = a.attemptCount > 0 ? a.solveCount / a.attemptCount : 0
        const rateB = b.attemptCount > 0 ? b.solveCount / b.attemptCount : 0
        return rateB - rateA
      })
      break
  }

  const handleProblemClick = (problemId: string) => {
    navigate(`/competition/problem/${problemId}`)
  }

  const solvedCount = Object.values(userProgress).filter(p => p.status === 'solved').length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-qcloud-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-qcloud-muted">Loading challenges...</p>
        </div>
      </div>
    )
  }

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
            className="px-4 py-2 text-sm text-qcloud-primary font-medium"
          >
            Challenges
          </Link>
          <Link
            to="/applications"
            className="px-4 py-2 text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Examples
          </Link>
          <AuthHeader />
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
            Quantum Challenges
          </h1>
          <p className="text-qcloud-muted mt-3 max-w-2xl mx-auto">
            Test your quantum programming skills with real-world quantum algorithm challenges.
            Compete for the best fidelity and resource efficiency!
          </p>

          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-qcloud-primary">{stats.totalProblems}</div>
              <div className="text-sm text-qcloud-muted">Problems</div>
            </div>
            <div className="w-px h-10 bg-qcloud-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{solvedCount}</div>
              <div className="text-sm text-qcloud-muted">Solved</div>
            </div>
            <div className="w-px h-10 bg-qcloud-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-qcloud-secondary">
                {categories.length}
              </div>
              <div className="text-sm text-qcloud-muted">Categories</div>
            </div>
            <div className="w-px h-10 bg-qcloud-border" />
            <Link
              to="/competition/leaderboard"
              className="text-center hover:text-qcloud-primary transition-colors"
            >
              <div className="text-2xl font-bold text-amber-500">
                <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.5-.8L10 2z" />
                </svg>
              </div>
              <div className="text-sm text-qcloud-muted">Leaderboard</div>
            </Link>
          </div>
        </div>

        {/* Admin Banner */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <div className="font-medium text-purple-800">
                  Admin Mode
                  {usingStaticData && (
                    <span className="ml-2 text-sm font-normal text-purple-600">
                      (using static data - run seed script)
                    </span>
                  )}
                </div>
                <div className="text-sm text-purple-600">You can manage problems and categories</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/problems/new"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                + New Problem
              </Link>
              <Link
                to="/admin/categories/new"
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                + New Category
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

        {/* Category Cards */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-qcloud-text">Categories</h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-qcloud-primary hover:text-qcloud-secondary transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map(category => (
              <div key={category.id} className="relative group">
                <CategoryCard
                  category={category}
                  isSelected={selectedCategory === category.id}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )
                  }
                />
                {isAdmin && (
                  <Link
                    to={`/admin/categories/problem-${category.id}`}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg shadow-sm border border-qcloud-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                    onClick={e => e.stopPropagation()}
                    title="Edit category"
                  >
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Filters and Sort */}
        <section className="mb-6">
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-qcloud-border">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-qcloud-muted">Difficulty:</span>
              <div className="flex gap-1">
                {(['Easy', 'Medium', 'Hard', 'Expert'] as ProblemDifficulty[]).map(diff => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(
                      selectedDifficulty === diff ? null : diff
                    )}
                    className={`transition-opacity ${
                      selectedDifficulty && selectedDifficulty !== diff
                        ? 'opacity-40 hover:opacity-70'
                        : ''
                    }`}
                  >
                    <DifficultyBadge difficulty={diff} size="small" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1" />

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-qcloud-muted">Sort by:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 border border-qcloud-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qcloud-primary"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="difficulty">Difficulty</option>
                <option value="solve_rate">Solve Rate</option>
              </select>
            </div>

            {/* Results count */}
            <div className="text-sm text-qcloud-muted">
              {filteredProblems.length} problem{filteredProblems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </section>

        {/* Problems Grid */}
        <section>
          {filteredProblems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-qcloud-border">
              <div className="w-16 h-16 mx-auto mb-4 bg-qcloud-bg rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-qcloud-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-qcloud-muted">No problems match your filters</p>
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setSelectedDifficulty(null)
                }}
                className="mt-4 text-qcloud-primary hover:text-qcloud-secondary transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProblems.map(problem => (
                <div key={problem.id} className="relative group">
                  <ProblemCard
                    problem={problem}
                    progress={userProgress[problem.id]}
                    onClick={() => handleProblemClick(problem.id)}
                  />
                  {isAdmin && (
                    <Link
                      to={`/admin/problems/${problem.id}`}
                      className="absolute top-3 right-3 p-2 bg-white/95 rounded-lg shadow-sm border border-qcloud-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50 z-10"
                      onClick={e => e.stopPropagation()}
                      title="Edit problem"
                    >
                      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Stats by Difficulty */}
        <section className="mt-12 p-6 bg-white rounded-xl border border-qcloud-border shadow-sm">
          <h3 className="font-semibold text-qcloud-text mb-4">Problems by Difficulty</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <DifficultyBadge difficulty="Easy" />
                <span className="text-2xl font-bold text-green-600">{stats.byDifficulty.Easy}</span>
              </div>
              <div className="text-xs text-green-600">Beginner friendly</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center justify-between mb-2">
                <DifficultyBadge difficulty="Medium" />
                <span className="text-2xl font-bold text-yellow-600">{stats.byDifficulty.Medium}</span>
              </div>
              <div className="text-xs text-yellow-600">Some experience needed</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <DifficultyBadge difficulty="Hard" />
                <span className="text-2xl font-bold text-orange-600">{stats.byDifficulty.Hard}</span>
              </div>
              <div className="text-xs text-orange-600">Advanced concepts</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <DifficultyBadge difficulty="Expert" />
                <span className="text-2xl font-bold text-red-600">{stats.byDifficulty.Expert}</span>
              </div>
              <div className="text-xs text-red-600">Research level</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default CompetitionListPage
