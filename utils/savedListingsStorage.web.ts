import { SAVED_LISTINGS_KEY } from './savedListings';
export async function readSavedListingsStorage(): Promise<string | null> {
  return window.localStorage.getItem(SAVED_LISTINGS_KEY);
}
export async function writeSavedListingsStorage(value: string): Promise<void> {
  window.localStorage.setItem(SAVED_LISTINGS_KEY, value);
}
