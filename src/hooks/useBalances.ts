/**
 * Backwards-compatible balances hook backed by cloud store.
 */
import { useCallback } from 'react';
import { useDataStore } from '@/hooks/useDataStore';

export function useBalances() {
  const store = useDataStore();

  const updateBalance = useCallback((mode: 'cash' | 'bank', amount: number) => {
    void store.setBalance(mode, amount);
  }, [store]);

  const refresh = useCallback(() => {
    void store.refreshBalances();
  }, [store]);

  return { balances: store.balances, updateBalance, refresh };
}
