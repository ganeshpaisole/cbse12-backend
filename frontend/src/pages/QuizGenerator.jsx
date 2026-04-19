import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { SUBJECTS, QUESTION_TYPES, DIFFICULTIES } from '../lib/constants'
import {
  Wand2, Loader2, Copy, Check, Printer, ChevronDown, ChevronUp,
  BookOpen, AlertCircle, Zap, RefreshCw, FileText, Hash,
  Send, Users, CheckCircle
} from 'lucide-react'

function MCQCard({ q, idx }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <span className="badge-purple text-xs font-mono flex-shrink-0 mt-0.5">Q{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-relaxed mb-3">{q.question}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {(q.options || []).map((opt, i) => (
              <div key={i} className={`text-xs p-2.5 rounded-lg border ${
                i === q.correct
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-white/3 border-white/8 text-muted'
              }`}>
                <span className="font-mono opacity-60 mr-1.5">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </div>
            ))}
          </div>
          {q.explanation && (
            <button onClick={() => setExpanded(v => !v)}
              className="text-xs text-primary-light hover:text-primary flex items-center gap-1 transition-colors">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Hide' : 'Show'} explanation
            </button>
          )}
          {expanded && q.explanation && (
            <p className="mt-2 text-xs text-muted bg-white/3 rounded-lg p-3 leading-relaxed">{q.explanation}</p>
          )}
          {q.source && <p className="text-xs text-muted/50 mt-2">📖 {q.source}</p>}
        </div>
      </div>
    </div>
  )
}

function ShortCard({ q, idx }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <span className="badge-cyan text-xs font-mono flex-shrink-0 mt-0.5">Q{idx + 1}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-white leading-relaxed mb-3">{q.question}</p>
          {q.marks && <span className="badge bg-warning/15 text-warning border border-warning/20">[{q.marks} marks]</span>}
          <div className="mt-3">
            <button onClick={() => setShown(v => !v)} className="text-xs text-accent hover:underline flex items-center gap-1">
              {shown ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {shown ? 'Hide' : 'Show'} answer
            </button>
            {shown && <p className="mt-2 text-sm text-slate-200 bg-white/3 rounded-lg p-3 leading-relaxed">{q.answer}</p>}
          </div>
          {q.ncert_ref && <p className="text-xs text-muted/50 mt-2">📖 {q.ncert_ref}</p>}
        </div>
      </div>
    </div>
  )
}

function FillCard({ q, idx }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <span className="badge bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs font-mono flex-shrink-0 mt-0.5">Q{idx + 1}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-white leading-relaxed mb-3">{q.sentence || q.question}</p>
          {q.hint && <p className="text-xs text-muted italic mb-2">Hint: {q.hint}</p>}
          <button onClick={() => setShown(v => !v)} className="text-xs text-accent hover:underline">
            {shown ? 'Hide' : 'Show'} answer
          </button>
          {shown && <p className="mt-2 text-sm font-bold text-success">{q.answer}</p>}
        </div>
      </div>
    </div>
  )
}

function AssertionCard({ q, idx }) {
  const [shown, setShown] = useState(false)
  const CHOICES = [
    'Both A and R are true and R is the correct explanation of A',
    'Both A and R are true but R is NOT the correct explanation of A',
    'A is true but R is false',
    'A is false but R is true',
  ]
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <span className="badge bg-pink-500/20 text-pink-400 border-pink-500/30 text-xs font-mono flex-shrink-0 mt-0.5">Q{idx + 1}</span>
        <div className="flex-1">
          <p className="text-xs text-muted mb-1">Assertion (A):</p>
          <p className="text-sm text-white mb-3 leading-relaxed">{q.assertion}</p>
          <p className="text-xs text-muted mb-1">Reason (R):</p>
          <p className="text-sm text-white mb-3 leading-relaxed">{q.reason}</p>
          <button onClick={() => setShown(v => !v)} className="text-xs text-accent hover:underline">
            {shown ? 'Hide' : 'Show'} answer
          </button>
          {shown && (
            <div className="mt-2">
              <p className="text-xs text-success font-semibold mb-1">Answer: ({String.fromCharCode(65 + (q.correct || 0))})</p>
              <p className="text-xs text-slate-300">{CHOICES[q.correct] || ''}</p>
              {q.explanation && <p className="text-xs text-muted mt-2">{q.explanation}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FormulaCard({ q, idx }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <span className="badge bg-accent/20 text-accent border-accent/30 text-xs font-mono flex-shrink-0 mt-0.5">#{idx + 1}</span>
        <div className="flex-1">
          <p className="font-semibold text-white mb-2">{q.name}</p>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 font-mono text-accent text-sm mb-3">
            {q.formula}
          </div>
          {q.variables && (
            <div className="text-xs text-muted space-y-1">
              {Object.entries(q.variables || {}).map(([k, v]) => (
                <p key={k}><span className="font-mono text-slate-300">{k}</span> = {v}</p>
              ))}
            </div>
          )}
          {q.usage && <p className="text-xs text-muted/70 mt-2 italic">{q.usage}</p>}
        </div>
      </div>
    </div>
  )
}

function QuestionCard({ q, idx, type }) {
  if (type === 'mcq') return <MCQCard q={q} idx={idx} />
  if (type === 'fill') return <FillCard q={q} idx={idx} />
  if (type === 'assertion') return <AssertionCard q={q} idx={idx} />
  if (type === 'formula') return <FormulaCard q={q} idx={idx} />
  return <ShortCard q={q} idx={idx} />
}

export default function QuizGenerator() {
  const { user } = useAuth()
  const [config, setConfig] = useState({
    subject: user.subjects?.[0] || '',
    chapters: [],
    type: 'mcq',
    count: 10,
    difficulty: 'mixed',
  })
  const [chapterInput, setChapterInput] = useState('')
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const chapters = SUBJECTS[config.subject] || []
  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }))

  const toggleChapter = (ch) => {
    setConfig(c => ({
      ...c,
      chapters: c.chapters.includes(ch)
        ? c.chapters.filter(x => x !== ch)
        : [...c.chapters, ch]
    }))
  }

  const sendToStudents = async () => {
    if (!questions) return
    setSending(true)
    setSent(false)
    try {
      await api.assignQuiz(user.teacherCode, user.teacherKey, {
        questions,
        subject: config.subject,
        type: config.type,
        chapters: config.chapters,
      })
      setSent(true)
      setTimeout(() => setSent(false), 4000)
    } catch (e) {
      setError('Failed to send: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  const generate = async () => {
    if (!config.subject) return
    setLoading(true)
    setError('')
    setQuestions(null)
    setSent(false)
    try {
      const data = await api.generateQuiz({
        subject: config.subject,
        chapters: config.chapters,
        type: config.type,
        count: config.count,
        difficulty: config.difficulty,
        examMode: user.examMode || 'cbse12',
      })
      const raw = data.data || data
      const qs = (Array.isArray(raw) ? raw : raw.questions || []).map(q => ({
        ...q,
        question:    q.question    || q.q,
        options:     q.options     || q.opts,
        explanation: q.explanation || q.exp,
        answer:      q.answer      || q.a,
        sentence:    q.sentence    || q.q,
      }))
      setQuestions(qs)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyAll = () => {
    if (!questions) return
    const text = questions.map((q, i) => {
      if (config.type === 'mcq') {
        return `Q${i + 1}. ${q.question}\n${(q.options || []).map((o, j) => `  ${String.fromCharCode(65+j)}. ${o}`).join('\n')}\nAnswer: ${String.fromCharCode(65 + (q.correct || 0))}`
      }
      return `Q${i + 1}. ${q.question || q.sentence || q.name}\nAnswer: ${q.answer || q.formula || ''}`
    }).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const print = () => window.print()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Quiz Generator</h1>
        <p className="text-muted text-sm mt-1">AI-powered question generation for your class</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-6">
            <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
              <Wand2 size={16} className="text-primary-light" /> Configure
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Subject</label>
                <select value={config.subject} onChange={e => set('subject', e.target.value)}
                  className="input-field bg-bg">
                  <option value="">Select subject...</option>
                  {(user.subjects?.length ? user.subjects : Object.keys(SUBJECTS)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {chapters.length > 0 && (
                <div>
                  <label className="label">Chapters <span className="text-muted/50 font-normal">(optional, multi-select)</span></label>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-white/8 p-2 bg-bg/50 no-scrollbar">
                    {chapters.map(ch => (
                      <label key={ch} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                        <input type="checkbox" checked={config.chapters.includes(ch)}
                          onChange={() => toggleChapter(ch)}
                          className="rounded accent-[#7c3aed]" />
                        <span className="text-xs text-slate-300">{ch}</span>
                      </label>
                    ))}
                  </div>
                  {config.chapters.length > 0 && (
                    <button onClick={() => set('chapters', [])} className="text-xs text-muted/60 hover:text-muted mt-1">
                      Clear selection
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="label">Question Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUESTION_TYPES.map(t => (
                    <button key={t.value} onClick={() => set('type', t.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        config.type === t.value
                          ? 'bg-primary/20 border-primary/40 text-primary-light'
                          : 'bg-white/3 border-white/8 text-muted hover:text-white hover:border-white/20'
                      }`}>
                      <p>{t.label}</p>
                      <p className="opacity-60 font-normal text-[10px]">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Count</label>
                  <select value={config.count} onChange={e => set('count', +e.target.value)}
                    className="input-field bg-bg text-sm">
                    {[5, 10, 15, 20, 25].map(n => <option key={n} value={n}>{n} Qs</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select value={config.difficulty} onChange={e => set('difficulty', e.target.value)}
                    className="input-field bg-bg text-sm">
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs mt-4">
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <button onClick={generate} disabled={loading || !config.subject}
              className="btn-primary w-full justify-center mt-5">
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
                : <><Zap size={15} /> Generate Questions</>
              }
            </button>
          </div>
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2">
          {!questions && !loading && (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-primary-light/50" />
              </div>
              <p className="text-muted text-sm">Configure and generate questions</p>
              <p className="text-muted/50 text-xs mt-1">AI will create board-exam style questions instantly</p>
            </div>
          )}

          {loading && (
            <div className="glass-card p-12 text-center">
              <Loader2 size={32} className="animate-spin text-primary-light mx-auto mb-4" />
              <p className="text-white font-medium">Generating questions...</p>
              <p className="text-muted text-xs mt-1">Claude AI is crafting {config.count} {config.type.toUpperCase()} questions</p>
            </div>
          )}

          {questions && (
            <div className="animate-fade-in">
              {/* Sent banner */}
              {sent && (
                <div className="glass-card p-4 mb-4 flex items-center gap-3 border-success/30 bg-success/5">
                  <CheckCircle size={18} className="text-success flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-success">Quiz sent to your class!</p>
                    <p className="text-xs text-muted">Students will see it on their dashboard. Answers are hidden from them.</p>
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="glass-card p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 badge-purple">
                    <Hash size={12} /> {questions.length} Questions
                  </div>
                  <span className="badge bg-white/5 text-muted border border-white/10 capitalize">{config.type}</span>
                  <span className="badge bg-white/5 text-muted border border-white/10">{config.subject}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={generate} className="btn-secondary text-xs">
                    <RefreshCw size={13} /> Regenerate
                  </button>
                  <button onClick={copyAll} className="btn-secondary text-xs">
                    {copied ? <><Check size={13} className="text-success" /> Copied!</> : <><Copy size={13} /> Copy All</>}
                  </button>
                  <button onClick={print} className="btn-secondary text-xs">
                    <Printer size={13} /> Print
                  </button>
                  <button onClick={sendToStudents} disabled={sending || sent}
                    className={`text-xs flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-semibold transition-all border ${
                      sent
                        ? 'bg-success/15 border-success/30 text-success cursor-default'
                        : 'bg-primary hover:bg-primary-light text-white border-transparent'
                    }`}
                    style={{ boxShadow: sent ? 'none' : '0 4px 15px rgba(124,58,237,0.4)' }}>
                    {sending
                      ? <><Loader2 size={13} className="animate-spin" /> Sending...</>
                      : sent
                      ? <><CheckCircle size={13} /> Sent!</>
                      : <><Send size={13} /> Send to Students</>
                    }
                  </button>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionCard key={i} q={q} idx={i} type={config.type} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
