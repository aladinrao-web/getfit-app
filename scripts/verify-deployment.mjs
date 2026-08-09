import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const deploymentBase = normalizeBase(process.env.VITE_BASE_PATH || '/')
const indexHtml = readFileSync(resolve(root, 'dist', 'index.html'), 'utf8')
const manifest = JSON.parse(readFileSync(resolve(root, 'dist', 'manifest.webmanifest'), 'utf8'))
const serviceWorker = readFileSync(resolve(root, 'dist', 'sw.js'), 'utf8')
const applicationBundle = readdirSync(resolve(root, 'dist', 'assets'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(resolve(root, 'dist', 'assets', file), 'utf8'))
  .join('\n')

function normalizeBase(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message)
}

requireCondition(indexHtml.includes(`${deploymentBase}manifest.webmanifest`), `Manifest is not rooted at ${deploymentBase}`)
requireCondition(indexHtml.includes(`${deploymentBase}assets/`), `Built assets are not rooted at ${deploymentBase}`)
requireCondition(manifest.id === './' && manifest.start_url === './' && manifest.scope === './', 'Manifest navigation paths must remain deployment-relative')
requireCondition(serviceWorker.includes("requestUrl.origin !== self.location.origin"), 'Service worker must not cache cross-origin API responses')
requireCondition(!serviceWorker.includes("caches.match('/')"), 'Service worker fallback must not assume a root deployment')
requireCondition(!applicationBundle.includes('Create account'), 'Production bundle must not expose account creation')
requireCondition(!applicationBundle.includes('Resend confirmation'), 'Production bundle must not expose signup confirmation controls')

console.log(`Deployment assets verified for ${deploymentBase}`)
