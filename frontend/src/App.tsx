import { useState, useEffect, useCallback } from 'react'
import type { ActiveTab, Station, BackendHealth, WeatherState } from './types'
import { REFERENCE_STATIONS } from './data/stations'
import { fetchWeatherData } from './services/weather'
import { Navbar } from './components/Navbar'
import { NavigationTabs } from './components/NavigationTabs'
import { StationSelector } from './components/StationSelector'
import { OverviewView } from './components/views/OverviewView'
import { HeatwaveView } from './components/views/HeatwaveView'
import { ThermalStressView } from './components/views/ThermalStressView'
import { ForecastView } from './components/views/ForecastView'
import { MethodologyView } from './components/views/MethodologyView'
import { Footer } from './components/Footer'

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [selectedStation, setSelectedStation] = useState<Station>(REFERENCE_STATIONS[0])
  const [backendHealth, setBackendHealth] = useState<BackendHealth>({
    status: 'checking',
  })
  const [weatherState, setWeatherState] = useState<WeatherState>({
    data: null,
    isLoading: true,
    error: null,
    lastFetched: null,
  })

  // Backend Health Ping Check
  const checkHealth = useCallback(async (signal?: AbortSignal) => {
    setBackendHealth((prev) => ({ ...prev, status: 'checking' }))
    const startTime = performance.now()
    try {
      const response = await fetch('/api/health', {
        headers: { Accept: 'application/json' },
        signal,
      })
      const endTime = performance.now()
      const latencyMs = Math.round(endTime - startTime)
      const lastChecked = new Date().toLocaleTimeString()

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText})`)
      }

      const payload = await response.json()

      if (payload.status === 'ok' && payload.app === 'HeatTrick') {
        setBackendHealth({
          status: 'ok',
          app: payload.app,
          latencyMs,
          lastChecked,
        })
      } else {
        throw new Error(`Unexpected payload: ${JSON.stringify(payload)}`)
      }
    } catch (err: unknown) {
      if (signal?.aborted) {
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setBackendHealth({
        status: 'error',
        errorMessage,
        lastChecked: new Date().toLocaleTimeString(),
      })
    }
  }, [])

  // Weather Data Fetching for currently selected station
  const loadWeather = useCallback(async (lat: number, lon: number, signal?: AbortSignal) => {
    setWeatherState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await fetchWeatherData(lat, lon, signal)
      setWeatherState({
        data,
        isLoading: false,
        error: null,
        lastFetched: new Date().toLocaleTimeString(),
      })
    } catch (err: unknown) {
      if (signal?.aborted) {
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve weather data'
      setWeatherState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        lastFetched: new Date().toLocaleTimeString(),
      }))
    }
  }, [])

  // Initial health check on mount with AbortController
  useEffect(() => {
    const controller = new AbortController()
    void checkHealth(controller.signal)
    return () => {
      controller.abort()
    }
  }, [checkHealth])

  // Fetch weather data when station coordinates change
  useEffect(() => {
    const controller = new AbortController()
    void loadWeather(selectedStation.latitude, selectedStation.longitude, controller.signal)
    return () => {
      controller.abort()
    }
  }, [loadWeather, selectedStation.latitude, selectedStation.longitude])

  const handleRefreshWeather = useCallback(() => {
    void loadWeather(selectedStation.latitude, selectedStation.longitude)
  }, [loadWeather, selectedStation.latitude, selectedStation.longitude])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Top Navbar */}
      <Navbar health={backendHealth} onRefreshHealth={() => void checkHealth()} />

      {/* Main Navigation Tabs */}
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Primary Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Station Selector Bar (Visible across observation & forecast views) */}
        {activeTab !== 'methodology' && (
          <StationSelector
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
          />
        )}

        {/* Dynamic View Rendering */}
        {activeTab === 'overview' && (
          <OverviewView
            selectedStation={selectedStation}
            backendHealth={backendHealth}
            weatherState={weatherState}
            onRefreshWeather={handleRefreshWeather}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'heatwave' && (
          <HeatwaveView selectedStation={selectedStation} />
        )}

        {activeTab === 'thermal-stress' && (
          <ThermalStressView selectedStation={selectedStation} />
        )}

        {activeTab === 'forecast' && (
          <ForecastView
            selectedStation={selectedStation}
            weatherState={weatherState}
            onRefreshWeather={handleRefreshWeather}
          />
        )}

        {activeTab === 'methodology' && <MethodologyView />}
      </main>

      {/* Academic Prototype Footer */}
      <Footer />
    </div>
  )
}
