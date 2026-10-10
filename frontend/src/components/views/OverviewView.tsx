import {
  Thermometer,
  Flame,
  Activity,
  LineChart,
  Database,
  Info,
  Clock,
  Wind,
  Droplets,
  Sun,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import type { Station, BackendHealth, WeatherState } from '../../types'
import { EmptyState } from '../EmptyState'

interface OverviewViewProps {
  selectedStation: Station
  backendHealth: BackendHealth
  weatherState: WeatherState
  onRefreshWeather: () => void
  onNavigateToTab: (tab: 'heatwave' | 'thermal-stress' | 'forecast' | 'methodology') => void
}

export function OverviewView({
  selectedStation,
  backendHealth,
  weatherState,
  onRefreshWeather,
  onNavigateToTab,
}: OverviewViewProps) {
  const current = weatherState.data?.current
  const daily = weatherState.data?.daily
  const metadata = weatherState.data?.metadata

  // Format observation timestamp if available
  const formattedObsTime = current?.time
    ? new Date(current.time).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-6">
      {/* Top Banner: Scientific Scope & Backend Link */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Diagnostic Framework Active
            </h2>
            <p className="text-xs text-slate-400">
              Observing {selectedStation.name} in the {selectedStation.zone} zone under IMD {selectedStation.imdCriteriaType} criteria.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Backend Communication:</span>
          {backendHealth.status === 'ok' ? (
            <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              FastAPI Verified (HTTP 200)
            </span>
          ) : (
            <span className="text-rose-400 font-mono font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
              FastAPI Unavailable
            </span>
          )}
        </div>
      </div>

      {/* Grid: Current Weather & Thermal Condition Summary */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Thermometer className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">
              Current Weather & Meteorological Observation Summary
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {weatherState.isLoading ? (
              <div className="flex items-center gap-1.5 text-sky-400 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Ingesting from Open-Meteo...</span>
              </div>
            ) : weatherState.error ? (
              <div className="flex items-center gap-1.5 text-rose-400 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Ingestion Error</span>
                <button
                  onClick={onRefreshWeather}
                  className="ml-1 underline text-slate-300 hover:text-white cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : weatherState.data ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Live Feed Connected</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Obs: {formattedObsTime || current?.time}</span>
                </span>
                <button
                  onClick={onRefreshWeather}
                  title="Refresh weather data"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Feed: Awaiting Ingestion</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Notice Banner */}
        {weatherState.error && !weatherState.isLoading && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300">Weather Ingestion Notice: </strong>
                <span>{weatherState.error}</span>
              </div>
            </div>
            <button
              onClick={onRefreshWeather}
              className="px-2.5 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/60 text-rose-200 text-[11px] font-medium shrink-0 cursor-pointer"
            >
              Retry Ingestion
            </button>
          </div>
        )}

        {/* Observation Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Max Temp (Tmax)</span>
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {daily?.temperature_2m_max && daily.temperature_2m_max[0] !== undefined && daily.temperature_2m_max[0] !== null
                ? `${daily.temperature_2m_max[0].toFixed(1)} °C`
                : '--.- °C'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Today's forecast peak</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Dry-Bulb Temp</span>
              <Thermometer className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {current?.temperature_2m !== undefined && current.temperature_2m !== null
                ? `${current.temperature_2m.toFixed(1)} °C`
                : '--.- °C'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Ambient 2m air temp</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Relative Humidity</span>
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {current?.relative_humidity_2m !== undefined && current.relative_humidity_2m !== null
                ? `${Math.round(current.relative_humidity_2m)} %`
                : '-- %'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Surface RH</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Dew Point (Td)</span>
              <Droplets className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {current?.dew_point_2m !== undefined && current.dew_point_2m !== null
                ? `${current.dew_point_2m.toFixed(1)} °C`
                : '--.- °C'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Moisture saturation</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Wind Speed</span>
              <Wind className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {current?.wind_speed_10m !== undefined && current.wind_speed_10m !== null
                ? `${current.wind_speed_10m.toFixed(1)} m/s`
                : '--.- m/s'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">10m elevation velocity</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Solar Flux</span>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {current?.direct_normal_irradiance !== undefined && current.direct_normal_irradiance !== null
                ? `${Math.round(current.direct_normal_irradiance)} W/m²`
                : '--- W/m²'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Direct normal irradiance</div>
          </div>
        </div>

        {/* Dynamic Ingestion Status Confirmation or Empty State */}
        {weatherState.data ? (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-teal-500/30 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Live Meteorological Data Active: </span>
                <span className="text-slate-400">
                  Retrieved via {metadata?.source} ({metadata?.model}) for {selectedStation.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>Elevation: {metadata?.elevation ?? selectedStation.elevationM}m</span>
              <span>•</span>
              <span>Timezone: {metadata?.timezone ?? 'Asia/Kolkata'}</span>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Database}
            title="Meteorological Observation Feed Inactive"
            description="Real-time and forecast weather observations for this station will be ingested via the Open-Meteo API. Click retry above or ensure network connectivity to populate readings."
            moduleNotice="Connecting to Open-Meteo via FastAPI /api/weather"
            expectedParams={['Tmax (°C)', 'Tmin (°C)', 'RH (%)', 'Dew Point (°C)', 'Wind Speed (m/s)', 'Solar Radiation (W/m²)']}
          />
        )}
      </section>

      {/* Two Analytical Pillars: Heatwave Hazard vs. Human Thermal Stress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pillar 1: Heatwave Hazard Assessment */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Heatwave Hazard Assessment (IMD Criteria)
                </h3>
              </div>
              <button
                onClick={() => onNavigateToTab('heatwave')}
                className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium cursor-pointer"
              >
                View Criteria Details →
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Evaluates atmospheric temperature extremes against official India Meteorological Department (IMD) standards, distinguishing departure from normal and absolute temperature thresholds.
            </p>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Station Criteria Class:</span>
                <span className="text-white font-semibold">{selectedStation.imdCriteriaType}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Heatwave Threshold:</span>
                <span className="text-amber-300">
                  {selectedStation.imdCriteriaType === 'Plains' ? '≥ 40°C & +4.5°C departure' : selectedStation.imdCriteriaType === 'Coastal' ? '≥ 37°C & +4.5°C departure' : '≥ 30°C & +4.5°C departure'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Severe Heatwave Threshold:</span>
                <span className="text-rose-400">Departure ≥ +6.4°C or Actual ≥ 47°C</span>
              </div>
            </div>
          </div>

          <EmptyState
            icon={Flame}
            title="Awaiting Climatological Baseline Data"
            description="Departure from normal calculation requires long-term station normal baselines (30-year climatology). Heatwave diagnostic alerts will be activated in Module 2."
            moduleNotice="Module 2: IMD Criteria Engine"
          />
        </section>

        {/* Pillar 2: Human Thermal Stress Risk Assessment */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">
                  Human Thermal Stress Risk Assessment
                </h3>
              </div>
              <button
                onClick={() => onNavigateToTab('thermal-stress')}
                className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium cursor-pointer"
              >
                View Thermal Indices →
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Biometeorological evaluation of physiological strain combining air temperature, relative humidity, air velocity, and solar radiative load to assess human thermoregulation failure.
            </p>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Primary Thermal Index:</span>
                <span className="text-white font-semibold">Empirical Outdoor WBGT (°C)</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Secondary Index:</span>
                <span className="text-white font-semibold">NOAA Heat Index / Apparent Temp</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Safety Threshold Standard:</span>
                <span className="text-teal-300">ISO 7243 / OSHA Work-Rest Regimes</span>
              </div>
            </div>
          </div>

          <EmptyState
            icon={Activity}
            title="Thermal Indices Calculation Engine Inactive"
            description="Empirical WBGT and Heat Index algorithms will be integrated in Module 3. Real-time biometeorological stress bands will be computed from concurrent temperature and humidity."
            moduleNotice="Module 3: Thermal Stress Engine"
          />
        </section>
      </div>

      {/* Forecast & Trends Preview Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">
              7-Day Numerical Forecast Trajectory (Open-Meteo)
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('forecast')}
            className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium cursor-pointer"
          >
            Explore Full 7-Day Forecast View →
          </button>
        </div>

        {daily && daily.time.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {daily.time.slice(0, 7).map((dayTime, idx) => {
              const dateObj = new Date(dayTime)
              const dayLabel = idx === 0 ? 'Today' : dateObj.toLocaleDateString('en-IN', { weekday: 'short' })
              const dateLabel = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
              const tmax = daily.temperature_2m_max[idx]
              const tmin = daily.temperature_2m_min[idx]

              return (
                <div
                  key={dayTime}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 text-center flex flex-col justify-between"
                >
                  <div className="text-[11px] font-semibold text-slate-300">{dayLabel}</div>
                  <div className="text-[10px] text-slate-400 mb-1.5">{dateLabel}</div>

                  <div className="my-1">
                    <span className="text-sm font-bold text-amber-300 font-mono">
                      {tmax !== null && tmax !== undefined ? `${tmax.toFixed(1)}°` : '--°'}
                    </span>
                    <span className="text-slate-600 mx-1">/</span>
                    <span className="text-xs text-sky-300 font-mono">
                      {tmin !== null && tmin !== undefined ? `${tmin.toFixed(1)}°` : '--°'}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800/60">
                    Max / Min
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={LineChart}
            title="Numerical Forecast Pipeline Awaiting Ingestion"
            description="The 1–7 day numerical forecast from Open-Meteo will populate here once ingested."
            moduleNotice="Module 1 Forecast Stream"
          />
        )}
      </section>

      {/* Transparent Data Provenance & Methodological Notes */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-400 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Data Provenance, Source Attributes & Scientific Transparency</span>
          </div>
          <button
            onClick={() => onNavigateToTab('methodology')}
            className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium cursor-pointer"
          >
            Full Academic Methodology →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 font-mono text-[11px]">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400 font-sans font-semibold mb-1">Primary Weather Provider</div>
            <div className="text-slate-200">{metadata?.source || 'Open-Meteo Weather API'}</div>
            <div className="text-slate-400 text-[10px] mt-1 font-sans">{metadata?.model || 'ECMWF ERA5 / GFS Global NWP Blend'}</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400 font-sans font-semibold mb-1">Spatial Resolution</div>
            <div className="text-slate-200">~9 km to ~25 km Grid Cells</div>
            <div className="text-slate-400 text-[10px] mt-1 font-sans">Gridded spatial averages vs. point observatories</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400 font-sans font-semibold mb-1">Operational Scope</div>
            <div className="text-slate-200">Academic Research Prototype</div>
            <div className="text-slate-400 text-[10px] mt-1 font-sans">Non-governmental, diagnostic decision-support model</div>
          </div>
        </div>
      </section>
    </div>
  )
}
