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

  const [state, region] = selectedStation.state.split(/\s*\(([^)]+)\)\s*/)
  const locationLabel = region ? `${state} · ${region}` : state

  return (
    <div className="bg-surface border border-border rounded-card p-4 shadow-card relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Active Station Display & Trigger */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-soft text-brand-ink border border-brand/20 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium">
              Forecast location
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="display-title text-xl font-semibold text-ink">
                {selectedStation.name}
              </span>
              <span className="text-xs text-muted font-medium">{locationLabel}</span>
            </div>
          </div>
        </div>

        {/* Station Metadata Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-ink-soft">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-alt border border-border font-mono text-[11px] text-muted">
            <Compass className="w-3.5 h-3.5 text-muted" />
            <span>{selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-alt border border-border font-mono text-[11px] text-muted">
            <Mountain className="w-3.5 h-3.5 text-muted" />
            <span>{selectedStation.elevationM} m MSL</span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-brand-soft border border-brand/20 text-[11px] font-medium text-brand-ink">
            {selectedStation.zone}
          </div>

          {/* Change Station Button */}
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="station-picker"
            aria-haspopup="dialog"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand hover:bg-brand-hover text-forest-text border border-brand transition-colors text-xs font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span>Change Station</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Station Selector Modal / Popover */}
      {isOpen && (
        <div
          id="station-picker"
          role="dialog"
          aria-label="Choose a forecast location"
          className="absolute left-0 right-0 top-full mt-2 z-40 bg-surface border border-border-strong rounded-xl shadow-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-surface-alt border border-border">
            <Search className="w-4 h-4 text-muted" />
            <input
              type="text"
              aria-label="Search locations"
              placeholder="Search station by name, state, or climate zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-ink placeholder-muted focus:outline-none w-full"
              autoFocus
            />
          </div>

          <div className="text-[11px] text-muted mb-2 font-medium">
            Forecast locations ({filteredStations.length} available)
          </div>

          {filteredStations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredStations.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  aria-pressed={station.id === selectedStation.id}
                  onClick={() => handleSelect(station)}
                  className={`text-left p-2.5 rounded-lg border transition-colors ${
                    station.id === selectedStation.id
                      ? 'bg-brand-soft border-brand/50 text-brand-ink'
                      : 'bg-surface-alt border-border hover:border-border-strong text-ink-soft'
                  }`}
                >
                  <div className="text-sm font-semibold">{station.name}</div>
                  <div className="text-xs text-muted">{station.state}</div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted">
                    <span className="font-mono">{station.latitude.toFixed(2)}°N, {station.longitude.toFixed(2)}°E</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-brand-ink font-medium">{station.zone}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted" role="status">
              No locations match this search.
            </p>
          )}

          <div className="mt-3 pt-2.5 border-t border-border flex justify-between items-center text-[11px] text-muted">
            <span>Forecast is requested for the coordinates shown above.</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
