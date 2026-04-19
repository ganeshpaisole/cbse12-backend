import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { EXAM_MODES } from '../lib/constants'
import {
  Users, GraduationCap, Plus, Trash2, RefreshCw,
  Loader2, AlertCircle, CheckCircle, Shield,
  BookOpen, BarChart3, ChevronDown, ChevronUp, X,
  PauseCircle, PlayCircle, UserX, UserCheck
} from 'lucide-react'
import KPICard from '../components/KPICard'

const ALL_SUBJECTS = [
  'Physics', 'Chemistry', 'Mathematics', 'Biology',
  'Computer Science', 'Economics', 'English', 'Accountancy',
  'Business Studies', 'History', 'Geography', 'Political Science'
]

function ConfirmButtons({ onConfirm, onCancel, loading, label = 'Confirm', danger = true }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onConfirm} disabled={loading}
        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
          danger ? 'bg-danger/20 text-danger border-danger/30 hover:bg-danger/30' : 'bg-success/20 text-success border-success/30 hover:bg-success/30'
        }`}>
        {loading ? <Loader2 size={11} className="animate-spin" /> : label}
      </button>
      <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/5 text-muted">
        <X size={13} />
      </button>
    </div>
  )
}

function StudentAdminRow({ student, teacherCode, secret, onUpdate }) {
  const [action, setAction] = useState(null) // 'delete' | 'suspend'
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try { await api.adminDeleteStudent(secret, teacherCode, student.studentCode); onUpdate() }
    catch (e) { alert(e.message) }
    finally { setLoading(false); setAction(null) }
  }

  const handleToggleSuspend = async () => {
    setLoading(true)
    try { await api.adminSuspendStudent(secret, teacherCode, student.studentCode, !student.suspended); onUpdate() }
    catch (e) { alert(e.message) }
    finally { setLoading(false); setAction(null) }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/3 transition-all group">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${student.suspended ? 'bg-danger/20 text-danger' : 'bg-accent/15 text-accent'}`}>
        {student.name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${student.suspended ? 'text-muted line-through' : 'text-white'}`}>{student.name}</p>
        <p className="text-xs text-muted font-mono">{student.studentCode} · {student.totalQuizzes} quizzes</p>
      </div>
      {student.suspended && <span className="badge bg-danger/10 text-danger border border-danger/20 text-xs">Suspended</span>}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {action === 'delete' ? (
          <ConfirmButtons onConfirm={handleDelete} onCancel={() => setAction(null)} loading={loading} />
        ) : action === 'suspend' ? (
          <ConfirmButtons onConfirm={handleToggleSuspend} onCancel={() => setAction(null)} loading={loading}
            label={student.suspended ? 'Reactivate' : 'Suspend'} danger={!student.suspended} />
        ) : (
          <>
            <button onClick={() => setAction('suspend')}
              className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-warning transition-all" title={student.suspended ? 'Reactivate' : 'Suspend'}>
              {student.suspended ? <UserCheck size={13} /> : <PauseCircle size={13} />}
            </button>
            <button onClick={() => setAction('delete')}
              className="p-1.5 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-all" title="Delete">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function TeacherRow({ teacher, secret, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [action, setAction] = useState(null) // 'delete' | 'suspend'
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try { await api.adminDeleteTeacher(secret, teacher.teacherCode); onRefresh() }
    catch (e) { alert(e.message) }
    finally { setLoading(false); setAction(null) }
  }

  const handleToggleSuspend = async () => {
    setLoading(true)
    try { await api.adminSuspendTeacher(secret, teacher.teacherCode, !teacher.suspended); onRefresh() }
    catch (e) { alert(e.message) }
    finally { setLoading(false); setAction(null) }
  }

  const examModes = teacher.examModes || [teacher.examMode].filter(Boolean)

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold flex-shrink-0 ${
          teacher.suspended ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-primary/20 border-primary/20 text-primary-light'
        }`}>
          {teacher.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-semibold truncate ${teacher.suspended ? 'text-muted line-through' : 'text-white'}`}>{teacher.name}</p>
            {teacher.suspended && <span className="badge bg-danger/10 text-danger border border-danger/20 text-xs flex-shrink-0">Suspended</span>}
          </div>
          <p className="text-xs text-muted font-mono">{teacher.teacherCode}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end max-w-xs">
          {examModes.map(m => (
            <span key={m} className="badge-purple text-xs">{EXAM_MODES[m] || m}</span>
          ))}
          <span className="text-xs text-muted flex items-center gap-1"><Users size={11} />{teacher.studentCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(v => !v)}
            className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-all">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {action === 'suspend' ? (
            <ConfirmButtons onConfirm={handleToggleSuspend} onCancel={() => setAction(null)} loading={loading}
              label={teacher.suspended ? 'Reactivate' : 'Suspend'} danger={!teacher.suspended} />
          ) : action === 'delete' ? (
            <ConfirmButtons onConfirm={handleDelete} onCancel={() => setAction(null)} loading={loading} />
          ) : (
            <>
              <button onClick={() => setAction('suspend')} title={teacher.suspended ? 'Reactivate' : 'Suspend'}
                className={`p-2 rounded-lg transition-all ${teacher.suspended ? 'hover:bg-success/10 text-muted hover:text-success' : 'hover:bg-warning/10 text-muted hover:text-warning'}`}>
                {teacher.suspended ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
              </button>
              <button onClick={() => setAction('delete')}
                className="p-2 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-all">
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-white/1 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs px-4 py-3">
            <div>
              <p className="text-muted mb-1">Subjects</p>
              <div className="flex flex-wrap gap-1">
                {(teacher.subjects || []).map(s => (
                  <span key={s} className="badge bg-white/5 text-slate-300 border border-white/10">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted mb-1">Exam Modes</p>
              <div className="flex flex-wrap gap-1">
                {examModes.map(m => (
                  <span key={m} className="badge bg-primary/10 text-primary-light border border-primary/20">{EXAM_MODES[m] || m}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted mb-1">Teacher Code</p>
              <p className="font-mono text-white">{teacher.teacherCode}</p>
            </div>
            <div>
              <p className="text-muted mb-1">Joined</p>
              <p className="text-white">{teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString('en-IN') : '—'}</p>
            </div>
          </div>

          {/* Students */}
          {(teacher.students || []).length > 0 && (
            <div className="px-4 pb-3 border-t border-border/50">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mt-3 mb-2">Students ({teacher.students.length})</p>
              <div className="space-y-0.5">
                {teacher.students.map(s => (
                  <StudentAdminRow key={s.studentCode} student={s} teacherCode={teacher.teacherCode} secret={secret} onUpdate={onRefresh} />
                ))}
              </div>
            </div>
          )}
          {(teacher.students || []).length === 0 && (
            <p className="text-xs text-muted px-4 pb-3">No students enrolled yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

function CreateTeacherModal({ secret, onCreated, onClose }) {
  const [form, setForm] = useState({ name: '', subjects: [], examModes: ['cbse12'] })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const toggleSubject = (s) => setForm(f => ({
    ...f, subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : [...f.subjects, s]
  }))

  const toggleExam = (k) => setForm(f => ({
    ...f, examModes: f.examModes.includes(k) ? f.examModes.filter(x => x !== k) : [...f.examModes, k]
  }))

  const handleCreate = async () => {
    if (!form.name.trim() || form.subjects.length === 0)
      return setError('Name and at least one subject are required.')
    if (form.examModes.length === 0)
      return setError('Select at least one exam mode.')
    setLoading(true); setError('')
    try {
      const data = await api.adminCreateTeacher(secret, {
        name: form.name.trim(), subjects: form.subjects, examModes: form.examModes,
      })
      setResult(data); onCreated()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!result ? onClose : undefined} />
      <div className="relative glass-card p-6 w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Create Teacher Account</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {result ? (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 text-success mb-4">
              <CheckCircle size={18} /><p className="font-semibold">Teacher created!</p>
            </div>
            <div className="space-y-3 p-4 rounded-xl bg-success/5 border border-success/20">
              <div><p className="text-xs text-muted">Name</p><p className="font-semibold text-white">{result.name}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted">Teacher Code</p><p className="font-mono font-bold text-white text-lg">{result.teacherCode}</p></div>
                <div><p className="text-xs text-muted">Password</p><p className="font-mono font-bold text-white text-lg">{result.password}</p></div>
              </div>
              <p className="text-xs text-muted/60">Share these credentials with the teacher.</p>
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center mt-4">Done</button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Dr. Priya Sharma" className="input-field" autoFocus />
            </div>

            <div>
              <label className="label">Subjects <span className="text-muted/50 font-normal">(select all that apply)</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_SUBJECTS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSubject(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                      form.subjects.includes(s)
                        ? 'bg-primary/20 border-primary/40 text-primary-light'
                        : 'bg-white/3 border-white/10 text-muted hover:border-white/20 hover:text-white'
                    }`}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Exam Modes <span className="text-muted/50 font-normal">(select all that apply)</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(EXAM_MODES).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => toggleExam(k)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                      form.examModes.includes(k)
                        ? 'bg-accent/20 border-accent/40 text-accent'
                        : 'bg-white/3 border-white/10 text-muted hover:border-white/20 hover:text-white'
                    }`}>{v}</button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><Plus size={14} /> Create</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const secret = user?.adminSecret

  const fetchData = async () => {
    setLoading(true); setError('')
    try {
      const [tData, uData] = await Promise.all([
        api.adminGetTeachers(secret),
        api.adminGetUsage(secret),
      ])
      setTeachers(Array.isArray(tData) ? tData : tData.teachers || [])
      setUsage(uData)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = teachers.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.teacherCode?.toLowerCase().includes(search.toLowerCase())
  )

  const totalStudents = teachers.reduce((a, t) => a + (t.studentCount ?? 0), 0)
  const suspended = teachers.filter(t => t.suspended).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-warning" />
            <span className="badge bg-warning/15 text-warning border border-warning/20">Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-muted text-sm mt-1">Manage teachers, students and platform access</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} disabled={loading} className="btn-secondary text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <Plus size={14} /> Add Teacher
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm mb-6">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon={GraduationCap} label="Total Teachers" value={teachers.length} sub="registered" color="purple" />
        <KPICard icon={Users} label="Total Students" value={totalStudents} sub="across all classes" color="cyan" />
        <KPICard icon={PauseCircle} label="Suspended" value={suspended} sub="teachers paused" color="orange" />
        <KPICard icon={BookOpen} label="Platform" value={usage?.status || 'Active'} sub="all systems normal" color="green" />
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-white">Teachers & Students</h3>
            <p className="text-xs text-muted mt-0.5">{teachers.length} teachers · expand to manage students</p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="input-field w-56 text-sm" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 size={28} className="animate-spin text-primary-light mx-auto mb-3" />
              <p className="text-muted text-sm">Loading...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap size={28} className="mx-auto mb-3 text-muted/30" />
            <p className="text-muted text-sm">{search ? 'No teachers match your search' : 'No teachers yet'}</p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="text-xs text-primary-light mt-2 hover:underline">
                + Create first teacher
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => (
              <TeacherRow key={t.teacherCode} teacher={t} secret={secret} onRefresh={fetchData} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTeacherModal secret={secret} onCreated={fetchData} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
