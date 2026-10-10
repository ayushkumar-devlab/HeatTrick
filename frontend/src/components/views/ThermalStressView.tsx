import { Activity, ShieldCheck, HeartPulse, Gauge } from 'lucide-react'
import type { Station } from '../../types'
import { EmptyState } from '../EmptyState'

interface ThermalStressViewProps {
  selectedStation: Station
}

export function ThermalStressView({ selectedStation }: ThermalStressViewProps) {
  const wbgtBands = [
    { range: '< 27.7 °C', category: 'Low Risk', workRest: 'Normal activity', color: 'text-emerald-400', border: 'border-emerald-500/30' },
    { range: '27.7 – 29.4 °C', category: 'Moderate Risk', workRest: '75% work / 25% rest per hour', color: 'text-amber-400', border: 'border-amber-500/30' },
    { range: '29.4 – 31.1 °C', category: 'High Risk', workRest: '50% work / 50% rest per hour', color: 'text-orange-400', border: 'border-orange-500/30' },
    { range: '31.1 – 32.2 °C', category: 'Very High Risk', workRest: '25% work / 75% rest per hour', color: 'text-rose-400', border: 'border-rose-500/30' },
    { range: '> 32.2 °C', category: 'Extreme Danger', workRest: 'Suspend non-essential outdoor work', color: 'text-red-500', border: 'border-red-500/30' },
  ]

  const heatIndexBands = [
    { range: '< 27 °C', category: 'Normal', note: 'No significant thermal discomfort' },
    { range: '27 – 32 °C', category: 'Caution', note: 'Fatigue possible with prolonged exposure' },
    { range: '32 – 41 °C', category: 'Extreme Caution', note: 'Heat cramps and heat exhaustion possible' },
    { range: '41 – 54 °C', category: 'Danger', note: 'Heat exhaustion likely, heatstroke possible' },
    { range: '> 54 °C', category: 'Extreme Danger', note: 'Heatstroke highly imminent' },
  ]

  return (
    <div className="space-y-6">
      {/* Title & Scope */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Human Thermal Stress & Biometeorological Assessment
            </h2>
            <p className="text-xs text-slate-400">
              Assessing occupational heat strain, evaporative cooling failure, and physiological vulnerability
            </p>
          </div>
        </div>

        <div className="p-3 mt-3 rounded-lg bg-teal-950/20 border border-teal-500/30 text-teal-200/90 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-teal-300">Biometeorological Distinction: </strong>
            Unlike meteorological heatwaves (which measure atmospheric temperature), human thermal stress models the physiological energy balance between the human body and its environment. High atmospheric humidity impairs sweat evaporation, causing dangerous core body heating even at moderate temperatures (35°C–38°C).
          </div>
        </div>
      </div>

      {/* WBGT & Heat Index Reference Standards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WBGT Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-teal-400" />
              <span>Wet-Bulb Globe Temperature (WBGT)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">ISO 7243 Standard</span>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Standard ISO 7243 WBGT relies on natural wet-bulb, black globe, and dry-bulb thermometers. HeatTrick computes an <strong>empirical outdoor WBGT estimate</strong> from ambient variables, documenting known error bounds under low-wind conditions.
          </p>

          <div className="space-y-2">
            {wbgtBands.map((band) => (
              <div
                key={band.range}
                className={`flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border ${band.border} text-xs`}
              >
                <div>
                  <span className={`font-mono font-bold ${band.color}`}>{band.range}</span>
                  <span className="text-slate-400 ml-2 font-medium">({band.category})</span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">{band.workRest}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NOAA Heat Index Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>NOAA Heat Index (Apparent Temperature)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Rothfusz Regression</span>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            The Heat Index measures perceived temperature combining dry-bulb air temperature and relative humidity, reflecting reduced bodily heat dissipation through evaporative sweating.
          </p>

          <div className="space-y-2">
            {heatIndexBands.map((band) => (
              <div
                key={band.range}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-200">{band.range}</span>
                  <span className="text-amber-400 ml-2 font-medium">({band.category})</span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">{band.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Station Assessment State */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Thermal Strain Diagnostics for {selectedStation.name}
            </h3>
            <p className="text-xs text-slate-400">
              Microclimate zone: {selectedStation.zone}
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-mono">
            Engine: Ready for Ingestion Feed
          </span>
        </div>

        <EmptyState
          icon={Activity}
          title="Concurrent Temperature & Moisture Feed Required"
          description={`To compute WBGT and Heat Index for ${selectedStation.name}, simultaneous air temperature, surface humidity, solar radiation, and wind velocity must be ingested. This calculation engine will be implemented in Module 3.`}
          moduleNotice="Module 3: Biometeorological Stress Indices Engine"
          expectedParams={[
            'Ambient Air Temp (T_air, °C)',
            'Relative Humidity (RH, %)',
            'Dew Point Temperature (Td, °C)',
            'Estimated Natural Wet-Bulb (Tw, °C)',
            'Outdoor WBGT Estimate (°C)',
            'NOAA Heat Index (°C)',
          ]}
        />
      </div>
    </div>
  )
}
