import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAVED_LISTINGS_KEY } from './savedListings';
export function readSavedListingsStorage(): Promise<string | null> {
  return AsyncStorage.getItem(SAVED_LISTINGS_KEY);
}
export function writeSavedListingsStorage(value: string): Promise<void> {
  return AsyncStorage.setItem(SAVED_LISTINGS_KEY, value);
}
