import { useEffect, useState } from 'react';
import type { Catalog } from './api';

let promise: Promise<Catalog> | null = null;

/** catalog.json is compiled from the content/ folder at build time. */
export function loadCatalog(): Promise<Catalog> {
  if (!promise) {
    promise = fetch('/catalog.json', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('Could not load products');
      return r.json();
    });
    promise.catch(() => (promise = null));
  }
  return promise;
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    loadCatalog().then(setCatalog).catch((e) => setError(e.message));
  }, []);
  return { catalog, error };
}
