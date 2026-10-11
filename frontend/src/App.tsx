import { useState, useEffect, useCallback, useRef } from 'react'
import type { ActiveTab, Station, WeatherState } from './types'
import { REFERENCE_STATIONS } from './data/stations'
import { fetchWeatherData } from './services/weather'
import { Navbar } from './components/Navbar'
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
  const [weatherState, setWeatherState] = useState<WeatherState>({
    data: null,
    isLoading: true,
    error: null,
    lastFetched: null,
    stationId: REFERENCE_STATIONS[0].id,
  })
  const requestId = useRef(0)
  const activeController = useRef<AbortController | null>(null)

  const requestWeather = useCallback(async (
    station: Station,
    controller: AbortController,
    currentRequestId: number,
  ) => {
    try {
      const data = await fetchWeatherData(
        station.latitude,
        station.longitude,
        controller.signal,
      )
      if (controller.signal.aborted || currentRequestId !== requestId.current) {
        return
      }
      setWeatherState({
        data,
        isLoading: false,
        error: null,
        lastFetched: new Date().toISOString(),
        stationId: station.id,
      })
    } catch (error: unknown) {
      if (controller.signal.aborted || currentRequestId !== requestId.current) {
        return
      }
      setWeatherState((previous) => ({
        ...previous,
        isLoading: false,
        error: error instanceof Error
          ? error.message
          : 'Unable to retrieve weather data.',
      }))
    } finally {
      if (activeController.current === controller) {
        activeController.current = null
      }
    }
  }, [])

  const loadWeather = useCallback(async (
    station: Station,
    controller: AbortController,
  ) => {
    activeController.current?.abort()
    activeController.current = controller
    const currentRequestId = ++requestId.current

    setWeatherState((previous) => {
      const sameStation = previous.stationId === station.id
      return {
        data: sameStation ? previous.data : null,
        isLoading: true,
        error: null,
        lastFetched: sameStation ? previous.lastFetched : null,
        stationId: station.id,
      }
    })

    await requestWeather(station, controller, currentRequestId)
  }, [requestWeather])

  useEffect(() => {
    const controller = new AbortController()
    activeController.current = controller
    const currentRequestId = ++requestId.current
    void fetchWeatherData(
      REFERENCE_STATIONS[0].latitude,
      REFERENCE_STATIONS[0].longitude,
      controller.signal,
    ).then((data) => {
      if (controller.signal.aborted || currentRequestId !== requestId.current) {
        return
      }
      setWeatherState({
        data,
        isLoading: false,
        error: null,
        lastFetched: new Date().toISOString(),
        stationId: REFERENCE_STATIONS[0].id,
      })
    }).catch((error: unknown) => {
      if (controller.signal.aborted || currentRequestId !== requestId.current) {
        return
      }
      setWeatherState((previous) => ({
        ...previous,
        isLoading: false,
        error: error instanceof Error
          ? error.message
          : 'Unable to retrieve weather data.',
      }))
    }).finally(() => {
      if (activeController.current === controller) {
        activeController.current = null
      }
    })
    return () => {
      controller.abort()
      if (activeController.current === controller) {
        requestId.current += 1
        activeController.current = null
      }
    }
  }, [requestWeather])

  const handleRefreshWeather = useCallback(() => {
    if (weatherState.isLoading) return
    void loadWeather(selectedStation, new AbortController())
  }, [loadWeather, selectedStation, weatherState.isLoading])

  const handleSelectStation = useCallback((station: Station) => {
    setSelectedStation(station)
    void loadWeather(station, new AbortController())
  }, [loadWeather])

  const visibleWeatherState = weatherState.stationId === selectedStation.id
    ? weatherState
    : {
        data: null,
        isLoading: true,
        error: null,
        lastFetched: null,
        stationId: selectedStation.id,
      }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-body selection:bg-brand-soft selection:text-ink">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        weatherState={visibleWeatherState}
        onRetry={handleRefreshWeather}
      />

      <main
        id="dashboard-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6"
      >
        {activeTab !== 'methodology' && (
          <StationSelector
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
          />
        )}

        {activeTab === 'overview' && (
          <OverviewView
            selectedStation={selectedStation}
            weatherState={visibleWeatherState}
            onRefreshWeather={handleRefreshWeather}
            onNavigateToTab={setActiveTab}
          />
        )}
        {activeTab === 'heatwave' && (
          <HeatwaveView
            selectedStation={selectedStation}
            weatherState={visibleWeatherState}
          />
        )}
        {activeTab === 'thermal-stress' && (
          <ThermalStressView
            weatherState={visibleWeatherState}
          />
        )}
        {activeTab === 'forecast' && (
          <ForecastView
            selectedStation={selectedStation}
            weatherState={visibleWeatherState}
            onRefreshWeather={handleRefreshWeather}
          />
        )}
        {activeTab === 'methodology' && <MethodologyView />}
      </main>

      <Footer />
    </div>
  )
}
