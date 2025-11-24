/**
 * Logger Utility
 * Centralized logging with production mode support
 * Removes console logs in production to improve performance
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'

class Logger {
  log(...args) {
    if (isDevelopment) {
      console.log('[LOG]', ...args)
    }
  }

  info(...args) {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  }

  warn(...args) {
    // Always show warnings, even in production
    console.warn('[WARN]', ...args)
  }

  error(...args) {
    // Always show errors, even in production
    console.error('[ERROR]', ...args)
  }

  debug(...args) {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args)
    }
  }

  // Group logs for better organization
  group(label) {
    if (isDevelopment) {
      console.group(label)
    }
  }

  groupEnd() {
    if (isDevelopment) {
      console.groupEnd()
    }
  }
}

export const logger = new Logger()

// Export default for convenience
export default logger

