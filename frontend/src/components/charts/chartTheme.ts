/* Centralized DE palette for Recharts (which can't read CSS vars).
   Update these hex values in lockstep with theme.css if the design ever changes.

   The palette hooks below subscribe to the live resolved theme (override OR
   system pref), so charts re-render correctly when the user clicks the
   theme toggle in the header. */

import { useResolvedTheme } from '@/lib/theme'

export const CHART_LIGHT = {
  teal:    '#3d6470',
  umber:   '#7d4f2c',
  brass:   '#a8853e',
  moss:    '#5a6b3a',
  oxblood: '#8d3527',
  rust:    '#a94f3a',
  plum:    '#6e3a55',
  slate:   '#4a5560',
  ink:     '#2a2218',
  inkMuted:'#5e4f3c',
  edge:    '#a89880',
  paper:   '#e8dcc4',
} as const

export const CHART_DARK = {
  teal:    '#5a8794',
  umber:   '#a87045',
  brass:   '#c9a557',
  moss:    '#7a8c52',
  oxblood: '#b34a3a',
  rust:    '#c4634a',
  plum:    '#9a5876',
  slate:   '#6e7e91',
  ink:     '#e8dcc4',
  inkMuted:'#a89880',
  edge:    '#3a3128',
  paper:   '#1a1612',
} as const

export function useChartPalette() {
  return useResolvedTheme() === 'dark' ? CHART_DARK : CHART_LIGHT
}

/* Pie slice rotation through 8 distinct DE hues.
   Order alternates cool / warm / cool / warm so adjacent slices in any
   small portfolio still read as visually distinct. */
export const PIE_PALETTE_LIGHT = [
  CHART_LIGHT.teal,    // cool blue-green
  CHART_LIGHT.oxblood, // warm deep red
  CHART_LIGHT.moss,    // cool olive green
  CHART_LIGHT.brass,   // warm yellow ochre
  CHART_LIGHT.plum,    // cool muted violet
  CHART_LIGHT.rust,    // warm orange
  CHART_LIGHT.slate,   // cool blue-gray
  CHART_LIGHT.umber,   // warm brown
]

export const PIE_PALETTE_DARK = [
  CHART_DARK.teal,
  CHART_DARK.oxblood,
  CHART_DARK.moss,
  CHART_DARK.brass,
  CHART_DARK.plum,
  CHART_DARK.rust,
  CHART_DARK.slate,
  CHART_DARK.umber,
]

export function usePiePalette() {
  return useResolvedTheme() === 'dark' ? PIE_PALETTE_DARK : PIE_PALETTE_LIGHT
}
