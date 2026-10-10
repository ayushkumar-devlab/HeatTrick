import { BookOpen, ShieldAlert, Cpu, Database } from 'lucide-react'

export function MethodologyView() {
  return (
    <div className="space-y-6">
      {/* Title & Research Objective */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Scientific Methodology, Data Provenance & Architectural Framework
            </h2>
            <p className="text-xs text-slate-400">
              Methodological transparency and scientific grounding for the HeatTrick research project
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mt-3">
          HeatTrick addresses the dual gap in existing Indian early warning systems: (1) traditional weather warnings rely predominantly on dry-bulb temperature, omitting the lethal compounding impact of high humidity on evaporative cooling; and (2) early warning alerts are often broad sub-divisional advisories rather than localized, biometeorologically calibrated risk projections.
        </p>
      </div>

      {/* Conceptual Risk Equation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-teal-400" />
          <span>Three-Pillar Climate Risk Framework</span>
        </h3>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center font-mono my-3">
          <div className="text-sm md:text-base font-bold text-teal-300">
            Heat Risk = Hazard (Extreme Heat & Humidity) × Exposure (Population / Outdoor Labor) × Vulnerability (Adaptive Capacity)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 mt-4">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="font-semibold text-white mb-1">1. Hazard Pillar</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Characterized by atmospheric extremes: Tmax departure from normal (IMD rules) combined with ambient humidity, solar irradiance, and duration of thermal stress.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="font-semibold text-white mb-1">2. Exposure Pillar</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Spatial demographic concentration: informal outdoor workers (construction, agriculture, transport), population density, and diurnal activity schedules.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="font-semibold text-white mb-1">3. Vulnerability Pillar</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Socio-economic adaptive capacity: access to electrical cooling/fans, housing thermal quality, underlying comorbidities, age profile (infants and elderly).
            </p>
          </div>
        </div>
      </div>

      {/* Data Source Documentation & Resolution */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          <span>Data Sources, Spatial Coverage & Documented Limitations</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Weather Ingestion Provider: Open-Meteo API</span>
              <span className="text-[11px] font-mono text-teal-400">Open-Access Global Ingestion</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <strong>Source Models:</strong> ECMWF ERA5 and ERA5-Land historical reanalysis (~9 km to ~30 km resolution) combined with numerical weather prediction models (ECMWF IFS ~9 km, NOAA GFS ~13 km).
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <strong>Variables Retrieved:</strong> 2m Air Temperature, Relative Humidity, Dew Point, 10m Wind Speed, Surface Solar Radiation Downwards (GHI), Daily Max/Min Temperature.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Documented Scientific Limitations</span>
              <span className="text-[11px] font-mono text-amber-400">Model Constraints</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>
                <strong>Spatial Discrepancy:</strong> Gridded reanalysis data represents spatial cell averages, whereas IMD ground observatories measure point-station conditions. Microclimatic urban heat island (UHI) effects inside dense street canyons may exceed gridded estimates.
              </li>
              <li>
                <strong>Empirical WBGT Approximation:</strong> Validated ISO 7243 WBGT requires physical black globe and natural wet-bulb sensors. HeatTrick employs empirical equations (Liljegren / Australian BOM approximation), which have documented divergence under calm winds (&lt;0.5 m/s) or high radiant reflectance.
              </li>
              <li>
                <strong>Climatological Baseline Latency:</strong> ERA5 reanalysis has a typical publication latency of ~5 days for final consolidated quality-checked records.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Official Research Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Statutory Research & Non-Governmental Notice</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          HeatTrick is an academic research prototype created solely for computational experimentation and research into localized biometeorological heat risk in India. It is <strong>not</strong> an authorized government warning system. For statutory meteorological forecasts and heatwave warnings in India, always refer to the official bulletins of the <strong>India Meteorological Department (IMD)</strong> and the <strong>National Disaster Management Authority (NDMA)</strong>.
        </p>
      </div>
    </div>
  )
}
