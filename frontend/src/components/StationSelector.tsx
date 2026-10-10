import { useState } from 'react'
import { MapPin, Search, ChevronDown, Compass, Mountain } from 'lucide-react'
import type { Station } from '../types'
import { REFERENCE_STATIONS } from '../data/stations'

interface StationSelectorProps {
  selectedStation: Station
  onSelectStation: (station: Station) => void
}

export function StationSelector({ selectedStation, onSelectStation }: StationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredStations = REFERENCE_STATIONS.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.zone.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelect = (station: Station) => {
    onSelectStation(station)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Active Station Display & Trigger */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Target Observation Station
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-base font-bold text-white">
                {selectedStation.name}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                ({selectedStation.state})
              </span>
            </div>
          </div>
        </div>

        {/* Station Metadata Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono text-[11px]">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>{selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono text-[11px]">
            <Mountain className="w-3.5 h-3.5 text-slate-400" />
            <span>{selectedStation.elevationM} m MSL</span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-medium text-teal-300">
            {selectedStation.zone}
          </div>

          <div className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700 text-[11px] font-medium text-amber-300">
            IMD Criteria: {selectedStation.imdCriteriaType}
          </div>

          {/* Change Station Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 transition-colors text-xs font-medium cursor-pointer"
          >
            <span>Change Station</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Station Selector Modal / Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4">
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search station by name, state, or climate zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              autoFocus
            />
          </div>

          <div className="text-[11px] text-slate-400 mb-2 font-medium">
            Representative Meteorological Reference Stations ({filteredStations.length} available)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {filteredStations.map((station) => (
              <button
                key={station.id}
                onClick={() => handleSelect(station)}
                className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                  station.id === selectedStation.id
                    ? 'bg-teal-950/40 border-teal-500/50 text-teal-200'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <div className="text-xs font-semibold text-white">{station.name}</div>
                <div className="text-[11px] text-slate-400">{station.state}</div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                  <span className="font-mono">{station.latitude.toFixed(2)}°N, {station.longitude.toFixed(2)}°E</span>
                  <span>•</span>
                  <span className="text-teal-400 font-medium">{station.zone}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
            <span>Coordinates are calibrated to IMD observation coordinates.</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
