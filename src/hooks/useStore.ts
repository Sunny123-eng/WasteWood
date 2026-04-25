/**
 * Backwards-compatible wrapper around the cloud-backed DataStoreProvider.
 * Existing pages call `useStore<T>('ww_purchases')` and get { items, add, update, remove, refresh }.
 */
import { useCallback } from 'react';
import { useDataStore, type StoreKey } from '@/hooks/useDataStore';

export function useStore<T extends { id: string }>(key: string) {
  const store = useDataStore();
  const sk = key as StoreKey;
  const items = (store as unknown as Record<string, T[]>)[sk] ?? [];

  const add = useCallback(async (item: Omit<T, 'id' | 'createdAt'>) => {
    return await store.addItem<T>(sk, item as Record<string, unknown>);
  }, [store, sk]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    return await store.updateItem(sk, id, updates as Record<string, unknown>);
  }, [store, sk]);

  const remove = useCallback(async (id: string) => {
    return await store.removeItem(sk, id);
  }, [store, sk]);

  const refresh = useCallback(async () => {
    await store.refreshKey(sk);
  }, [store, sk]);

  return { items, add, update, remove, refresh };
}
