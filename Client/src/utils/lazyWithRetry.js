import { lazy } from 'react';

/**
 * Resilient lazy loader that retries failed dynamic imports and handles
 * deployment chunk mismatches (404s after new Vercel deployments).
 * Automatically refreshes once if the bundle hash changed on the server.
 */
export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('prepmark_chunk_force_refreshed') || 'false'
    );

    try {
      return await componentImport();
    } catch (error) {
      console.warn('[LazyLoader] Initial chunk load failed. Retrying in 350ms...', error);
      try {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return await componentImport();
      } catch (retryError) {
        console.error('[LazyLoader] Retry failed:', retryError);
        
        // Check if error looks like a network or chunk hash mismatch error
        const isChunkError = 
          retryError?.message?.includes('Failed to fetch dynamically imported module') ||
          retryError?.message?.includes('Importing a module script failed') ||
          retryError?.message?.includes('error loading dynamically imported module') ||
          retryError?.name === 'ChunkLoadError';

        if (!pageHasAlreadyBeenForceRefreshed && (isChunkError || !navigator.onLine)) {
          window.sessionStorage.setItem('prepmark_chunk_force_refreshed', 'true');
          console.warn('[LazyLoader] Auto-reloading page to fetch latest deployment bundle...');
          window.location.reload();
          return new Promise(() => {}); // Halt execution while page reloads
        }

        // Reset flag if we have already refreshed once
        window.sessionStorage.removeItem('prepmark_chunk_force_refreshed');
        throw retryError;
      }
    }
  });
}

// Reset the force-refresh marker on normal window loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    window.sessionStorage.removeItem('prepmark_chunk_force_refreshed');
  });

  // Global Vite chunk preloading error listener
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    console.warn('[Vite] Preload error detected. Automatically reloading page with latest bundle...');
    const hasRefreshed = window.sessionStorage.getItem('prepmark_vite_preload_refreshed');
    if (!hasRefreshed) {
      window.sessionStorage.setItem('prepmark_vite_preload_refreshed', 'true');
      window.location.reload();
    }
  });
}
