import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  moduleNotice?: string
  expectedParams?: string[]
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  moduleNotice,
  expectedParams,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-center flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="text-xs font-semibold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
        {description}
      </p>

      {moduleNotice && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/60 border border-slate-700/60 text-[11px] text-teal-300 font-mono">
          <span>Pipeline Status:</span>
          <span className="text-slate-300">{moduleNotice}</span>
        </div>
      )}

      {expectedParams && expectedParams.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 w-full max-w-md">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Expected Meteorological Parameters
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {expectedParams.map((param) => (
              <span
                key={param}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono"
              >
                {param}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
