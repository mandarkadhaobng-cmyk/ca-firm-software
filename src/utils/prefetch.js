/**
 * Warm the in-memory cache right after a user logs in.
 * Runs in the background — never blocks the UI.
 * All calls use _silent:true so network errors don't show toasts.
 */
import apiClient from '../services/apiClient';
import { cache } from './cache';

async function silentGet(url, cacheKey, ttl = 300) {
  try {
    const { data } = await apiClient.get(url, { _silent: true });
    if (cacheKey) cache.set(cacheKey, data.data, ttl);
  } catch { /* background warm — ignore all errors */ }
}

export async function prefetchCommonData(profile) {
  if (!profile?.firmId && !profile?.firm_id) return;

  await Promise.allSettled([
    silentGet('/settings/departments', 'departments'),
    silentGet('/settings/branches', 'branches'),
    silentGet('/clients/dropdown', 'clients:dropdown'),
  ]);
}
