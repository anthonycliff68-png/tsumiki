import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * When each note was last opened, kept on this phone only (Anthony's call,
 * Nov 21): the order only has to make sense on the phone in your hand.
 * ponytail: a reinstall resets it; move to a notes.opened_at column if it
 * should follow someone across devices.
 */
const KEY = 'notes.opened';
const QK = ['notesOpened'];

export function useOpened() {
  return useQuery({
    queryKey: QK,
    staleTime: Infinity,
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Record<string, number>;
      } catch {
        return {};
      }
    },
  });
}

export function useMarkOpened() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) => {
      const at = Date.now();
      queryClient.setQueryData<Record<string, number>>(QK, (old) => (old ? { ...old, [id]: at } : old));
      // Read the stored map, not the cache: the cache may not have loaded yet, and writing it would wipe the rest.
      void AsyncStorage.getItem(KEY)
        .then((raw) => AsyncStorage.setItem(KEY, JSON.stringify({ ...(JSON.parse(raw ?? '{}') as object), [id]: at })))
        .then(() => queryClient.invalidateQueries({ queryKey: QK }))
        .catch(() => {});
    },
    [queryClient],
  );
}
