/**
 * Suppress một số warnings không cần thiết trong console
 * Chỉ suppress các warnings không ảnh hưởng đến chức năng
 */

if (typeof window !== 'undefined' && window.console) {
  // Suppress Cross-Origin-Opener-Policy warnings từ Firebase Auth
  const originalWarn = console.warn;
  
  console.warn = function(...args) {
    // Suppress COOP warnings (không ảnh hưởng chức năng)
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        if (
          firstArg.includes('Cross-Origin-Opener-Policy') ||
          firstArg.includes('window.closed call') ||
          firstArg.includes('COOP')
        ) {
          // Suppress warning này (không ảnh hưởng chức năng)
          return;
        }
      }
      
      // Suppress React DevTools message (optional, chỉ trong production)
      if (typeof firstArg === 'string' && firstArg.includes('Download the React DevTools')) {
        // Có thể suppress hoặc không, tùy bạn
        // return;
      }
    }
    
    // Gọi original warn cho các warnings khác
    originalWarn.apply(console, args);
  };
  
  // Suppress network errors từ ad blockers (ERR_BLOCKED_BY_CLIENT)
  const originalError = console.error;
  console.error = function(...args) {
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.includes('ERR_BLOCKED_BY_CLIENT')) {
        // Suppress error này (do ad blocker chặn Firestore requests, không ảnh hưởng chức năng chính)
        return;
      }
    }
    originalError.apply(console, args);
  };
}

