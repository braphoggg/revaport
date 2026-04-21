/* Capture README-quality PNGs of the demo instance into docs/screenshots/.
 * Uses system Edge via Playwright (no Chromium download needed).
 *
 * Pre-req: demo dev instance running on http://localhost:5174 (via
 * `python scripts/dev_demo.py`, or the `revaport-demo` launch.json entry).
 */
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Playwright is installed in frontend/node_modules; resolve it from there.
const fromFrontend = createRequire(
  pathToFileURL(resolve(__dirname, '..', 'frontend', 'package.json')),
)
const { chromium } = fromFrontend('playwright')
const OUT = resolve(__dirname, '..', 'docs', 'screenshots')
const BASE = 'http://localhost:5174'
const VIEWPORT = { width: 1440, height: 900 }

mkdirSync(OUT, { recursive: true })

async function snap(page, file) {
  // We hold an SSE connection open for live prices, so 'networkidle' never
  // fires. Wait for initial DOM/load instead, then a generous fixed settle so
  // React Query data lands + Recharts finishes its layout pass.
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('load').catch(() => {})
  await page.waitForTimeout(1800)
  await page.screenshot({ path: resolve(OUT, file), fullPage: false })
  console.log('saved', file)
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === 'auto') localStorage.removeItem('revaport-theme')
    else localStorage.setItem('revaport-theme', t)
  }, theme)
}

const PAGES = [
  { route: '/',                file: 'dashboard'    },
  { route: '/holdings',        file: 'holdings'     },
  { route: '/transactions',    file: 'transactions' },
  { route: '/ticker/AAPL',     file: 'ticker-detail'},
]

const browser = await chromium.launch({ channel: 'msedge' })

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: theme,             // matches CSS prefers-color-scheme too
    deviceScaleFactor: 2,           // crisp 2x output for retina-friendly README
  })
  const page = await ctx.newPage()
  // Visit once so localStorage origin exists, then set theme + reload.
  await page.goto(BASE + '/')
  await setTheme(page, theme)
  for (const { route, file } of PAGES) {
    await page.goto(BASE + route)
    await snap(page, `${file}-${theme}.png`)
  }
  await ctx.close()
}

await browser.close()
console.log('done. files in:', OUT)
