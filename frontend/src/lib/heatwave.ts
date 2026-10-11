import type { Station } from '../types'

export type ImdCriteriaType = Station['imdCriteriaType']

export interface HeatwaveVerdict {
  headline: string
  subline: string
}

const BASE_THRESHOLDS: Record<ImdCriteriaType, number> = {
  Plains: 40,
  Coastal: 37,
  Hilly: 30,
}

const ABSOLUTE_THRESHOLDS: Partial<Record<ImdCriteriaType, number>> = {
  Plains: 45,
  Coastal: 40,
}

export function terrainThreshold(terrain: ImdCriteriaType): number {
  return BASE_THRESHOLDS[terrain]
}

export function heatwaveVerdict({
  forecastHigh,
  terrain,
}: {
  forecastHigh: number | null | undefined
  terrain: ImdCriteriaType
}): HeatwaveVerdict {
  if (typeof forecastHigh !== 'number' || !Number.isFinite(forecastHigh)) {
    return {
      headline: 'Forecast high unavailable.',
      subline: 'This is a basic threshold comparison, not an official IMD classification.',
    }
  }

  const threshold = terrainThreshold(terrain)
  const terrainLabel = terrain === 'Hilly' ? 'hilly regions' : terrain.toLowerCase()
  const absoluteThreshold = ABSOLUTE_THRESHOLDS[terrain]

  if (forecastHigh < threshold) {
    return {
      headline: `Forecast high of ${forecastHigh.toFixed(1)} °C is ${(threshold - forecastHigh).toFixed(1)} °C below the ${threshold} °C line IMD uses for heatwaves on the ${terrainLabel}.`,
      subline: 'This is a basic threshold comparison, not an official IMD classification.',
    }
  }

  if (absoluteThreshold != null && forecastHigh >= absoluteThreshold) {
    return {
      headline: `Forecast high of ${forecastHigh.toFixed(1)} °C is at or above the ${absoluteThreshold} °C level at which IMD counts a heatwave regardless of normal.`,
      subline: 'This is a basic forecast threshold comparison, not an official warning or classification.',
    }
  }

  return {
    headline: `Forecast high reaches the ${threshold} °C starting line.`,
    subline: "IMD also needs a departure from normal, which HeatTrick doesn't have yet, so a heatwave can't be confirmed.",
  }
}
