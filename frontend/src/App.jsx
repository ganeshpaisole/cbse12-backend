import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import QuizGenerator from './pages/QuizGenerator'
import PaperGenerator from './pages/PaperGenerator'
import AdminDashboard from './pages/AdminDashboard'
import Layout from './components/Layout'

function ProtectedRoute({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/login" replace />
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />
      <Route path="/teacher" element={
        <ProtectedRoute role="teacher">
          <Layout><TeacherDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/quiz" element={
        <ProtectedRoute role="teacher">
          <Layout><QuizGenerator /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/paper" element={
        <ProtectedRoute role="teacher">
          <Layout><PaperGenerator /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/student" element={
        <ProtectedRoute role="student">
          <Layout><StudentDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute role="admin">
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
