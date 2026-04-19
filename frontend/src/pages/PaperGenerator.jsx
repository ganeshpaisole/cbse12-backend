import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { SUBJECTS, DIFFICULTIES, EXAM_MODES } from '../lib/constants'
import {
  FileText, Loader2, Printer, ChevronDown, ChevronUp,
  BookOpen, AlertCircle, Zap, RefreshCw, Clock,
  Award, Settings, Eye, EyeOff, CheckSquare
} from 'lucide-react'

const DURATIONS = ['1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours']
const MARK_PRESETS = [35, 40, 50, 70, 80, 100]

const Q_TYPE_LABELS = {
  mcq: 'MCQ', vsa: 'Very Short Answer', sa: 'Short Answer',
  la: 'Long Answer', casebased: 'Case-Based',
}

function InstructionsList({ instructions }) {
  return (
    <ol className="list-decimal pl-5 space-y-1">
      {instructions.map((inst, i) => (
        <li key={i} className="text-sm text-slate-700 leading-relaxed">{inst}</li>
      ))}
    </ol>
  )
}

function QuestionBlock({ q, showKey, sectionType }) {
  const isChoice = q.qText?.includes('\nOR\n') || q.qText?.toLowerCase().includes('\nor\n')
  const parts = isChoice ? q.qText.split(/\nOR\n/i) : [q.qText]

  return (
    <div className="mb-5">
      <div className="flex gap-3">
        <span className="font-semibold text-slate-800 text-sm flex-shrink-0 w-7">{q.qNum}.</span>
        <div className="flex-1">
          {parts.map((part, pi) => (
            <div key={pi}>
              {pi > 0 && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 border-t border-dashed border-slate-300" />
                  <span className="text-xs font-bold text-slate-500 px-2">OR</span>
                  <div className="flex-1 border-t border-dashed border-slate-300" />
                </div>
              )}
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{part.trim()}</p>
            </div>
          ))}

          {/* MCQ options */}
          {sectionType === 'mcq' && q.opts && q.opts.length > 0 && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2.5">
              {q.opts.map((opt, i) => (
                <p key={i} className="text-sm text-slate-700">{opt}</p>
              ))}
            </div>
          )}

          {/* Marks badge */}
          <div className="flex items-center justify-between mt-2">
            <div />
            <span className="text-xs text-slate-500 font-medium">[{q.marks} mark{q.marks !== 1 ? 's' : ''}]</span>
          </div>

          {/* Answer key */}
          {showKey && (q.answerKey || q.answerExplanation) && (
            <div className="mt-2 pl-3 border-l-2 border-green-400 bg-green-50 rounded-r-lg py-2 pr-3">
              {q.answerKey && (
                <p className="text-xs font-semibold text-green-700 mb-0.5">
                  Answer: <span className="font-normal">{q.answerKey}</span>
                </p>
              )}
              {q.answerExplanation && (
                <p className="text-xs text-green-600 leading-relaxed">{q.answerExplanation}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionBlock({ section, showKey }) {
  return (
    <div className="mb-8">
      <div className="border-b-2 border-slate-800 pb-2 mb-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-bold text-slate-800 text-base">{section.sectionName}</h3>
          <span className="text-sm font-semibold text-slate-600">[{section.totalMarks} Marks]</span>
        </div>
        {section.sectionDesc && (
          <p className="text-xs text-slate-500 mt-1 italic">{section.sectionDesc}</p>
        )}
      </div>
      {(section.questions || []).map((q, i) => (
        <QuestionBlock key={i} q={q} showKey={showKey} sectionType={section.qType} />
      ))}
    </div>
  )
}

function PaperView({ paper, showKey, setShowKey, onRegenerate, loading }) {
  const printRef = useRef()

  const handlePrint = () => {
    const content = printRef.current
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
      <head>
        <title>${paper.paperTitle}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Times New Roman', serif; color: #1a1a1a; background: white; padding: 20px; }
          .paper { max-width: 820px; margin: 0 auto; }
          .header-box { border: 2px solid #1a1a1a; padding: 16px; text-align: center; margin-bottom: 20px; }
          .header-box h1 { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .header-box h2 { font-size: 15px; font-weight: bold; margin: 6px 0; }
          .meta-row { display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; }
          .instructions { border: 1px solid #666; padding: 12px; margin-bottom: 20px; background: #fafafa; }
          .instructions h4 { font-size: 13px; font-weight: bold; margin-bottom: 6px; }
          .instructions ol { padding-left: 20px; }
          .instructions li { font-size: 12px; margin-bottom: 3px; line-height: 1.5; }
          .section-header { border-bottom: 2px solid #1a1a1a; padding-bottom: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: baseline; }
          .section-header h3 { font-size: 14px; font-weight: bold; }
          .section-desc { font-size: 11px; color: #555; margin-top: 3px; font-style: italic; }
          .section { margin-bottom: 28px; }
          .question { display: flex; gap: 10px; margin-bottom: 16px; }
          .q-num { font-weight: bold; font-size: 13px; width: 24px; flex-shrink: 0; }
          .q-body { flex: 1; }
          .q-text { font-size: 13px; line-height: 1.6; white-space: pre-line; }
          .opts { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-top: 8px; }
          .opt { font-size: 12px; }
          .marks { text-align: right; font-size: 11px; color: #555; margin-top: 4px; }
          .or-divider { display: flex; align-items: center; gap: 8px; margin: 10px 0; }
          .or-divider span { font-size: 11px; font-weight: bold; color: #555; }
          .or-line { flex: 1; border-top: 1px dashed #999; }
          .answer-block { margin-top: 6px; padding: 6px 8px; border-left: 3px solid #16a34a; background: #f0fdf4; border-radius: 0 4px 4px 0; }
          .answer-block .ans-label { font-size: 11px; font-weight: bold; color: #15803d; }
          .answer-block .ans-exp { font-size: 11px; color: #166534; margin-top: 2px; line-height: 1.5; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="paper">${content.innerHTML}</div>
      </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const totalQs = paper.sections?.reduce((a, s) => a + (s.questions?.length || 0), 0) || 0

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="glass-card p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="badge-purple flex items-center gap-1.5">
            <FileText size={11} /> {totalQs} Questions
          </span>
          <span className="badge bg-white/5 text-muted border border-white/10">{paper.totalMarks} Marks</span>
          <span className="badge bg-white/5 text-muted border border-white/10 flex items-center gap-1">
            <Clock size={10} /> {paper.duration}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowKey(v => !v)}
            className={`btn-secondary text-xs ${showKey ? 'border-success/40 text-success' : ''}`}>
            {showKey ? <><EyeOff size={13} /> Hide Key</> : <><Eye size={13} /> Answer Key</>}
          </button>
          <button onClick={onRegenerate} disabled={loading} className="btn-secondary text-xs">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Regenerate
          </button>
          <button onClick={handlePrint} className="btn-primary text-xs">
            <Printer size={13} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Paper */}
      <div className="glass-card overflow-hidden">
        <div ref={printRef} className="bg-white text-slate-900 p-8 md:p-10">
          {/* Header */}
          <div className="border-2 border-slate-800 p-5 text-center mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Sample / Practice Paper
            </p>
            <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">
              {paper.paperTitle}
            </h1>
            <div className="flex flex-wrap justify-between mt-4 text-sm font-medium text-slate-700 gap-2">
              <span>Time Allowed: {paper.duration}</span>
              <span>Date: {paper.examDate}</span>
              <span>Maximum Marks: {paper.totalMarks}</span>
            </div>
          </div>

          {/* Instructions */}
          {paper.generalInstructions?.length > 0 && (
            <div className="border border-slate-300 bg-slate-50 rounded-lg p-4 mb-8">
              <h4 className="font-bold text-slate-800 text-sm mb-3 uppercase tracking-wide">
                General Instructions
              </h4>
              <InstructionsList instructions={paper.generalInstructions} />
            </div>
          )}

          {/* Sections */}
          {(paper.sections || []).map((section, i) => (
            <SectionBlock key={i} section={section} showKey={showKey} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PaperGenerator() {
  const { user } = useAuth()
  const [config, setConfig] = useState({
    subject: user.subjects?.[0] || '',
    chapters: [],
    totalMarks: 70,
    duration: '3 hours',
    difficulty: 'mixed',
    examMode: user.examMode || 'cbse12',
    includeChoice: true,
    teacherNote: '',
  })
  const [paper, setPaper] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [chapterOpen, setChapterOpen] = useState(false)

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

  const generate = async () => {
    if (!config.subject) return
    setLoading(true)
    setError('')
    try {
      const res = await api.generatePaper({
        subject: config.subject,
        chapters: config.chapters,
        totalMarks: config.totalMarks,
        duration: config.duration,
        difficulty: config.difficulty,
        examMode: config.examMode,
        includeChoice: config.includeChoice,
        teacherNote: config.teacherNote || undefined,
      })
      setPaper(res.data || res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Exam Paper Generator</h1>
        <p className="text-muted text-sm mt-1">Generate full board-exam style papers with answer key</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-6">
            <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
              <Settings size={16} className="text-primary-light" /> Paper Settings
            </h3>

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="label">Subject</label>
                <select value={config.subject}
                  onChange={e => { set('subject', e.target.value); set('chapters', []) }}
                  className="input-field bg-bg">
                  <option value="">Select subject...</option>
                  {(user.subjects?.length ? user.subjects : Object.keys(SUBJECTS)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Chapters */}
              {chapters.length > 0 && (
                <div>
                  <label className="label">
                    Chapters
                    <span className="text-muted/50 font-normal ml-1">
                      {config.chapters.length > 0 ? `(${config.chapters.length} selected)` : '(all)'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setChapterOpen(v => !v)}
                    className="input-field bg-bg flex items-center justify-between cursor-pointer text-sm">
                    <span className="text-muted truncate">
                      {config.chapters.length === 0
                        ? 'Full syllabus (all chapters)'
                        : config.chapters.length === 1
                        ? config.chapters[0]
                        : `${config.chapters[0]} +${config.chapters.length - 1} more`}
                    </span>
                    {chapterOpen ? <ChevronUp size={14} className="text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-muted flex-shrink-0" />}
                  </button>
                  {chapterOpen && (
                    <div className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-bg/80 p-2 space-y-0.5">
                      {chapters.map(ch => (
                        <label key={ch}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                          <input type="checkbox" checked={config.chapters.includes(ch)}
                            onChange={() => toggleChapter(ch)}
                            className="rounded accent-[#7c3aed]" />
                          <span className="text-xs text-slate-300 leading-tight">{ch}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {config.chapters.length > 0 && (
                    <button onClick={() => set('chapters', [])}
                      className="text-xs text-muted/60 hover:text-muted mt-1">
                      Clear — use full syllabus
                    </button>
                  )}
                </div>
              )}

              {/* Total Marks */}
              <div>
                <label className="label">Total Marks</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {MARK_PRESETS.map(m => (
                    <button key={m} onClick={() => set('totalMarks', m)}
                      className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                        config.totalMarks === m
                          ? 'bg-primary/20 border-primary/40 text-primary-light'
                          : 'bg-white/3 border-white/8 text-muted hover:text-white hover:border-white/20'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="label">Duration</label>
                <select value={config.duration} onChange={e => set('duration', e.target.value)}
                  className="input-field bg-bg">
                  {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Difficulty + Exam Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Difficulty</label>
                  <select value={config.difficulty} onChange={e => set('difficulty', e.target.value)}
                    className="input-field bg-bg text-sm">
                    {DIFFICULTIES.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Exam Mode</label>
                  <select value={config.examMode} onChange={e => set('examMode', e.target.value)}
                    className="input-field bg-bg text-sm">
                    {Object.entries(EXAM_MODES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Include internal choice */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-10 h-5 rounded-full border transition-all flex items-center px-0.5 ${
                  config.includeChoice
                    ? 'bg-primary border-primary'
                    : 'bg-white/5 border-white/20'
                }`}
                  onClick={() => set('includeChoice', !config.includeChoice)}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    config.includeChoice ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Include internal choice (OR)
                </span>
              </label>

              {/* Teacher note */}
              <div>
                <label className="label">
                  Instructions to AI <span className="text-muted/50 font-normal">(optional)</span>
                </label>
                <textarea
                  value={config.teacherNote}
                  onChange={e => set('teacherNote', e.target.value)}
                  placeholder="e.g. Focus more on numericals, avoid derivations..."
                  rows={3}
                  className="input-field bg-bg resize-none text-sm leading-relaxed"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs mt-4">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button onClick={generate} disabled={loading || !config.subject}
              className="btn-primary w-full justify-center mt-5">
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Generating Paper...</>
                : <><Zap size={15} /> Generate Paper</>
              }
            </button>

            {paper && !loading && (
              <button onClick={generate} className="btn-secondary w-full justify-center mt-2 text-sm">
                <RefreshCw size={13} /> Regenerate
              </button>
            )}
          </div>
        </div>

        {/* Paper panel */}
        <div className="lg:col-span-2">
          {!paper && !loading && (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-primary-light/50" />
              </div>
              <p className="text-muted text-sm">Configure paper settings and generate</p>
              <p className="text-muted/50 text-xs mt-1">
                AI will create a full board-exam paper with sections, questions, and answer key
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[
                  { icon: BookOpen, label: 'Sections A–E' },
                  { icon: CheckSquare, label: 'Answer Key' },
                  { icon: Printer, label: 'Print Ready' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="glass-card p-3 text-center">
                    <Icon size={16} className="text-primary-light mx-auto mb-1.5" />
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="glass-card p-12 text-center">
              <Loader2 size={36} className="animate-spin text-primary-light mx-auto mb-4" />
              <p className="text-white font-medium">Generating exam paper...</p>
              <p className="text-muted text-xs mt-1">
                Claude AI is crafting a full {config.totalMarks}-mark {config.subject} paper
              </p>
              <p className="text-muted/50 text-xs mt-3">This may take 15–30 seconds</p>
            </div>
          )}

          {paper && !loading && (
            <PaperView
              paper={paper}
              showKey={showKey}
              setShowKey={setShowKey}
              onRegenerate={generate}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  )
}
