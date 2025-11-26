/**
 * Firebase Remote Config Service
 * Cấu hình động - Không cần update app
 */

import { fetchAndActivate, getValue } from 'firebase/remote-config'
import { getRemoteConfigInstance } from '../firebase'

/**
 * Fetch and activate remote config
 */
let lastFetchTime = 0
const FETCH_INTERVAL = 60000 // 1 minute - avoid duplicate fetches

export async function fetchRemoteConfig() {
  try {
    const now = Date.now()
    // Avoid duplicate fetches within 1 minute
    if (now - lastFetchTime < FETCH_INTERVAL) {
      return true
    }
    
    const remoteConfig = getRemoteConfigInstance()
    await fetchAndActivate(remoteConfig)
    lastFetchTime = now
    console.log('Remote Config fetched and activated')
    return true
  } catch (error) {
    console.error('Error fetching Remote Config:', error)
    return false
  }
}

/**
 * Get config value
 */
export function getConfigValue(key, defaultValue = null) {
  try {
    const remoteConfig = getRemoteConfigInstance()
    const value = getValue(remoteConfig, key)
    return value.asString() || defaultValue
  } catch (error) {
    console.error(`Error getting config value for ${key}:`, error)
    return defaultValue
  }
}

/**
 * Get boolean config value
 */
export function getConfigBoolean(key, defaultValue = false) {
  try {
    const remoteConfig = getRemoteConfigInstance()
    const value = getValue(remoteConfig, key)
    return value.asBoolean() ?? defaultValue
  } catch (error) {
    console.error(`Error getting config boolean for ${key}:`, error)
    return defaultValue
  }
}

/**
 * Get number config value
 */
export function getConfigNumber(key, defaultValue = 0) {
  try {
    const remoteConfig = getRemoteConfigInstance()
    const value = getValue(remoteConfig, key)
    return value.asNumber() ?? defaultValue
  } catch (error) {
    console.error(`Error getting config number for ${key}:`, error)
    return defaultValue
  }
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(featureName) {
  return getConfigBoolean(featureName, true) // Default to enabled
}

/**
 * Get theme color from config
 */
export function getThemeColor() {
  return getConfigValue('theme_color', '#2563eb')
}

/**
 * Check if maintenance mode is on
 */
export function isMaintenanceMode() {
  return getConfigBoolean('maintenance_mode', false)
}

/**
 * Initialize Remote Config on app start
 */
export async function initializeRemoteConfig() {
  try {
    await fetchRemoteConfig()
    
    // Check maintenance mode
    if (isMaintenanceMode()) {
      console.warn('Maintenance mode is ON')
      // Could redirect to maintenance page
    }

    return true
  } catch (error) {
    console.error('Error initializing Remote Config:', error)
    return false
  }
}

