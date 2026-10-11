export interface ChartDay {
  date: string
  high: number | null | undefined
  low?: number | null
}

export interface TemperatureBand {
  from: number
  to: number
  label: string
  color: string
  softColor?: string
}
