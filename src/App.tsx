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
import HomeworkPage from './pages/HomeworkPage'
import HomeworkResultPage from './pages/HomeworkResultPage'
import HomeworkLeaderboardPage from './pages/HomeworkLeaderboardPage'
import HomeworkMethodsPage from './pages/HomeworkMethodsPage'
import AdminHomeworkPage from './pages/AdminHomeworkPage'
import HardwareRankingPage from './pages/HardwareRankingPage'
import HomeworkQueuePage from './pages/HomeworkQueuePage'
import HomeworkJobHistoryPage from './pages/HomeworkJobHistoryPage'
import ChallengePage from './pages/ChallengePage'
import ChallengeResultPage from './pages/ChallengeResultPage'
import ChallengeLeaderboardPage from './pages/ChallengeLeaderboardPage'
import ChallengeQueuePage from './pages/ChallengeQueuePage'
import ChallengeJobHistoryPage from './pages/ChallengeJobHistoryPage'
import AdminChallengePage from './pages/AdminChallengePage'

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
        <Route path="/homework/:homeworkId" element={<HomeworkPage />} />
        <Route path="/homework/:homeworkId/results/:submissionId" element={<HomeworkResultPage />} />
        <Route path="/homework/:homeworkId/leaderboard" element={<HomeworkLeaderboardPage />} />
        <Route path="/homework/:homeworkId/hardware-ranking" element={<HardwareRankingPage />} />
        <Route path="/homework/:homeworkId/methods" element={<HomeworkMethodsPage />} />
        <Route path="/homework/:homeworkId/queue" element={<HomeworkQueuePage />} />
        <Route path="/homework/:homeworkId/job-history" element={<HomeworkJobHistoryPage />} />
        <Route path="/admin/homework" element={<AdminHomeworkPage />} />
        <Route path="/admin/homework/:homeworkId" element={<AdminHomeworkPage />} />
        <Route path="/challenge/:challengeId" element={<ChallengePage />} />
        <Route path="/challenge/:challengeId/results/:submissionId" element={<ChallengeResultPage />} />
        <Route path="/challenge/:challengeId/leaderboard" element={<ChallengeLeaderboardPage />} />
        <Route path="/challenge/:challengeId/queue" element={<ChallengeQueuePage />} />
        <Route path="/challenge/:challengeId/job-history" element={<ChallengeJobHistoryPage />} />
        <Route path="/admin/challenges" element={<AdminChallengePage />} />
        <Route path="/admin/challenges/:challengeId" element={<AdminChallengePage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
