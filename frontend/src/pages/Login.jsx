import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { GraduationCap, BookOpen, Eye, EyeOff, Zap, ArrowRight, Loader2, AlertCircle, Shield } from 'lucide-react'

export default function Login() {
  const [role, setRole] = useState(null) // 'teacher' | 'student' | 'admin'
  const [form, setForm] = useState({ teacherCode: '', password: '', studentCode: '', studentName: '' })
  const [useNameLogin, setUseNameLogin] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (role === 'admin') {
        await api.adminLogin(form.password)
        login({ role: 'admin', name: 'Administrator', adminSecret: form.password })
        navigate('/admin')
      } else if (role === 'teacher') {
        const data = await api.teacherLogin(form.teacherCode.trim().toUpperCase(), form.password)
        login({
          role: 'teacher',
          name: data.name,
          teacherCode: data.teacherCode,
          teacherKey: data.teacherKey,
          subjects: data.subjects,
          examMode: data.examMode,
          studentCount: data.studentCount,
        })
        navigate('/teacher')
      } else {
        const identifier = useNameLogin ? form.studentName.trim() : form.studentCode.trim().toUpperCase()
        const data = await api.studentLogin(
          form.teacherCode.trim().toUpperCase(),
          identifier,
          form.password,
          useNameLogin
        )
        login({
          role: 'student',
          name: data.studentName,
          teacherCode: data.teacherCode,
          studentCode: data.studentCode,
          teacherName: data.teacherName,
          subjects: data.subjects,
          examMode: data.examMode,
        })
        navigate('/student')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg bg-mesh flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 mb-4 shadow-glow-purple">
            <Zap size={24} className="text-primary-light" />
          </div>
          <h1 className="text-2xl font-bold text-white">EduPulse</h1>
          <p className="text-muted text-sm mt-1">AI-Powered Exam Preparation</p>
        </div>

        {!role ? (
          /* Role selection */
          <div className="space-y-3">
            <p className="text-center text-muted text-sm mb-5">Sign in as</p>
            <button onClick={() => setRole('teacher')}
              className="glass-card-hover w-full p-5 text-left group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 group-hover:shadow-glow-purple transition-all">
                  <GraduationCap size={22} className="text-primary-light" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Teacher</p>
                  <p className="text-sm text-muted">Manage students, generate quizzes, track progress</p>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:text-primary-light transition-colors" />
              </div>
            </button>

            <button onClick={() => setRole('student')}
              className="glass-card-hover w-full p-5 text-left group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 group-hover:shadow-glow-cyan transition-all">
                  <BookOpen size={22} className="text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Student</p>
                  <p className="text-sm text-muted">Track your scores, attempt quizzes, view KPIs</p>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:text-accent transition-colors" />
              </div>
            </button>

            <button onClick={() => setRole('admin')}
              className="glass-card-hover w-full p-4 text-left group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0 group-hover:bg-warning/20 transition-all">
                  <Shield size={20} className="text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Admin</p>
                  <p className="text-sm text-muted">Platform management, teacher accounts</p>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:text-warning transition-colors" />
              </div>
            </button>
          </div>
        ) : (
          /* Login form */
          <div className="glass-card p-7">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setRole(null); setError('') }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-all">
                <ArrowRight size={16} className="rotate-180" />
              </button>
              <div className="flex items-center gap-2">
                {role === 'teacher' && <GraduationCap size={18} className="text-primary-light" />}
                {role === 'student' && <BookOpen size={18} className="text-accent" />}
                {role === 'admin' && <Shield size={18} className="text-warning" />}
                <h2 className="font-semibold text-white capitalize">{role} Login</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {role !== 'admin' && (
                <div>
                  <label className="label">Teacher Code</label>
                  <input
                    value={form.teacherCode}
                    onChange={e => set('teacherCode', e.target.value)}
                    placeholder="e.g. TCH001"
                    className="input-field font-mono tracking-widest uppercase"
                    required autoFocus
                  />
                </div>
              )}

              {role === 'student' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">{useNameLogin ? 'Your Name' : 'Student Code'}</label>
                    <button
                      type="button"
                      onClick={() => { setUseNameLogin(v => !v); setError('') }}
                      className="text-xs text-primary-light hover:underline">
                      {useNameLogin ? 'Use student code instead' : "Don't know your code? Use name"}
                    </button>
                  </div>
                  {useNameLogin ? (
                    <input
                      key="name"
                      value={form.studentName}
                      onChange={e => set('studentName', e.target.value)}
                      placeholder="Enter your full name (as registered)"
                      className="input-field"
                      required
                      autoFocus
                    />
                  ) : (
                    <input
                      key="code"
                      value={form.studentCode}
                      onChange={e => set('studentCode', e.target.value)}
                      placeholder="e.g. AB3C"
                      className="input-field font-mono tracking-widest uppercase"
                      required
                      autoFocus
                    />
                  )}
                </div>
              )}

              <div>
                <label className="label">{role === 'student' ? 'PIN / Password' : role === 'admin' ? 'Admin Secret' : 'Password'}</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder={role === 'student' ? '4-digit PIN' : 'Your password'}
                    className="input-field pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className={`btn-primary w-full justify-center mt-2 ${
                  role === 'student' ? 'bg-accent hover:bg-accent/80 shadow-glow-cyan' :
                  role === 'admin' ? 'bg-warning/80 hover:bg-warning text-black' : ''
                }`}>
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                  : <><ArrowRight size={16} /> Sign In</>
                }
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-muted/50 mt-6">
          CBSE Class 12 • JEE • NEET • CET Exam Prep Platform
        </p>
      </div>
    </div>
  )
}
