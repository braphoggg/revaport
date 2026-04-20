import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { usePriceStreamState } from '@/hooks/PriceStreamProvider'

const LABEL: Record<string, string> = {
  connecting: 'connecting…',
  connected: 'live',
  reconnecting: 'reconnecting…',
  disconnected: 'offline',
}

const TONE: Record<string, BadgeTone> = {
  connecting: 'neutral',
  connected: 'success',
  reconnecting: 'warning',
  disconnected: 'danger',
}

export function ConnectionIndicator() {
  const { state } = usePriceStreamState()
  const flickerClass = state === 'connected' ? 'animate-flicker' : ''
  return <Badge tone={TONE[state]} className={flickerClass}>{LABEL[state]}</Badge>
}
