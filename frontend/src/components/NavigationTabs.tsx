import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'heatwave', label: 'Heatwave Analysis', icon: Flame },
    { id: 'thermal-stress', label: 'Thermal Stress', icon: Activity },
    { id: 'forecast', label: 'Forecast', icon: LineChart },
    { id: 'methodology', label: 'Methods & sources', icon: BookOpen },
  ]

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else return
    event.preventDefault()
    const nextTab = tabs[nextIndex]
    if (nextTab) {
      onTabChange(nextTab.id)
      tabRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <nav aria-label="Weather dashboard sections" className="site-header__tabs">
      <div role="tablist" aria-orientation="horizontal" className="site-tabs">
        {tabs.map((tab, index) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[index] = element }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="dashboard-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="flex items-center gap-2 font-medium whitespace-nowrap cursor-pointer"
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-forest-muted'}`} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
