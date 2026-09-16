/**
 * Quota and Storage Persistence utilities for Local-First reliability.
 */

export interface StorageEstimateResult {
  usageBytes: number;
  quotaBytes: number;
  usagePercentage: number;
  isPersisted: boolean;
  isWarning: boolean;
}

/**
 * Checks if the browser has granted persistent storage permission.
 */
export async function checkStoragePersisted(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.storage?.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Requests the browser to mark storage as persistent (prevents eviction).
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Retrieves storage usage and quota estimation from the browser.
 */
export async function getStorageEstimate(): Promise<StorageEstimateResult> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let isPersisted = false;

  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
    } catch (err) {
      console.warn("Error getting storage estimate:", err);
    }
  }

  isPersisted = await checkStoragePersisted();

  const usagePercentage = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
  // Warning if storage is above 80% quota
  const isWarning = usagePercentage > 80;

  return {
    usageBytes,
    quotaBytes,
    usagePercentage,
    isPersisted,
    isWarning,
  };
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
