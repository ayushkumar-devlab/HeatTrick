import { ShieldAlert } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 px-4 sm:px-6 mt-12 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-semibold text-slate-300">HeatTrick</span>
          <span>•</span>
          <span>Academic Research Prototype</span>
          <span>•</span>
          <span>College Research Project</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 text-center md:text-right">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
          <span>
            Non-governmental prototype. Not an official heatwave early warning service. Consult IMD / NDMA for statutory advisories.
          </span>
        </div>
      </div>
    </footer>
  )
}

