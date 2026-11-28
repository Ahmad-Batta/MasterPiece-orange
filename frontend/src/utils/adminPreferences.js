import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'careerhub.admin.preferences';
const defaults = {
  tableDensity: 'comfortable',
  showPendingVerificationBadge: true,
};

function readPreferences() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, stored[key] ?? value]));
  } catch {
    return { ...defaults };
  }
}

let preferences = typeof window === 'undefined' ? { ...defaults } : readPreferences();
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  if (typeof window !== 'undefined') window.addEventListener('storage', syncFromStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined' && listeners.size === 0) window.removeEventListener('storage', syncFromStorage);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function syncFromStorage(event) {
  if (!event || event.key === STORAGE_KEY) {
    preferences = readPreferences();
    notify();
  }
}

export function getAdminPreferences() {
  return preferences;
}

export function setAdminPreferences(updates) {
  preferences = Object.fromEntries(Object.entries(defaults).map(([key]) => [key, updates[key] ?? preferences[key]]));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Keep the updated preference in memory if browser storage is unavailable.
  }
  notify();
}

export function useAdminPreferences() {
  return useSyncExternalStore(subscribe, getAdminPreferences, () => defaults);
}
