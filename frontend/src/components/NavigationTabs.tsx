import type { ActiveTab } from '../types'
import {
  LayoutDashboard,
  Flame,
  Activity,
  LineChart,
  BookOpen,
} from 'lucide-react'

interface NavigationTabsProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

export function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'heatwave', label: 'Heatwave Analysis', icon: Flame },
    { id: 'thermal-stress', label: 'Thermal Stress', icon: Activity },
    { id: 'forecast', label: 'Forecast & Trends', icon: LineChart },
    { id: 'methodology', label: 'Methodology & Sources', icon: BookOpen },
  ]

  return (
    <nav className="border-b border-slate-800 bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto no-scrollbar gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-teal-400 text-teal-300 bg-slate-800/40 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
