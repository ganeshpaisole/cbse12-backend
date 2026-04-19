import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { EXAM_MODES, SUBJECTS, QUESTION_TYPES } from '../lib/constants'
import KPICard from '../components/KPICard'
import {
  Target, TrendingUp, BookOpen, Star, Zap,
  ChevronRight, Loader2, CheckCircle, XCircle,
  BarChart3, Clock, Trophy, Flame, Play, AlertCircle,
  Bell, Send
} from 'lucide-react'

const PROGRESS_KEY = (code) => `edu_progress_${code}`

function loadProgress(code) {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY(code))) || [] } catch { return [] }
}
function saveProgress(code, data) {
  localStorage.setItem(PROGRESS_KEY(code), JSON.stringify(data.slice(-100)))
}

function ScoreBadge({ pct }) {
  if (pct >= 80) return <span className="badge-green">{pct}%</span>
  if (pct >= 60) return <span className="badge-orange">{pct}%</span>
  return <span className="badge-red">{pct}%</span>
}

// assigned=true → no answer reveals, allow changing selection freely
function QuizCard({ q, idx, answer, onAnswer, assigned, quizType }) {
  const type = quizType || q.type
  if (type === 'mcq') {
    return (
      <div className="glass-card p-5">
        <p className="text-xs text-muted mb-1">Q{idx + 1}</p>
        <p className="text-sm font-medium text-white mb-4 leading-relaxed">{q.question}</p>
        <div className="grid grid-cols-1 gap-2">
          {(q.options || []).map((opt, i) => {
            const isSelected = answer === i
            const isCorrect = !assigned && answer !== undefined && i === q.correct
            const isWrong   = !assigned && answer === i && i !== q.correct
            return (
              <button key={i}
                onClick={() => onAnswer(i)}
                className={`text-left p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                  isCorrect   ? 'bg-success/15 border-success/40 text-success' :
                  isWrong     ? 'bg-danger/15 border-danger/40 text-danger' :
                  isSelected  ? 'bg-primary/15 border-primary/40 text-white' :
                  'bg-white/3 border-white/10 text-slate-300 hover:bg-white/6 hover:border-white/20'
                }`}>
                <span className="font-mono text-xs opacity-60 mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            )
          })}
        </div>
        {!assigned && answer !== undefined && q.explanation && (
          <p className="mt-3 text-xs text-muted bg-white/3 rounded-lg p-3 leading-relaxed">{q.explanation}</p>
        )}
      </div>
    )
  }
  return (
    <div className="glass-card p-5">
      <p className="text-xs text-muted mb-1">Q{idx + 1}</p>
      <p className="text-sm font-medium text-white mb-3 leading-relaxed">{q.question || q.sentence}</p>
      {!assigned && answer !== undefined && (
        <div className="mt-3 p-3 rounded-xl bg-success/5 border border-success/20 text-sm text-success">
          <span className="font-medium">Answer: </span>{q.answer}
        </div>
      )}
      {(assigned ? answer === undefined : answer === undefined) && (
        <button onClick={() => onAnswer(0)} className="btn-secondary text-xs">
          {assigned ? 'Mark as Attempted' : 'Show Answer'}
        </button>
      )}
      {assigned && answer !== undefined && (
        <p className="text-xs text-success mt-2">Marked as attempted</p>
      )}
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [progress, setProgress] = useState(() => loadProgress(user.studentCode))
  const [tab, setTab] = useState('home') // home | generate | quiz
  const [quizConfig, setQuizConfig] = useState({
    subject: user.subjects?.[0] || '',
    chapter: '',
    type: 'mcq',
    count: 10,
    difficulty: 'mixed',
  })
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [generating, setGenerating] = useState(false)
  const [quizDone, setQuizDone] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [genError, setGenError] = useState('')

  // Assigned quiz state
  const [assignedQuiz, setAssignedQuiz] = useState(null)
  const [assignedAnswers, setAssignedAnswers] = useState({})
  const [assignedDone, setAssignedDone] = useState(false)
  const [assignedResult, setAssignedResult] = useState(null)
  const [submittingAssigned, setSubmittingAssigned] = useState(false)

  // Check for teacher-assigned quiz on mount
  useEffect(() => {
    if (!user.teacherCode) return
    api.getActiveQuiz(user.teacherCode)
      .then(res => { if (res.quiz) setAssignedQuiz(res.quiz) })
      .catch(() => {})
  }, [user.teacherCode])

  const submitAssignedQuiz = async () => {
    if (!assignedQuiz) return
    setSubmittingAssigned(true)
    try {
      const result = await api.submitAssignedQuiz(
        user.teacherCode, user.studentCode, assignedQuiz.quizId, assignedAnswers
      )
      setAssignedResult(result)
      setAssignedDone(true)
      // save to local progress
      const record = {
        subject: assignedQuiz.subject,
        chapter: assignedQuiz.chapters?.join(', ') || 'Mixed',
        type: assignedQuiz.type,
        scoreC: result.correct, scoreW: result.wrong,
        scoreTot: result.total, pct: result.pct,
        timestamp: new Date().toISOString(), assigned: true,
      }
      const updated = [...progress, record]
      setProgress(updated)
      saveProgress(user.studentCode, updated)
    } catch (e) {
      setGenError('Submit failed: ' + e.message)
    } finally {
      setSubmittingAssigned(false)
    }
  }

  const chapters = SUBJECTS[quizConfig.subject] || []

  const generateQuiz = async () => {
    if (!quizConfig.subject) return
    setGenerating(true)
    setGenError('')
    setAnswers({})
    setQuizDone(false)
    try {
      const data = await api.generateQuiz({
        subject: quizConfig.subject,
        chapters: quizConfig.chapter ? [quizConfig.chapter] : [],
        type: quizConfig.type,
        count: quizConfig.count,
        difficulty: quizConfig.difficulty,
        examMode: user.examMode || 'cbse12',
      })
      const raw = data.data || data
      const questions = (Array.isArray(raw) ? raw : raw.questions || []).map(q => ({
        ...q,
        question:    q.question    || q.q,
        options:     q.options     || q.opts,
        explanation: q.explanation || q.exp,
        answer:      q.answer      || q.a,
        sentence:    q.sentence    || q.q,
      }))
      setQuiz({ questions, config: { ...quizConfig } })
      setTab('quiz')
    } catch (e) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleAnswer = (idx, val) => {
    setAnswers(a => ({ ...a, [idx]: val }))
  }

  const finishQuiz = async () => {
    if (!quiz) return
    const questions = quiz.questions
    const total = questions.length
    let correct = 0, wrong = 0

    questions.forEach((q, i) => {
      if (answers[i] === undefined) return
      if (q.type === 'mcq') {
        if (answers[i] === q.correct) correct++
        else wrong++
      } else {
        correct++ // for non-mcq shown-answer counts as reviewed
      }
    })

    const record = {
      subject: quiz.config.subject,
      chapter: quiz.config.chapter || 'Mixed',
      type: quiz.config.type,
      scoreC: correct,
      scoreW: wrong,
      scoreTot: total,
      pct: Math.round((correct / total) * 100),
      timestamp: new Date().toISOString(),
    }

    const updated = [...progress, record]
    setProgress(updated)
    saveProgress(user.studentCode, updated)
    setQuizDone(true)

    setSyncing(true)
    try {
      await api.syncProgress(user.teacherCode, user.studentCode, record)
    } catch {}
    setSyncing(false)
  }

  // KPIs
  const totalAttempts = progress.length
  const overallAvg = totalAttempts
    ? Math.round(progress.reduce((a, p) => a + (p.pct || 0), 0) / totalAttempts)
    : 0

  const subjectMap = {}
  progress.forEach(p => {
    if (!subjectMap[p.subject]) subjectMap[p.subject] = []
    subjectMap[p.subject].push(p.pct || 0)
  })
  const bestSubject = Object.entries(subjectMap)
    .map(([s, scores]) => ({ s, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    .sort((a, b) => b.avg - a.avg)[0]

  // Streak: consecutive days with activity
  const streak = (() => {
    const days = new Set(progress.map(p => p.timestamp?.slice(0, 10)))
    let s = 0, d = new Date()
    while (days.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1) }
    return s
  })()

  const recentQuizzes = [...progress].reverse().slice(0, 8)

  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-muted text-sm">{todayDate}</p>
          <h1 className="text-2xl font-bold text-white mt-1">
            Hello, <span className="text-gradient">{user.name}</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge-cyan">Student</span>
            <span className="badge bg-white/5 text-muted border border-white/10">
              {EXAM_MODES[user.examMode] || 'CBSE 12'}
            </span>
            <span className="text-xs text-muted">Teacher: {user.teacherName}</span>
          </div>
        </div>
        <button onClick={() => setTab(tab === 'home' ? 'generate' : 'home')}
          className="btn-primary text-sm">
          <Play size={14} /> {tab === 'home' ? 'Take a Quiz' : 'Back'}
        </button>
      </div>

      {tab === 'home' && (
        <div className="space-y-6 animate-fade-in">
          {/* Assigned quiz banner */}
          {assignedQuiz && !assignedDone && (
            <div className="glass-card p-5 border-primary/40 bg-primary/5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Bell size={18} className="text-primary-light" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Your teacher has assigned a quiz!</p>
                  <p className="text-xs text-muted mt-0.5">
                    {assignedQuiz.subject} · {assignedQuiz.type?.toUpperCase()} · {assignedQuiz.questionCount} questions
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setTab('assigned') }}
                className="btn-primary text-sm flex-shrink-0">
                <Play size={14} /> Start Quiz
              </button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Target} label="Overall Score" value={`${overallAvg}%`} sub={`${totalAttempts} quizzes`} color="purple" />
            <KPICard icon={Trophy} label="Best Subject" value={bestSubject?.s || '—'} sub={bestSubject ? `${bestSubject.avg}% avg` : 'Take a quiz!'} color="green" />
            <KPICard icon={Flame} label="Study Streak" value={`${streak}d`} sub="consecutive days" color="orange" />
            <KPICard icon={BookOpen} label="Quizzes Done" value={totalAttempts} sub="all time" color="cyan" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent quizzes */}
            <div className="lg:col-span-2 glass-card p-6">
              <h3 className="font-semibold text-white mb-1">Recent Activity</h3>
              <p className="text-xs text-muted mb-5">Your quiz history</p>
              {recentQuizzes.length === 0 ? (
                <div className="text-center py-10">
                  <BarChart3 size={28} className="mx-auto mb-3 text-muted/30" />
                  <p className="text-muted text-sm">No quizzes yet</p>
                  <button onClick={() => setTab('generate')}
                    className="text-xs text-primary-light mt-2 hover:underline">Start your first quiz →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentQuizzes.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 transition-all">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                        {p.pct >= 70 ? <CheckCircle size={16} className="text-success" /> : <XCircle size={16} className="text-warning" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.subject} — {p.chapter}</p>
                        <p className="text-xs text-muted">
                          {p.type?.toUpperCase()} · {p.scoreC}/{p.scoreTot} correct ·{' '}
                          <Clock size={10} className="inline" /> {new Date(p.timestamp).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <ScoreBadge pct={p.pct || 0} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subject breakdown */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-1">Subject Scores</h3>
              <p className="text-xs text-muted mb-5">Your average per subject</p>
              {Object.keys(subjectMap).length === 0 ? (
                <div className="text-center py-8">
                  <Star size={22} className="mx-auto mb-2 text-muted/30" />
                  <p className="text-muted text-sm">No data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(subjectMap)
                    .map(([s, scores]) => ({ s, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
                    .sort((a, b) => b.avg - a.avg)
                    .map(({ s, avg }) => (
                      <div key={s} className="flex items-center gap-3">
                        <p className="text-sm text-muted w-24 truncate">{s}</p>
                        <div className="flex-1 progress-bar">
                          <div className="progress-fill" style={{
                            width: `${avg}%`,
                            background: avg >= 75 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444'
                          }} />
                        </div>
                        <p className={`text-sm font-bold w-10 text-right ${avg >= 75 ? 'text-success' : avg >= 50 ? 'text-warning' : 'text-danger'}`}>{avg}%</p>
                      </div>
                    ))
                  }
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-border">
                <button onClick={() => setTab('generate')}
                  className="w-full glass-card-hover p-3 text-left group flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Zap size={15} className="text-primary-light" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Practice Now</p>
                    <p className="text-xs text-muted">AI-generated quiz</p>
                  </div>
                  <ChevronRight size={14} className="text-muted group-hover:text-primary-light transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'generate' && !quiz && (
        <div className="max-w-xl mx-auto animate-fade-in">
          <div className="glass-card p-7">
            <h2 className="font-semibold text-white text-lg mb-1">Configure Quiz</h2>
            <p className="text-muted text-sm mb-6">AI will generate questions for you</p>

            <div className="space-y-4">
              <div>
                <label className="label">Subject</label>
                <select value={quizConfig.subject}
                  onChange={e => setQuizConfig(c => ({ ...c, subject: e.target.value, chapter: '' }))}
                  className="input-field bg-card">
                  <option value="">Select subject...</option>
                  {(user.subjects?.length ? user.subjects : Object.keys(SUBJECTS)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Chapter (optional)</label>
                <select value={quizConfig.chapter}
                  onChange={e => setQuizConfig(c => ({ ...c, chapter: e.target.value }))}
                  className="input-field bg-card">
                  <option value="">All chapters (mixed)</option>
                  {chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Question Type</label>
                  <select value={quizConfig.type}
                    onChange={e => setQuizConfig(c => ({ ...c, type: e.target.value }))}
                    className="input-field bg-card">
                    {QUESTION_TYPES.slice(0, 6).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Number of Questions</label>
                  <select value={quizConfig.count}
                    onChange={e => setQuizConfig(c => ({ ...c, count: +e.target.value }))}
                    className="input-field bg-card">
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} questions</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Difficulty</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { v: 'easy', l: 'Easy', c: 'border-success/40 text-success bg-success/10' },
                    { v: 'medium', l: 'Medium', c: 'border-warning/40 text-warning bg-warning/10' },
                    { v: 'hard', l: 'Hard', c: 'border-danger/40 text-danger bg-danger/10' },
                    { v: 'mixed', l: 'Mixed', c: 'border-primary/40 text-primary-light bg-primary/10' },
                  ].map(({ v, l, c }) => (
                    <button key={v} onClick={() => setQuizConfig(cfg => ({ ...cfg, difficulty: v }))}
                      className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                        quizConfig.difficulty === v ? c : 'border-white/10 text-muted hover:border-white/20'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {genError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm mt-4">
                <AlertCircle size={14} /> {genError}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setTab('home')} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={generateQuiz} disabled={generating || !quizConfig.subject}
                className="btn-primary flex-1 justify-center">
                {generating ? <><Loader2 size={15} className="animate-spin" /> Generating...</> : <><Zap size={15} /> Start Quiz</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'quiz' && quiz && (
        <div className="max-w-2xl mx-auto animate-fade-in">
          {/* Quiz header */}
          <div className="glass-card p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{quiz.config.subject}</p>
              <p className="text-xs text-muted">{quiz.config.chapter || 'Mixed'} · {quiz.questions.length} questions</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${Object.keys(answers).length === quiz.questions.length ? 'badge-green' : 'badge-orange'}`}>
                {Object.keys(answers).length}/{quiz.questions.length} answered
              </span>
            </div>
          </div>

          {quizDone ? (
            <div className="glass-card p-8 text-center animate-slide-up">
              <div className="w-16 h-16 rounded-2xl bg-success/20 border border-success/30 flex items-center justify-center mx-auto mb-4">
                <Trophy size={28} className="text-success" />
              </div>
              {(() => {
                const total = quiz.questions.length
                const answered = Object.keys(answers).length
                const correct = quiz.questions.filter((q, i) => answers[i] !== undefined && (q.type !== 'mcq' || answers[i] === q.correct)).length
                const pct = Math.round((correct / total) * 100)
                return (
                  <>
                    <h2 className="text-xl font-bold text-white mb-1">Quiz Complete!</h2>
                    <p className="text-muted text-sm mb-6">
                      {syncing ? 'Syncing results...' : 'Results saved to your profile'}
                    </p>
                    <div className="text-5xl font-bold mb-1 text-gradient">{pct}%</div>
                    <p className="text-muted text-sm mb-6">{correct} of {total} correct</p>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="glass-card p-3 text-center">
                        <p className="text-success text-xl font-bold">{correct}</p>
                        <p className="text-xs text-muted">Correct</p>
                      </div>
                      <div className="glass-card p-3 text-center">
                        <p className="text-danger text-xl font-bold">{answered - correct}</p>
                        <p className="text-xs text-muted">Wrong</p>
                      </div>
                      <div className="glass-card p-3 text-center">
                        <p className="text-muted text-xl font-bold">{total - answered}</p>
                        <p className="text-xs text-muted">Skipped</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setTab('home'); setQuiz(null) }} className="btn-secondary flex-1 justify-center">
                        Back to Dashboard
                      </button>
                      <button onClick={() => { setTab('generate'); setQuiz(null) }} className="btn-primary flex-1 justify-center">
                        <Zap size={14} /> New Quiz
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {quiz.questions.map((q, i) => (
                  <QuizCard key={i} q={{ ...q, type: quiz.config.type }} idx={i}
                    answer={answers[i]} onAnswer={(v) => handleAnswer(i, v)} quizType={quiz.config.type} />
                ))}
              </div>
              <div className="mt-6 glass-card p-4 flex items-center justify-between">
                <p className="text-sm text-muted">{Object.keys(answers).length} of {quiz.questions.length} answered</p>
                <button onClick={finishQuiz} className="btn-primary">
                  <CheckCircle size={15} /> Submit Quiz
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Assigned quiz tab ── */}
      {tab === 'assigned' && assignedQuiz && (
        <div className="max-w-2xl mx-auto animate-fade-in">
          {assignedDone && assignedResult ? (
            <div className="glass-card p-8 text-center animate-slide-up">
              <div className="w-16 h-16 rounded-2xl bg-success/20 border border-success/30 flex items-center justify-center mx-auto mb-4">
                <Trophy size={28} className="text-success" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Quiz Submitted!</h2>
              <p className="text-muted text-sm mb-6">Your score has been sent to your teacher</p>
              <div className="text-5xl font-bold mb-1 text-gradient">{assignedResult.pct}%</div>
              <p className="text-muted text-sm mb-6">
                {assignedResult.correct} of {assignedResult.total} correct
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="glass-card p-3 text-center">
                  <p className="text-success text-xl font-bold">{assignedResult.correct}</p>
                  <p className="text-xs text-muted">Correct</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-danger text-xl font-bold">{assignedResult.wrong}</p>
                  <p className="text-xs text-muted">Wrong</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-muted text-xl font-bold">{assignedResult.total - assignedResult.correct - assignedResult.wrong}</p>
                  <p className="text-xs text-muted">Skipped</p>
                </div>
              </div>
              <button onClick={() => { setTab('home'); setAssignedQuiz(null) }}
                className="btn-primary w-full justify-center">
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="glass-card p-4 mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-primary/20 text-primary-light border border-primary/30 text-xs">Assigned by Teacher</span>
                  </div>
                  <p className="font-semibold text-white">{assignedQuiz.subject}</p>
                  <p className="text-xs text-muted">
                    {assignedQuiz.type?.toUpperCase()} · {assignedQuiz.questionCount} questions
                    {assignedQuiz.chapters?.length > 0 && ` · ${assignedQuiz.chapters.join(', ')}`}
                  </p>
                </div>
                <span className={`badge ${Object.keys(assignedAnswers).length === assignedQuiz.questionCount ? 'badge-green' : 'badge-orange'}`}>
                  {Object.keys(assignedAnswers).length}/{assignedQuiz.questionCount} answered
                </span>
              </div>

              <p className="text-xs text-muted mb-4 px-1">
                You can change your answers anytime before submitting. Answers are not shown — only your score will be visible after submission.
              </p>

              {/* Questions */}
              <div className="space-y-4">
                {assignedQuiz.questions.map((q, i) => (
                  <QuizCard
                    key={i}
                    q={q}
                    idx={i}
                    answer={assignedAnswers[i]}
                    onAnswer={(v) => setAssignedAnswers(a => ({ ...a, [i]: v }))}
                    assigned={true}
                    quizType={assignedQuiz.type}
                  />
                ))}
              </div>

              {/* Submit bar */}
              <div className="mt-6 glass-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">{Object.keys(assignedAnswers).length} of {assignedQuiz.questionCount} answered</p>
                  <p className="text-xs text-muted/50 mt-0.5">You can change answers before submitting</p>
                </div>
                <button
                  onClick={submitAssignedQuiz}
                  disabled={submittingAssigned || Object.keys(assignedAnswers).length === 0}
                  className="btn-primary">
                  {submittingAssigned
                    ? <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                    : <><Send size={15} /> Submit to Teacher</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
