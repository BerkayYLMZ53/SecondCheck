import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { SavedItem, SaveListingInput } from '../types/savedListing';
import {
  createSavedListing,
  decodeSavedListings,
} from '../utils/savedListings';
import {
  readSavedListingsStorage,
  writeSavedListingsStorage,
} from '../utils/savedListingsStorage';
export type { SavedItem, SaveListingInput } from '../types/savedListing';

interface SavedListingsValue {
  savedListings: SavedItem[];
  saveListing: (item: SaveListingInput) => Promise<SavedItem>;
  removeListing: (id: string) => Promise<void>;
  clearListings: () => Promise<void>;
  isReady: boolean;
  storageMessage: string | null;
}
const Context = createContext<SavedListingsValue | null>(null);
export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const [savedListings, setSavedListings] = useState<SavedItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const items = useRef<SavedItem[]>([]);
  const ready = useRef(false);
  const mounted = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    mounted.current = true;
    void readSavedListingsStorage()
      .then((raw) => {
        if (!active) return;
        const decoded = decodeSavedListings(raw);
        items.current = decoded.items;
        setSavedListings(decoded.items);
        if (decoded.skipped)
          setLoadWarning(
            `${decoded.skipped} eski veya geçersiz kayıt yüklenemedi.`,
          );
      })
      .catch(() => {
        if (active) setSessionOnly(true);
      })
      .finally(() => {
        if (!active) return;
        ready.current = true;
        setIsReady(true);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);
  const persist = useCallback((next: SavedItem[]) => {
    const raw = JSON.stringify(next);
    // Serialize native writes so a slow earlier save cannot undo a later removal.
    const task = queue.current
      .then(() => writeSavedListingsStorage(raw))
      .then(() => {
        if (mounted.current) setSessionOnly(false);
      })
      .catch(() => {
        if (mounted.current) setSessionOnly(true);
      });
    queue.current = task;
    return task;
  }, []);
  const saveListing = useCallback(
    async (input: SaveListingInput) => {
      if (!ready.current)
        throw new Error(
          'Kaydedilen ilanlar yükleniyor. Lütfen tekrar deneyin.',
        );
      const item = createSavedListing(input, items.current);
      const next = [item, ...items.current];
      items.current = next;
      setSavedListings(next);
      await persist(next);
      return item;
    },
    [persist],
  );
  const removeListing = useCallback(
    async (id: string) => {
      if (!ready.current) return;
      const next = items.current.filter((item) => item.id !== id);
      items.current = next;
      setSavedListings(next);
      await persist(next);
    },
    [persist],
  );
  const clearListings = useCallback(async () => {
    if (!ready.current) return;
    items.current = [];
    setSavedListings([]);
    await persist([]);
  }, [persist]);
  const storageMessage = sessionOnly
    ? 'Kalıcı depolama kullanılamıyor. İlanlar yalnızca bu oturumda tutuluyor; sayfa yenilendiğinde kaybolabilir.'
    : loadWarning;
  const value = useMemo(
    () => ({
      savedListings,
      saveListing,
      removeListing,
      clearListings,
      isReady,
      storageMessage,
    }),
    [
      savedListings,
      saveListing,
      removeListing,
      clearListings,
      isReady,
      storageMessage,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSavedListings(): SavedListingsValue {
  const context = useContext(Context);
  if (!context)
    throw new Error('useSavedListings requires SavedListingsProvider');
  return context;
}
