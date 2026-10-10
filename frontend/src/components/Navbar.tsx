import { Server, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react'
import type { BackendHealth } from '../types'

interface NavbarProps {
  health: BackendHealth
  onRefreshHealth: () => void
}

export function Navbar({ health, onRefreshHealth }: NavbarProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand & Academic Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-inner">
            <span className="font-bold text-lg font-mono">HT</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold tracking-tight text-white font-sans">
                HeatTrick
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                Climate Intelligence Platform
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Research Prototype
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              A Data-Driven Framework for Localized Heatwave Early Warning &
              Human Thermal Stress Risk Assessment in India
            </p>
          </div>
        </div>

        {/* Backend Status & Controls */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            {health.status === "checking" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Checking backend...</span>
              </div>
            )}

            {health.status === "ok" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>FastAPI Online</span>
                {health.latencyMs !== undefined && (
                  <span className="text-emerald-500/80">
                    ({health.latencyMs}ms)
                  </span>
                )}
              </div>
            )}

            {health.status === "error" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Backend Offline</span>
              </div>
            )}

            <button
              onClick={onRefreshHealth}
              disabled={health.status === "checking"}
              title="Ping backend /api/health endpoint"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${health.status === "checking" ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 border-l border-slate-800 pl-3">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px] text-slate-400">
              heat-trick-api.onrender.com
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
