/**
 * Platform-agnostic key-value store (e.g. AsyncStorage, electron-store).
 * Used for translation cache, frequency list cache, preferences.
 */

export interface IKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;

  /** Optional: batch get (e.g. AsyncStorage.multiGet) */
  getAllKeys?(): Promise<string[]>;
  multiGet?(keys: string[]): Promise<Array<[string, string | null]>>;
  multiSet?(keyValuePairs: Array<[string, string]>): Promise<void>;
  multiRemove?(keys: string[]): Promise<void>;
}
