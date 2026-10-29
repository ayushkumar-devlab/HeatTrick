export type ActiveTab =
  | 'overview'
  | 'heatwave'
  | 'thermal-stress'
  | 'forecast'
  | 'methodology'

export interface Station {
  id: string
  name: string
  state: string
  zone: 'Northern Plains' | 'Central Plateau' | 'Eastern Delta & Coastal' | 'Western Arid' | 'Southern Coastal' | 'Deccan Plateau' | 'Hilly Region'
  latitude: number
  longitude: number
  elevationM: number
  imdCriteriaType: 'Plains' | 'Coastal' | 'Hilly'
}

export interface CurrentWeather {
  time: string
  temperature_2m: number | null
  relative_humidity_2m: number | null
  apparent_temperature: number | null
  dew_point_2m: number | null
  wind_speed_10m: number | null
  direct_normal_irradiance: number | null
  is_day: number | null
  precipitation: number | null
}

export interface DailyForecast {
  time: string[]
  temperature_2m_max: (number | null)[]
  temperature_2m_min: (number | null)[]
  apparent_temperature_max: (number | null)[]
  apparent_temperature_min: (number | null)[]
  wind_speed_10m_max: (number | null)[]
  precipitation_sum: (number | null)[]
}

export interface WeatherMetadata {
  source: string
  model: string
  latitude: number
  longitude: number
  elevation: number | null
  timezone: string | null
  retrieved_at: string
  is_stale?: boolean
}

export interface WeatherResponse {
  current: CurrentWeather
  daily: DailyForecast
  units: Record<string, string>
  metadata: WeatherMetadata
}

export interface WeatherState {
  data: WeatherResponse | null
  isLoading: boolean
  error: string | null
  lastFetched: string | null
  stationId: string
}
