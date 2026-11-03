import { useEffect, useState } from 'react';

// Asks /api/ai-status once after mount. Null until it answers; any failure counts as available, so
// a broken check never warns visitors for nothing.
export function useAiAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/ai-status')
      .then(response => (response.ok ? response.json() : { available: true }))
      .then((payload: { available?: unknown }) => active && setAvailable(payload.available !== false))
      .catch(() => active && setAvailable(true));
    return () => {
      active = false;
    };
  }, []);

  return available;
}
