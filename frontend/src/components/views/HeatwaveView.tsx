import { Flame, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react'
import type { Station } from '../../types'
import { EmptyState } from '../EmptyState'

interface HeatwaveViewProps {
  selectedStation: Station
}

export function HeatwaveView({ selectedStation }: HeatwaveViewProps) {
  return (
    <div className="space-y-6">
      {/* Title & Scope */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Meteorological Heatwave Classification Engine (IMD Criteria)
            </h2>
            <p className="text-xs text-slate-400">
              Diagnostic mathematical evaluation based on India Meteorological Department (IMD) standards
            </p>
          </div>
        </div>

        <div className="p-3 mt-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300">Methodological Transparency Notice: </strong>
            HeatTrick implements the mathematical formulas defined by the IMD for research diagnostics.
            It does not issue statutory weather warnings or replace official bulletins published by IMD observatories.
          </div>
        </div>
      </div>

      {/* Official IMD Criteria Reference Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>IMD Heatwave Classification Rules by Terrain</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-2.5 px-3">Terrain Category</th>
                <th className="py-2.5 px-3">Base Threshold (Tmax)</th>
                <th className="py-2.5 px-3">Heatwave Criteria</th>
                <th className="py-2.5 px-3">Severe Heatwave Criteria</th>
                <th className="py-2.5 px-3">Absolute Criteria (No Normal Required)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              <tr className={selectedStation.imdCriteriaType === 'Plains' ? 'bg-teal-950/20 text-teal-200' : ''}>
                <td className="py-2.5 px-3 font-sans font-medium">
                  Plains {selectedStation.imdCriteriaType === 'Plains' && '(Current Station)'}
                </td>
                <td className="py-2.5 px-3">Tmax ≥ 40.0°C</td>
                <td className="py-2.5 px-3 text-amber-300">Departure +4.5°C to +6.4°C</td>
                <td className="py-2.5 px-3 text-rose-400">Departure &gt; +6.4°C</td>
                <td className="py-2.5 px-3">Tmax ≥ 45.0°C (HW), ≥ 47.0°C (SHW)</td>
              </tr>
              <tr className={selectedStation.imdCriteriaType === 'Coastal' ? 'bg-teal-950/20 text-teal-200' : ''}>
                <td className="py-2.5 px-3 font-sans font-medium">
                  Coastal {selectedStation.imdCriteriaType === 'Coastal' && '(Current Station)'}
                </td>
                <td className="py-2.5 px-3">Tmax ≥ 37.0°C</td>
                <td className="py-2.5 px-3 text-amber-300">Departure ≥ +4.5°C</td>
                <td className="py-2.5 px-3 text-rose-400">Departure &gt; +6.4°C</td>
                <td className="py-2.5 px-3">Tmax ≥ 40.0°C</td>
              </tr>
              <tr className={selectedStation.imdCriteriaType === 'Hilly' ? 'bg-teal-950/20 text-teal-200' : ''}>
                <td className="py-2.5 px-3 font-sans font-medium">
                  Hilly Regions {selectedStation.imdCriteriaType === 'Hilly' && '(Current Station)'}
                </td>
                <td className="py-2.5 px-3">Tmax ≥ 30.0°C</td>
                <td className="py-2.5 px-3 text-amber-300">Departure +4.5°C to +6.4°C</td>
                <td className="py-2.5 px-3 text-rose-400">Departure &gt; +6.4°C</td>
                <td className="py-2.5 px-3">N/A (Departure-driven)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Spatial & Temporal Declaration Conditions */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
            <span>Sub-divisional Spatial & Temporal Rules</span>
          </div>
          <p>
            An official IMD declaration requires at least two stations within a meteorological sub-division meeting these criteria for at least two consecutive days. In localized single-station research diagnostics, HeatTrick tracks these as station-level precursor signals.
          </p>
        </div>
      </div>

      {/* Diagnostic Evaluation State for Selected Station */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Station Evaluation Status: {selectedStation.name}
            </h3>
            <p className="text-xs text-slate-400">
              Criteria Profile: {selectedStation.imdCriteriaType} Zone ({selectedStation.zone})
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-mono">
            Status: Diagnostic Engine Pending
          </span>
        </div>

        <EmptyState
          icon={Flame}
          title="Climatological Normal & Daily Observations Required"
          description={`To evaluate heatwave conditions at ${selectedStation.name}, the engine requires historical climatology normals (1991–2020 baseline) and current daily maximum temperature (Tmax) records. This will be computed in Module 2.`}
          moduleNotice="Module 2: Climatology & Anomaly Detection Engine"
          expectedParams={[
            'Observed Tmax (°C)',
            'Station Normal Tmax (°C)',
            'Departure (ΔT = Tmax - Normal)',
            'Consecutive Days Counter',
            'Diagnostic Category (Normal / Heatwave / Severe Heatwave)',
          ]}
        />
      </div>
    </div>
  )
}
