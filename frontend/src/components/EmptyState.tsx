import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface-alt p-6 text-center flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-lg bg-brand-soft border border-brand/20 flex items-center justify-center text-brand-ink mb-3">
        <Icon className="w-5 h-5 text-brand-ink" />
      </div>
      <h3 className="text-xs font-semibold text-ink">{title}</h3>
      <p className="text-xs text-muted max-w-md mt-1 leading-relaxed">
        {description}
      </p>

    </div>
  )
}
