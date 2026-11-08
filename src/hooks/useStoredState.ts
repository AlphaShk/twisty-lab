import { useEffect, useState } from 'react';

/**
 * React state mirrored to localStorage under `key`. `restore` turns the stored
 * JSON (null if there is none or it cannot be read) into a valid value.
 */
export function useStoredState<T>(key: string, restore: (stored: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return restore(raw === null ? null : JSON.parse(raw));
    } catch {
      return restore(null);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private mode, blocked site data).
      // The app still works for this session.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
