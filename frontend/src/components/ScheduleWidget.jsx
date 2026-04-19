import { useState } from 'react'
import { Plus, Trash2, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { DAYS, TIME_SLOTS } from '../lib/constants'

const STORAGE_KEY = 'edu_schedule'

function loadSchedule() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}
function saveSchedule(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }

const SUBJECT_COLORS = [
  'bg-primary/20 text-primary-light border-primary/30',
  'bg-accent/20 text-accent border-accent/30',
  'bg-success/20 text-success border-success/30',
  'bg-warning/20 text-warning border-warning/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
]

export default function ScheduleWidget({ subjects = [] }) {
  const today = new Date()
  const todayName = DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1]
  const [view, setView] = useState('week') // week | day
  const [selectedDay, setSelectedDay] = useState(todayName)
  const [schedule, setSchedule] = useState(loadSchedule)
  const [adding, setAdding] = useState(null) // { day, time }
  const [form, setForm] = useState({ subject: '', topic: '', duration: 60 })

  const addSlot = () => {
    if (!form.subject) return
    const key = `${adding.day}__${adding.time}`
    const updated = { ...schedule, [key]: { ...form, color: SUBJECT_COLORS[subjects.indexOf(form.subject) % SUBJECT_COLORS.length] || SUBJECT_COLORS[0] } }
    setSchedule(updated)
    saveSchedule(updated)
    setAdding(null)
    setForm({ subject: '', topic: '', duration: 60 })
  }

  const removeSlot = (key) => {
    const updated = { ...schedule }
    delete updated[key]
    setSchedule(updated)
    saveSchedule(updated)
  }

  const getSlot = (day, time) => schedule[`${day}__${time}`]

  const todaySlots = TIME_SLOTS
    .map(t => ({ time: t, slot: getSlot(selectedDay, t) }))
    .filter(x => x.slot)

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-white">Class Schedule</h3>
          <p className="text-xs text-muted mt-0.5">Manage your weekly timetable</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('week')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${view === 'week' ? 'bg-primary/20 text-primary-light border border-primary/30' : 'bg-white/5 text-muted hover:text-white'}`}>
            Week
          </button>
          <button onClick={() => setView('day')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${view === 'day' ? 'bg-primary/20 text-primary-light border border-primary/30' : 'bg-white/5 text-muted hover:text-white'}`}>
            Day
          </button>
        </div>
      </div>

      {view === 'week' ? (
        <div className="overflow-x-auto no-scrollbar">
          <div className="min-w-[640px]">
            {/* Day headers */}
            <div className="grid gap-1" style={{ gridTemplateColumns: '72px repeat(6, 1fr)' }}>
              <div />
              {DAYS.map(d => (
                <button key={d} onClick={() => { setSelectedDay(d); setView('day') }}
                  className={`text-center py-2 rounded-lg text-xs font-semibold transition-all ${
                    d === todayName ? 'bg-primary/20 text-primary-light border border-primary/30' : 'text-muted hover:text-white hover:bg-white/5'
                  }`}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
            {/* Time slots */}
            {TIME_SLOTS.map(time => (
              <div key={time} className="grid gap-1 mt-1" style={{ gridTemplateColumns: '72px repeat(6, 1fr)' }}>
                <div className="text-right pr-3 text-xs text-muted/60 pt-1.5">{time}</div>
                {DAYS.map(day => {
                  const slot = getSlot(day, time)
                  return (
                    <div key={day}
                      className={`min-h-[32px] rounded-lg border transition-all cursor-pointer group relative
                        ${slot ? `${slot.color} border-current/30` : 'border-white/5 hover:border-primary/20 hover:bg-primary/5'}`}
                      onClick={() => slot ? null : setAdding({ day, time })}>
                      {slot && (
                        <>
                          <p className="text-xs font-medium px-2 py-1 truncate">{slot.subject}</p>
                          <button onClick={(e) => { e.stopPropagation(); removeSlot(`${day}__${time}`) }}
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/20 transition-all">
                            <Trash2 size={9} />
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Day selector */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelectedDay(DAYS[Math.max(0, DAYS.indexOf(selectedDay) - 1)])}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="font-semibold text-white">{selectedDay}</p>
              {selectedDay === todayName && <span className="badge-purple text-xs">Today</span>}
            </div>
            <button onClick={() => setSelectedDay(DAYS[Math.min(DAYS.length - 1, DAYS.indexOf(selectedDay) + 1)])}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {todaySlots.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <Clock size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No classes scheduled</p>
              <button onClick={() => setAdding({ day: selectedDay, time: '09:00' })}
                className="text-xs text-primary-light mt-2 hover:underline">+ Add class</button>
            </div>
          ) : (
            <div className="space-y-2">
              {TIME_SLOTS.map(time => {
                const slot = getSlot(selectedDay, time)
                return slot ? (
                  <div key={time} className={`flex items-center gap-3 p-3 rounded-xl border ${slot.color} group`}>
                    <div className="text-xs font-mono w-10 opacity-70">{time}</div>
                    <BookOpen size={14} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{slot.subject}</p>
                      {slot.topic && <p className="text-xs opacity-70 truncate">{slot.topic}</p>}
                    </div>
                    <span className="text-xs opacity-60">{slot.duration}m</span>
                    <button onClick={() => removeSlot(`${selectedDay}__${time}`)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/20 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : null
              })}
            </div>
          )}

          <button onClick={() => setAdding({ day: selectedDay, time: '09:00' })}
            className="mt-3 w-full btn-secondary text-sm justify-center">
            <Plus size={14} /> Add Class
          </button>
        </div>
      )}

      {/* Add slot modal */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAdding(null)} />
          <div className="relative glass-card p-6 w-full max-w-sm animate-slide-up">
            <h3 className="font-semibold text-white mb-4">Add Class — {adding.day} {adding.time}</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Subject</label>
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="input-field bg-card">
                  <option value="">Select subject...</option>
                  {(subjects.length ? subjects : Object.keys({})).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Topic (optional)</label>
                <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Electrostatics Ch. 1"
                  className="input-field" />
              </div>
              <div>
                <label className="label">Time slot</label>
                <select value={adding.time} onChange={e => setAdding(a => ({ ...a, time: e.target.value }))}
                  className="input-field bg-card">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Duration</label>
                <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))}
                  className="input-field bg-card">
                  {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setAdding(null)} className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
              <button onClick={addSlot} className="btn-primary flex-1 justify-center text-sm">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
