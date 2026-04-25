import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  BarChart2,
  Radar,
  Eye,
  Layers,
  GitBranch,
  TrendingUp,
  Brain,
  Calendar,
  Globe,
  Bell,
  Database,
  Settings,
} from 'lucide-react'
import clsx from 'clsx'
import { useAppStore } from '../../store'

const navItems = [
  { to: '/journal', label: 'Journal', Icon: BookOpen },
  { to: '/stats', label: 'Stats', Icon: BarChart2 },
  { to: '/scanner', label: 'Scanner', Icon: Radar },
  { to: '/watchlist', label: 'Watchlist', Icon: Eye },
  { to: '/patterns', label: 'Patterns', Icon: Layers },
  { to: '/pairs', label: 'Pairs', Icon: GitBranch },
  { to: '/funding', label: 'Funding', Icon: TrendingUp },
  { to: '/psychology', label: 'Psychology', Icon: Brain },
  { to: '/review', label: 'Review', Icon: Calendar },
  { to: '/market', label: 'Market', Icon: Globe },
  { to: '/alerts', label: 'Alerts', Icon: Bell },
  { to: '/vaults', label: 'Vaults', Icon: Database },
]

export default function Sidebar() {
  const alertCount = useAppStore((s) => s.alertCount)

  return (
    <aside className="fixed top-0 left-0 h-full w-[220px] bg-surface border-r border-white/5 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-base font-black text-xs text-[#0A0A0C]">FG</span>
        </div>
        <span className="font-bold text-text1 text-sm tracking-tight">Finance GenZ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group relative',
                    isActive
                      ? 'text-accent bg-accent/10 border-l-2 border-accent -ml-px pl-[11px]'
                      : 'text-text2 hover:text-text1 hover:bg-white/5 border-l-2 border-transparent -ml-px pl-[11px]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={clsx(isActive ? 'text-accent' : 'text-text2 group-hover:text-text1')} />
                    <span className="flex-1">{label}</span>
                    {label === 'Alerts' && alertCount > 0 && (
                      <span className="bg-accent text-base text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {alertCount > 99 ? '99+' : alertCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/5 p-2">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text2 hover:text-text1 hover:bg-white/5 transition-all w-full">
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
