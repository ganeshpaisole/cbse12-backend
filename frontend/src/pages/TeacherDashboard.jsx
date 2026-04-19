import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, TrendingUp, Award, BarChart3, Wand2, FileText,
  UserPlus, Loader2, AlertCircle, RefreshCw, ChevronRight,
  BookOpen, Target, Star, Flame, Copy, Check,
  Trash2, PauseCircle, PlayCircle, X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { EXAM_MODES } from '../lib/constants'
import KPICard from '../components/KPICard'
import ScheduleWidget from '../components/ScheduleWidget'

function SubjectBar({ subject, pct }) {
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-muted w-28 truncate">{subject}</p>
      <div className="flex-1 progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-sm font-semibold w-10 text-right" style={{ color }}>{pct}%</p>
    </div>
  )
}

function StudentRow({ student, teacherCode, teacherKey, onRefresh }) {
  const progress = student.progress || []
  const avgScore = progress.length
    ? Math.round(progress.reduce((a, p) => a + (p.pct || 0), 0) / progress.length)
    : 0
  const recentActivity = progress[progress.length - 1]
  const [copied, setCopied] = useState(false)
  const [action, setAction] = useState(null) // 'delete' | 'suspend'
  const [loading, setLoading] = useState(false)

  const copyCredentials = () => {
    const text = `EduPulse Student Login\nTeacher Code: ${teacherCode}\nStudent Code: ${student.studentCode}\nNote: Ask your teacher for your PIN`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await api.deleteStudent(teacherCode, teacherKey, student.studentCode); onRefresh() }
    catch (e) { alert(e.message) }
    finally { setLoading(false); setAction(null) }
  }

  const handleToggleSuspend = async () => {
    setLoading(true)
    try { await api.suspendStudent(teacherCode, teacherKey, student.studentCode, !student.suspended); onRefresh() }
    catch (e) { alert(e.message) }
    finally { setLoading(false); setAction(null) }
  }

  return (
    <div className={`p-3 rounded-xl transition-all group ${student.suspended ? 'bg-danger/5' : 'hover:bg-white/3'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 ${student.suspended ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-accent/20 border-accent/20 text-accent'}`}>
          {student.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium text-sm truncate ${student.suspended ? 'text-muted line-through' : 'text-white'}`}>{student.name}</p>
            {student.suspended && <span className="badge bg-danger/10 text-danger border border-danger/20 text-xs flex-shrink-0">Suspended</span>}
          </div>
          <p className="text-xs text-muted">{progress.length} attempts · {recentActivity ? recentActivity.subject : 'No activity'}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold ${avgScore >= 75 ? 'text-success' : avgScore >= 50 ? 'text-warning' : avgScore > 0 ? 'text-danger' : 'text-muted'}`}>
              {avgScore > 0 ? `${avgScore}%` : '—'}
            </p>
            <div className="flex items-center gap-1 justify-end">
              <p className="text-xs font-mono text-primary-light">{student.studentCode}</p>
              <button onClick={copyCredentials} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-white">
                {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          {action === 'delete' ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} disabled={loading}
                className="text-xs px-2 py-1 rounded-lg bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30">
                {loading ? <Loader2 size={10} className="animate-spin" /> : 'Delete?'}
              </button>
              <button onClick={() => setAction(null)} className="p-1 text-muted hover:text-white"><X size={12} /></button>
            </div>
          ) : action === 'suspend' ? (
            <div className="flex items-center gap-1">
              <button onClick={handleToggleSuspend} disabled={loading}
                className={`text-xs px-2 py-1 rounded-lg border ${student.suspended ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}>
                {loading ? <Loader2 size={10} className="animate-spin" /> : student.suspended ? 'Reactivate?' : 'Suspend?'}
              </button>
              <button onClick={() => setAction(null)} className="p-1 text-muted hover:text-white"><X size={12} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setAction('suspend')} title={student.suspended ? 'Reactivate' : 'Suspend access'}
                className={`p-1.5 rounded-lg transition-all ${student.suspended ? 'hover:bg-success/10 text-muted hover:text-success' : 'hover:bg-warning/10 text-muted hover:text-warning'}`}>
                {student.suspended ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
              </button>
              <button onClick={() => setAction('delete')} title="Delete student"
                className="p-1.5 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviting, setInviting] = useState(false)
  const [newStudent, setNewStudent] = useState(null)

  const fetchClass = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getClass(user.teacherCode, user.teacherKey)
      setClassData(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClass() }, [])

  const handleInvite = async () => {
    if (!inviteName.trim()) return
    setInviting(true)
    try {
      const res = await api.inviteStudent(user.teacherCode, user.teacherKey, inviteName.trim())
      setNewStudent(res)
      setInviteName('')
      fetchClass()
    } catch (e) {
      setError(e.message)
    } finally {
      setInviting(false)
    }
  }

  // Compute KPIs
  const students = classData?.students || []
  const totalStudents = students.length

  const allProgress = students.flatMap(s => s.progress || [])
  const avgScore = allProgress.length
    ? Math.round(allProgress.reduce((a, p) => a + (p.pct || 0), 0) / allProgress.length)
    : 0

  const topPerformer = students.reduce((best, s) => {
    const avg = (s.progress || []).reduce((a, p) => a + (p.pct || 0), 0) / Math.max(1, s.progress?.length || 1)
    const bestAvg = (best?.progress || []).reduce((a, p) => a + (p.pct || 0), 0) / Math.max(1, best?.progress?.length || 1)
    return avg > bestAvg ? s : best
  }, students[0])

  const activeThisWeek = students.filter(s => {
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000
    return (s.progress || []).some(p => new Date(p.timestamp) > week)
  }).length

  // Subject-wise averages
  const subjectMap = {}
  allProgress.forEach(p => {
    if (!subjectMap[p.subject]) subjectMap[p.subject] = []
    subjectMap[p.subject].push(p.pct || 0)
  })
  const subjectAvgs = Object.entries(subjectMap)
    .map(([sub, scores]) => ({ sub, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    .sort((a, b) => b.avg - a.avg)

  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-muted text-sm">{todayDate}</p>
          <h1 className="text-2xl font-bold text-white mt-1">
            Welcome back, <span className="text-gradient">{user.name}</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge-purple">{EXAM_MODES[user.examMode] || user.examMode}</span>
            {(user.subjects || []).slice(0, 3).map(s => (
              <span key={s} className="badge bg-white/5 text-muted border border-white/10">{s}</span>
            ))}
            {(user.subjects || []).length > 3 && (
              <span className="badge bg-white/5 text-muted border border-white/10">+{user.subjects.length - 3}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchClass} disabled={loading}
            className="btn-secondary text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => navigate('/teacher/quiz')} className="btn-primary text-sm">
            <Wand2 size={14} /> Generate Quiz
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm mb-6">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-primary-light mx-auto mb-3" />
            <p className="text-muted text-sm">Loading class data...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Users} label="Total Students" value={totalStudents} sub="enrolled" color="purple" />
            <KPICard icon={TrendingUp} label="Class Average" value={`${avgScore}%`} sub="all subjects" color="cyan" />
            <KPICard icon={Flame} label="Active This Week" value={activeThisWeek} sub={`of ${totalStudents}`} color="orange" />
            <KPICard icon={Award} label="Top Performer" value={topPerformer?.name || '—'} sub={topPerformer ? `avg ${Math.round((topPerformer.progress || []).reduce((a,p)=>a+(p.pct||0),0)/Math.max(1,(topPerformer.progress||[]).length))}%` : 'No data'} color="green" />
          </div>

          {/* Main grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Students list */}
            <div className="lg:col-span-2 glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-white">Students</h3>
                  <p className="text-xs text-muted mt-0.5">{totalStudents} enrolled</p>
                </div>
                <button onClick={() => setShowInvite(v => !v)}
                  className="btn-secondary text-sm">
                  <UserPlus size={14} /> Add Student
                </button>
              </div>

              {/* Invite form */}
              {showInvite && (
                <div className="flex gap-2 mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <input
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    placeholder="Student's full name"
                    className="input-field flex-1"
                    autoFocus
                  />
                  <button onClick={handleInvite} disabled={inviting} className="btn-primary text-sm">
                    {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Add
                  </button>
                </div>
              )}

              {/* New student credentials */}
              {newStudent && (
                <div className="mb-4 p-4 rounded-xl bg-success/5 border border-success/20">
                  <p className="text-success text-sm font-semibold mb-2">✓ Student added successfully!</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted text-xs">Student Code</p>
                      <p className="font-mono font-bold text-white">{newStudent.studentCode}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">Password</p>
                      <p className="font-mono font-bold text-white">{newStudent.studentPassword}</p>
                    </div>
                  </div>
                  <p className="text-muted/60 text-xs mt-2">Share these with the student. Teacher code: {user.teacherCode}</p>
                  <button onClick={() => setNewStudent(null)} className="text-xs text-muted/60 hover:text-muted mt-1">Dismiss</button>
                </div>
              )}

              {students.length === 0 ? (
                <div className="text-center py-10">
                  <Users size={32} className="mx-auto mb-3 text-muted/30" />
                  <p className="text-muted text-sm">No students yet</p>
                  <p className="text-muted/60 text-xs mt-1">Add your first student to get started</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto no-scrollbar">
                  {students.map(s => <StudentRow key={s.studentCode} student={s} teacherCode={user.teacherCode} teacherKey={user.teacherKey} onRefresh={fetchClass} />)}
                </div>
              )}
            </div>

            {/* Subject performance */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-1">Subject Performance</h3>
              <p className="text-xs text-muted mb-5">Class-wide averages</p>
              {subjectAvgs.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 size={24} className="mx-auto mb-2 text-muted/30" />
                  <p className="text-muted text-sm">No data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjectAvgs.map(({ sub, avg }) => <SubjectBar key={sub} subject={sub} pct={avg} />)}
                </div>
              )}

              {/* Quick generate */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-xs text-muted mb-3 font-medium">Quick Actions</p>
                <button onClick={() => navigate('/teacher/quiz')}
                  className="w-full glass-card-hover p-3 text-left group flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Wand2 size={15} className="text-primary-light" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Generate Quiz</p>
                    <p className="text-xs text-muted">AI-powered questions</p>
                  </div>
                  <ChevronRight size={14} className="text-muted group-hover:text-primary-light transition-colors" />
                </button>
                <button onClick={() => navigate('/teacher/paper')}
                  className="w-full glass-card-hover p-3 text-left group flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <FileText size={15} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Generate Paper</p>
                    <p className="text-xs text-muted">Full exam with answer key</p>
                  </div>
                  <ChevronRight size={14} className="text-muted group-hover:text-accent transition-colors" />
                </button>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <ScheduleWidget subjects={user.subjects || []} />
        </div>
      )}
    </div>
  )
}
