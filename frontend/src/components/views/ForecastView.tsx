import { LineChart, Calendar, BellRing, RefreshCw, AlertTriangle, Wind, Droplets, ThermometerSun } from 'lucide-react'
import type { Station, WeatherState } from '../../types'
import { EmptyState } from '../EmptyState'

interface ForecastViewProps {
  selectedStation: Station
  weatherState: WeatherState
  onRefreshWeather: () => void
}

export function ForecastView({
  selectedStation,
  weatherState,
  onRefreshWeather,
}: ForecastViewProps) {
  const daily = weatherState.data?.daily
  const metadata = weatherState.data?.metadata

  const alertLevels = [
    {
      level: 'Green (Normal)',
      desc: 'Comfortable / Normal temperature conditions expected across the forecast window.',
      action: 'Standard operational awareness.',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      level: 'Yellow (Watch / Be Updated)',
      desc: 'Moderate heatwave conditions likely to persist for 1–2 days. Elevated thermal discomfort for vulnerable groups.',
      action: 'Advisory to outdoor workers; hydration campaigns active.',
      border: 'border-yellow-500/30',
      badge: 'bg-yellow-500/10 text-yellow-400',
    },
    {
      level: 'Orange (Alert / Be Prepared)',
      desc: 'Severe heatwave conditions likely for 2 days or prolonged heatwave for 4+ days. Significant health hazard.',
      action: 'Schedule adjustments for outdoor shifts, cooling centers activated.',
      border: 'border-orange-500/30',
      badge: 'bg-orange-500/10 text-orange-400',
    },
    {
      level: 'Red (Warning / Take Action)',
      desc: 'Severe heatwave persisting >2 days or total max temp ≥ 47.0°C. Very high risk of heat illness across all age groups.',
      action: 'Emergency public health response; suspension of strenuous outdoor labor during peak hours (12 PM–4 PM).',
      border: 'border-rose-500/30',
      badge: 'bg-rose-500/10 text-rose-400',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Title & Scope */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                7-Day Numerical Weather Forecast & Trend Projections
              </h2>
              <p className="text-xs text-slate-400">
                Multi-day meteorological parameters for {selectedStation.name} ({selectedStation.state})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {weatherState.isLoading ? (
              <span className="flex items-center gap-1.5 text-xs text-sky-400 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading forecast...</span>
              </span>
            ) : (
              <button
                onClick={onRefreshWeather}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Forecast</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Numerical weather predictions provide 1–7 day forward visibility. In this foundation stage, raw meteorological forecast parameters are retrieved directly from Open-Meteo NWP models. Analytical risk-band scoring will be computed in Module 5.
        </p>
      </div>

      {/* Error Notice */}
      {weatherState.error && !weatherState.isLoading && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Failed to load forecast data: {weatherState.error}</span>
          </div>
          <button
            onClick={onRefreshWeather}
            className="px-2.5 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/60 text-rose-200 text-xs font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Real 7-Day Forecast Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">
              7-Day Daily Forecast Horizon for {selectedStation.name}
            </h3>
          </div>
          {metadata && (
            <span className="text-[11px] text-slate-400 font-mono">
              Provider: {metadata.source} ({metadata.model})
            </span>
          )}
        </div>

        {daily && daily.time.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {daily.time.slice(0, 7).map((dayTime, idx) => {
                const dateObj = new Date(dayTime)
                const isToday = idx === 0
                const dayName = isToday ? 'Today' : dateObj.toLocaleDateString('en-IN', { weekday: 'short' })
                const fullDate = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                const tmax = daily.temperature_2m_max[idx]
                const tmin = daily.temperature_2m_min[idx]
                const apparentMax = daily.apparent_temperature_max[idx]
                const windMax = daily.wind_speed_10m_max[idx]
                const precip = daily.precipitation_sum[idx]

                return (
                  <div
                    key={dayTime}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                      isToday
                        ? 'bg-slate-800/80 border-teal-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{dayName}</span>
                        {isToday && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mb-3">{fullDate}</div>

                      {/* Temperature Metrics */}
                      <div className="space-y-1 mb-3">
                        <div className="text-xs text-slate-400 flex justify-between">
                          <span>Tmax:</span>
                          <span className="font-bold text-amber-300 font-mono">
                            {tmax !== null && tmax !== undefined ? `${tmax.toFixed(1)}°C` : '--'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex justify-between">
                          <span>Tmin:</span>
                          <span className="text-sky-300 font-mono">
                            {tmin !== null && tmin !== undefined ? `${tmin.toFixed(1)}°C` : '--'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
                          <span>Feels max:</span>
                          <span className="text-slate-300 font-mono">
                            {apparentMax !== null && apparentMax !== undefined ? `${apparentMax.toFixed(1)}°C` : '--'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Weather Parameters */}
                    <div className="space-y-1 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px]">
                          <Wind className="w-3 h-3 text-slate-500" />
                          <span>Wind:</span>
                        </span>
                        <span className="font-mono text-slate-300 text-[10px]">
                          {windMax !== null && windMax !== undefined ? `${windMax.toFixed(1)} m/s` : '--'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px]">
                          <Droplets className="w-3 h-3 text-sky-500" />
                          <span>Precip:</span>
                        </span>
                        <span className="font-mono text-slate-300 text-[10px]">
                          {precip !== null && precip !== undefined ? `${precip.toFixed(1)} mm` : '0 mm'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <ThermometerSun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Methodology Note: </strong>
                Forecast parameters shown above are raw numerical weather model forecasts from Open-Meteo. Heat Action Plan (HAP) color alert classification and thermal stress index projections will be connected in Module 5.
              </span>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={LineChart}
            title="Numerical Weather Prediction (NWP) Stream Inactive"
            description={`Click refresh or select a station to retrieve the 7-day numerical weather forecast for ${selectedStation.name}.`}
            moduleNotice="Module 1 Open-Meteo Forecast Stream"
            expectedParams={[
              'Day +1 to Day +7 Daily Tmax / Tmin (°C)',
              'Apparent Max Temperature (°C)',
              'Peak Wind Speed (m/s)',
              'Expected Precipitation (mm)',
            ]}
          />
        )}
      </div>

      {/* NDMA & IMD Color-Coded Early Warning Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>National Disaster Management Authority (NDMA) Alert Matrix Reference</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Heat Action Plan Guidelines</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertLevels.map((lvl) => (
            <div
              key={lvl.level}
              className={`p-3.5 rounded-xl bg-slate-950/60 border ${lvl.border} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full font-mono ${lvl.badge}`}>
                    {lvl.level}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {lvl.desc}
                </p>
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <strong className="text-slate-300">Action Protocol: </strong>
                {lvl.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
