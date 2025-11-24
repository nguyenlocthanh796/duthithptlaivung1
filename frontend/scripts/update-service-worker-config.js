/**
 * Script to update firebase-messaging-sw.js with config from .env
 * Run: node scripts/update-service-worker-config.js
 */

const fs = require('fs')
const path = require('path')

// Read .env file
const envPath = path.join(__dirname, '..', '.env')
const swPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js')

if (!fs.existsSync(envPath)) {
  console.warn('⚠️  .env file not found. Skipping service worker config update.')
  console.warn('   Create frontend/.env with Firebase config values.')
  process.exit(0)
}

// Parse .env file
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '') // Remove quotes
    envVars[key] = value
  }
})

// Get Firebase config values
const apiKey = envVars.VITE_FIREBASE_API_KEY || ''
const projectId = envVars.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0581370080'
const messagingSenderId = envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || ''
const appId = envVars.VITE_FIREBASE_APP_ID || ''

if (!apiKey || !messagingSenderId || !appId) {
  console.warn('⚠️  Missing required Firebase config in .env:')
  console.warn('   - VITE_FIREBASE_API_KEY')
  console.warn('   - VITE_FIREBASE_MESSAGING_SENDER_ID')
  console.warn('   - VITE_FIREBASE_APP_ID')
  console.warn('   Service worker will use default/placeholder values.')
}

// Read service worker file
if (!fs.existsSync(swPath)) {
  console.error('❌ firebase-messaging-sw.js not found!')
  process.exit(1)
}

let swContent = fs.readFileSync(swPath, 'utf-8')

// Update config in service worker
swContent = swContent.replace(
  /apiKey:\s*['"][^'"]*['"]/,
  `apiKey: '${apiKey}'`
)
swContent = swContent.replace(
  /projectId:\s*['"][^'"]*['"]/,
  `projectId: '${projectId}'`
)
swContent = swContent.replace(
  /messagingSenderId:\s*['"][^'"]*['"]/,
  `messagingSenderId: '${messagingSenderId}'`
)
swContent = swContent.replace(
  /appId:\s*['"][^'"]*['"]/,
  `appId: '${appId}'`
)

// Write updated service worker
fs.writeFileSync(swPath, swContent, 'utf-8')

console.log('✅ Service worker config updated successfully!')
console.log(`   - apiKey: ${apiKey ? '✓' : '✗'}`)
console.log(`   - projectId: ${projectId}`)
console.log(`   - messagingSenderId: ${messagingSenderId ? '✓' : '✗'}`)
console.log(`   - appId: ${appId ? '✓' : '✗'}`)

