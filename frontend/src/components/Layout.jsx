import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Wand2, FileText, LogOut, Menu,
  GraduationCap, BookOpen, ChevronRight, Zap, Shield
} from 'lucide-react'

const teacherNav = [
  { path: '/teacher', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/teacher/quiz', icon: Wand2, label: 'Quiz Generator' },
  { path: '/teacher/paper', icon: FileText, label: 'Paper Generator' },
]

const studentNav = [
  { path: '/student', icon: LayoutDashboard, label: 'Dashboard' },
]

const adminNav = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = user?.role === 'teacher' ? teacherNav : user?.role === 'admin' ? adminNav : studentNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-glow-purple">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">EduPulse</p>
            <p className="text-xs text-muted">Smart Exam Prep</p>
          </div>
        </div>
      </div>

      {/* User badge */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/3 border border-white/6">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm
            ${user?.role === 'teacher' ? 'bg-primary/30' : user?.role === 'admin' ? 'bg-warning/20' : 'bg-accent/30'}`}>
            {user?.role === 'admin' ? <Shield size={16} className="text-warning" /> : user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-muted capitalize flex items-center gap-1">
              {user?.role === 'teacher' && <><GraduationCap size={10} /> Teacher</>}
              {user?.role === 'student' && <><BookOpen size={10} /> Student</>}
              {user?.role === 'admin' && <><Shield size={10} /> Administrator</>}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        <p className="text-xs font-semibold text-muted/60 uppercase tracking-wider px-4 mb-3">Navigation</p>
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => { navigate(path); setMobileOpen(false) }}
            className={`sidebar-link w-full ${location.pathname === path ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
            {location.pathname === path && <ChevronRight size={14} className="text-primary-light" />}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-border">
        <button onClick={handleLogout} className="sidebar-link w-full text-danger hover:text-danger hover:bg-danger/10">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-bg bg-mesh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-surface/50 backdrop-blur-xl flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-surface border-r border-border flex flex-col z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface/50 backdrop-blur-xl">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary-light" />
            <span className="font-bold text-white text-sm">EduPulse</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary-light font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="page-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
