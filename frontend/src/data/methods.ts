export type MethodStatus = 'implemented' | 'planned'

export interface Method {
  id: string
  name: string
  formula: string
  inputs: string[]
  validRange: string
  source: string
  limitations: string[]
  citationKey: string
  status: MethodStatus
}

export const methods: Method[] = [
  {
    id: 'noaa-heat-index',
    name: 'NOAA / NWS Heat Index',
    formula:
      'Screen with the Steadman simple formula; when its average with air temperature is at least 80 °F, apply the Rothfusz regression and the applicable low- or high-humidity adjustment.',
    inputs: ['Air temperature (°C)', 'Relative humidity (%)'],
    validRange: 'Relative humidity: 0–100%; regression intended for elevated heat-index conditions.',
    source: 'U.S. National Weather Service, Heat Index Equation (Rothfusz, 1990).',
    limitations: [
      'Assumes shady, light-wind conditions; direct sun and strong wind are not represented.',
      'Does not account for clothing, activity, or individual health.',
    ],
    citationKey: 'rothfusz1990',
    status: 'implemented',
  },
  {
    id: 'wet-bulb-stull',
    name: 'Stull wet-bulb approximation',
    formula:
      'Tw = T·atan(0.151977·√(RH + 8.313659)) + atan(T + RH) − atan(RH − 1.676331) + 0.00391838·RH^1.5·atan(0.023101·RH) − 4.686035.',
    inputs: ['Air temperature (°C)', 'Relative humidity (%)'],
    validRange: 'Recommended for −20 to 50 °C and 5 to 99% relative humidity.',
    source: 'Stull, R. (2011), Journal of Applied Meteorology and Climatology.',
    limitations: [
      'Approximation is flagged outside the recommended temperature or humidity range.',
      'Does not account for pressure, wind, or radiation.',
    ],
    citationKey: 'stull2011',
    status: 'implemented',
  },
  {
    id: 'wbgt-bom-estimate',
    name: 'Simplified WBGT estimate',
    formula:
      'WBGT ≈ 0.567·T + 0.393·e + 3.94, where e = RH/100·6.105·exp(17.27·T/(237.7 + T)).',
    inputs: ['Air temperature (°C)', 'Relative humidity (%)'],
    validRange: 'Estimate for shade/no-radiation conditions.',
    source: 'Australian Bureau of Meteorology simplified estimate; see Liljegren et al. (2008) for WBGT modelling context.',
    limitations: [
      'Estimate only, not a measured WBGT.',
      'Radiant heat and wind are not included.',
    ],
    citationKey: 'liljegren2008',
    status: 'implemented',
  },
  {
    id: 'imd-heatwave-criteria',
    name: 'IMD heatwave criteria (diagnostic)',
    formula:
      'Compare daily maximum temperature and departure from normal with the applicable plains, hilly, or coastal thresholds; consecutive-day results remain diagnostic.',
    inputs: ['Daily maximum temperature (°C)', 'Normal daily maximum (°C)', 'Region'],
    validRange: 'Threshold checks only; a gridded single point is not an official declaration.',
    source: 'India Meteorological Department heatwave criteria.',
    limitations: [
      'Requires valid local normal temperatures and regional classification.',
      'A diagnostic comparison cannot substitute for an official IMD declaration.',
    ],
    citationKey: 'imd_heatwave_criteria',
    status: 'implemented',
  },
  {
    id: 'climatology-1991-2020',
    name: '1991–2020 climatology',
    formula: 'Planned comparison of daily forecast temperatures with a 1991–2020 climatological normal.',
    inputs: ['Location or grid point', 'Date', 'Daily temperature'],
    validRange: 'Planned; not yet calculated.',
    source: 'ERA5 reanalysis, Hersbach et al. (2020).',
    limitations: [
      'This application does not currently calculate ERA5 climatological normals.',
      'A reanalysis grid value is not a station observation.',
    ],
    citationKey: 'hersbach2020',
    status: 'planned',
  },
]

export type MethodId = (typeof methods)[number]['id']
