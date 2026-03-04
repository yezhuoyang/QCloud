import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import HardwareTopology from '../components/HardwareTopology'
import { homeworkApi, type HardwareRanking, type HardwareRankingEntryType } from '../utils/api'
import { getCalibrationData } from '../data/hardwareCalibrationData'
import { findProviderByBackend } from '../data/hardwareProviders'

function HardwareRankingPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>()
  const [ranking, setRanking] = useState<HardwareRanking | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBackend, setSelectedBackend] = useState<string | null>(null)

  useEffect(() => {
    if (!homeworkId) return
    async function fetchRanking() {
      try {
        const data = await homeworkApi.getHardwareRanking(homeworkId!)
        setRanking(data)
        if (data.rankings.length > 0) {
          setSelectedBackend(data.rankings[0].backend_name)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load hardware ranking')
      } finally {
        setIsLoading(false)
      }
    }
    fetchRanking()
  }, [homeworkId])

  const selectedEntry = useMemo(() => {
    if (!ranking || !selectedBackend) return null
    return ranking.rankings.find(r => r.backend_name === selectedBackend) || null
  }, [ranking, selectedBackend])

  const selectedCalib = useMemo(() => {
    if (!selectedBackend) return null
    return getCalibrationData(selectedBackend) || null
  }, [selectedBackend])

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="small" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-qcloud-text">
              {ranking?.homework_title || 'Homework'} - Hardware Ranking
            </h1>
            <p className="text-sm text-qcloud-muted">
              Ranked by average fidelity across all student submissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/homework/${homeworkId}/leaderboard`}
            className="px-4 py-2 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Student Leaderboard
          </Link>
          <Link
            to={`/homework/${homeworkId}`}
            className="px-4 py-2 text-sm bg-qcloud-primary/10 text-qcloud-primary rounded-lg hover:bg-qcloud-primary/20 transition-colors"
          >
            Back to Homework
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        {ranking && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
              <div className="text-2xl font-bold text-qcloud-primary">
                {ranking.rankings.length}
              </div>
              <div className="text-sm text-qcloud-muted">Backends Used</div>
            </div>
            <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">
                {ranking.total_completed_jobs}
              </div>
              <div className="text-sm text-qcloud-muted">Completed Jobs</div>
            </div>
            <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {ranking.rankings.length > 0
                  ? `${(ranking.rankings[0].avg_fidelity_after * 100).toFixed(1)}%`
                  : '—'}
              </div>
              <div className="text-sm text-qcloud-muted">Best Avg Fidelity</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking Table */}
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
            <div className="px-4 py-3 border-b border-qcloud-border bg-gray-50">
              <h2 className="font-semibold text-qcloud-text">Hardware Performance Ranking</h2>
              <p className="text-xs text-qcloud-muted mt-0.5">Click a row to view its topology</p>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-16 text-red-500">{error}</div>
            ) : ranking && ranking.rankings.length === 0 ? (
              <div className="text-center py-16 text-qcloud-muted">
                <p className="text-lg mb-2">No completed jobs yet</p>
                <p className="text-sm">Submit jobs to different backends to see rankings.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-qcloud-border text-left text-xs text-qcloud-muted">
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2">Backend</th>
                      <th className="px-3 py-2 text-right">Avg Fidelity</th>
                      <th className="px-3 py-2 text-right">Best</th>
                      <th className="px-3 py-2 text-right">Avg Ref</th>
                      <th className="px-3 py-2 text-right">Jobs</th>
                      <th className="px-3 py-2 text-right">Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking?.rankings.map((entry: HardwareRankingEntryType) => {
                      const provider = findProviderByBackend(entry.backend_name)
                      const isSelected = entry.backend_name === selectedBackend
                      return (
                        <tr
                          key={entry.backend_name}
                          className={`border-b border-qcloud-border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-l-2 border-l-blue-500'
                              : 'hover:bg-qcloud-bg/30'
                          }`}
                          onClick={() => setSelectedBackend(entry.backend_name)}
                        >
                          <td className="px-3 py-3">
                            <span className={`font-bold ${
                              entry.rank === 1 ? 'text-yellow-500 text-base' :
                              entry.rank === 2 ? 'text-gray-400 text-base' :
                              entry.rank === 3 ? 'text-orange-400 text-base' :
                              'text-qcloud-muted text-sm'
                            }`}>
                              {entry.rank <= 3
                                ? ['', '\u{1F947}', '\u{1F948}', '\u{1F949}'][entry.rank]
                                : entry.rank}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div>
                              <span className="text-sm font-medium text-qcloud-text">
                                {provider?.name || entry.backend_name}
                              </span>
                              {provider && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-qcloud-muted">
                                    {provider.qubits}q {provider.type.replace('_', ' ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="font-semibold text-qcloud-primary">
                              {(entry.avg_fidelity_after * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-green-600 font-medium">
                            {(entry.best_fidelity_after * 100).toFixed(2)}%
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-qcloud-muted">
                            {(entry.avg_fidelity_before * 100).toFixed(2)}%
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-qcloud-muted">
                            {entry.total_jobs}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-qcloud-muted">
                            {entry.unique_students}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Hardware Topology + Details Panel */}
          <div className="space-y-4">
            {/* Topology Visualization */}
            {selectedCalib && (
              <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
                <div className="px-4 py-3 border-b border-qcloud-border bg-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-qcloud-text">
                      {findProviderByBackend(selectedBackend!)?.name || selectedBackend} Topology
                    </h2>
                    <p className="text-xs text-qcloud-muted mt-0.5">
                      {selectedCalib.numQubits} qubits, {selectedCalib.edges.length} connections
                    </p>
                  </div>
                  {findProviderByBackend(selectedBackend!)?.docsUrl && (
                    <a
                      href={findProviderByBackend(selectedBackend!)!.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      IBM Quantum
                    </a>
                  )}
                </div>
                <div className="p-2">
                  <HardwareTopology
                    data={selectedCalib}
                    width={560}
                    height={350}
                  />
                </div>
              </div>
            )}

            {/* Selected Backend Stats */}
            {selectedEntry && (
              <div className="bg-white rounded-xl border border-qcloud-border p-4">
                <h3 className="font-semibold text-qcloud-text mb-3">
                  {findProviderByBackend(selectedEntry.backend_name)?.name || selectedEntry.backend_name} — Detailed Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Avg Fidelity (Student)"
                    value={`${(selectedEntry.avg_fidelity_after * 100).toFixed(3)}%`}
                    color="text-qcloud-primary"
                  />
                  <StatCard
                    label="Avg Fidelity (Reference)"
                    value={`${(selectedEntry.avg_fidelity_before * 100).toFixed(3)}%`}
                    color="text-qcloud-muted"
                  />
                  <StatCard
                    label="Avg Improvement"
                    value={`${selectedEntry.avg_fidelity_improvement > 0 ? '+' : ''}${(selectedEntry.avg_fidelity_improvement * 100).toFixed(3)}%`}
                    color={selectedEntry.avg_fidelity_improvement > 0 ? 'text-green-600' : 'text-red-500'}
                  />
                  <StatCard
                    label="Best Fidelity"
                    value={`${(selectedEntry.best_fidelity_after * 100).toFixed(3)}%`}
                    color="text-green-600"
                  />
                  <StatCard
                    label="Worst Fidelity"
                    value={`${(selectedEntry.worst_fidelity_after * 100).toFixed(3)}%`}
                    color="text-red-500"
                  />
                  <StatCard
                    label="Total Completed Jobs"
                    value={String(selectedEntry.total_jobs)}
                    color="text-amber-600"
                  />
                  <StatCard
                    label="Unique Students"
                    value={String(selectedEntry.unique_students)}
                    color="text-purple-600"
                  />
                  {selectedEntry.avg_success_probability != null && (
                    <StatCard
                      label="Avg Success Probability"
                      value={`${(selectedEntry.avg_success_probability * 100).toFixed(2)}%`}
                      color="text-teal-600"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-qcloud-muted mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

export default HardwareRankingPage
