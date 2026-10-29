import { useState, useEffect, useCallback, useRef } from 'react'
import type { ActiveTab, Station, WeatherState } from './types'
import { REFERENCE_STATIONS } from './data/stations'
import { fetchWeatherData, getCachedWeatherData } from './services/weather'
import { Navbar } from './components/Navbar'
import { StationSelector } from './components/StationSelector'
import { OverviewView } from './components/views/OverviewView'
import { HeatwaveView } from './components/views/HeatwaveView'
import { ThermalStressView } from './components/views/ThermalStressView'
import { ForecastView } from './components/views/ForecastView'
import { MethodologyView } from './components/views/MethodologyView'
import { Footer } from './components/Footer'
import { StatusBanner } from './components/StatusBanner'

const DEFAULT_STATION = REFERENCE_STATIONS[0]

function createInitialWeatherState(): WeatherState {
  const cached = getCachedWeatherData(
    DEFAULT_STATION.latitude,
    DEFAULT_STATION.longitude,
  )
  return {
    data: cached?.data ?? null,
    isLoading: true,
    error: null,
    lastFetched: cached?.data.metadata.is_stale
      ? cached.data.metadata.retrieved_at
      : cached?.fetchedAt ?? null,
    stationId: DEFAULT_STATION.id,
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [selectedStation, setSelectedStation] = useState<Station>(DEFAULT_STATION)
  const [weatherState, setWeatherState] = useState<WeatherState>(
    createInitialWeatherState,
  )
  const requestId = useRef(0)

  const requestWeather = useCallback(async (
    station: Station,
    currentRequestId: number,
  ) => {
    try {
      const data = await fetchWeatherData(
        station.latitude,
        station.longitude,
      )
      if (currentRequestId !== requestId.current) return
      setWeatherState({
        data,
        isLoading: false,
        error: null,
        lastFetched: data.metadata.is_stale
          ? data.metadata.retrieved_at
          : new Date().toISOString(),
        stationId: station.id,
      })
    } catch (error: unknown) {
      if (currentRequestId !== requestId.current) return
      setWeatherState((previous) => ({
        ...previous,
        isLoading: false,
        error: error instanceof Error
          ? error.message
          : 'Unable to retrieve weather data.',
      }))
    }
  }, [])

  const loadWeather = useCallback(async (
    station: Station,
  ) => {
    const currentRequestId = ++requestId.current
    const cached = getCachedWeatherData(station.latitude, station.longitude)

    setWeatherState((previous) => {
      const sameStation = previous.stationId === station.id
      return {
        data: cached?.data ?? (sameStation ? previous.data : null),
        isLoading: true,
        error: null,
        lastFetched: cached?.data.metadata.is_stale
          ? cached.data.metadata.retrieved_at
          : cached?.fetchedAt ?? (sameStation ? previous.lastFetched : null),
        stationId: station.id,
      }
    })

    await requestWeather(station, currentRequestId)
  }, [requestWeather])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentRequestId = ++requestId.current
      void requestWeather(DEFAULT_STATION, currentRequestId)
    }, 0)
    return () => {
      window.clearTimeout(timeout)
      requestId.current += 1
    }
  }, [requestWeather])

  const handleRefreshWeather = useCallback(() => {
    if (weatherState.isLoading) return
    void loadWeather(selectedStation)
  }, [loadWeather, selectedStation, weatherState.isLoading])

  const handleSelectStation = useCallback((station: Station) => {
    setSelectedStation(station)
    void loadWeather(station)
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
          <>
            <StatusBanner
              selectedStation={selectedStation}
              weatherState={visibleWeatherState}
            />
            <OverviewView
              selectedStation={selectedStation}
              weatherState={visibleWeatherState}
              onRefreshWeather={handleRefreshWeather}
              onNavigateToTab={setActiveTab}
            />
          </>
        )}
        {activeTab === 'heatwave' && (
          <HeatwaveView
            selectedStation={selectedStation}
            weatherState={visibleWeatherState}
          />
        )}
        {activeTab === 'thermal-stress' && (
          <ThermalStressView
            selectedStation={selectedStation}
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
        {activeTab === 'methodology' && (
          <MethodologyView
            selectedStation={selectedStation}
            currentTime={visibleWeatherState.data?.current.time}
            weatherState={visibleWeatherState}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}
