import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import EditorPage from './pages/EditorPage'
import ResultsPage from './pages/ResultsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import CircuitComposerPage from './pages/CircuitComposerPage'
import CompetitionListPage from './pages/CompetitionListPage'
import CompetitionProblemPage from './pages/CompetitionProblemPage'
import CompetitionResultPage from './pages/CompetitionResultPage'
import LeaderboardPage from './pages/LeaderboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import AdminProblemEditorPage from './pages/AdminProblemEditorPage'
import AdminCategoryEditorPage from './pages/AdminCategoryEditorPage'
import AdminExampleEditorPage from './pages/AdminExampleEditorPage'
import HardwarePage from './pages/HardwarePage'
import HardwareDetailPage from './pages/HardwareDetailPage'
import HardwareLeaderboardPage from './pages/HardwareLeaderboardPage'
import JobHistoryPage from './pages/JobHistoryPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/composer" element={<CircuitComposerPage />} />
        <Route path="/competition" element={<CompetitionListPage />} />
        <Route path="/competition/problem/:problemId" element={<CompetitionProblemPage />} />
        <Route path="/competition/results/:submissionId" element={<CompetitionResultPage />} />
        <Route path="/competition/leaderboard" element={<LeaderboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/problems/:problemId" element={<AdminProblemEditorPage />} />
        <Route path="/admin/categories/:categoryId" element={<AdminCategoryEditorPage />} />
        <Route path="/admin/examples/:exampleId" element={<AdminExampleEditorPage />} />
        <Route path="/hardware" element={<HardwarePage />} />
        <Route path="/hardware/leaderboard" element={<HardwareLeaderboardPage />} />
        <Route path="/hardware/:hardwareId" element={<HardwareDetailPage />} />
        <Route path="/jobs" element={<JobHistoryPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
