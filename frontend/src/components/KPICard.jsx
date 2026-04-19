export default function KPICard({ icon: Icon, label, value, sub, color = 'purple', trend }) {
  const colors = {
    purple: { bg: 'bg-primary/15', text: 'text-primary-light', border: 'border-primary/20', glow: 'shadow-glow-purple' },
    cyan:   { bg: 'bg-accent/15',  text: 'text-accent',         border: 'border-accent/20',  glow: 'shadow-glow-cyan' },
    green:  { bg: 'bg-success/15', text: 'text-success',        border: 'border-success/20', glow: '' },
    orange: { bg: 'bg-warning/15', text: 'text-warning',        border: 'border-warning/20', glow: '' },
    red:    { bg: 'bg-danger/15',  text: 'text-danger',         border: 'border-danger/20',  glow: '' },
  }
  const c = colors[color] || colors.purple

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg} border ${c.border}`}>
          <Icon size={20} className={c.text} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend >= 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
          }`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-muted text-xs mt-1">{sub}</p>}
    </div>
  )
}
