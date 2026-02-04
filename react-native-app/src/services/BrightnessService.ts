/**
 * Brightness Service
 *
 * Wraps react-native-screen-brightness (FOSS, MIT) to get/set device screen brightness.
 * Only applies on native (iOS/Android); no-op on web.
 */

import { Platform } from 'react-native';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

let ScreenBrightness: {
  setBrightness: (value: number) => void;
  getBrightness: () => Promise<number>;
} | null = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    ScreenBrightness = require('react-native-screen-brightness').default;
  } catch {
    ScreenBrightness = null;
  }
}

export const BrightnessService = {
  /**
   * Whether the native brightness API is available (iOS/Android only).
   */
  isSupported(): boolean {
    return ScreenBrightness != null;
  },

  /**
   * Set screen brightness (0–1). No-op on web or if unsupported.
   */
  setBrightness(value: number): void {
    if (ScreenBrightness == null) return;
    const clamped = clamp(value, 0, 1);
    try {
      ScreenBrightness.setBrightness(clamped);
    } catch (error) {
      console.warn('BrightnessService.setBrightness failed:', error);
    }
  },

  /**
   * Get current screen brightness (0–1). Resolves to 1 on web or if unsupported.
   */
  async getBrightness(): Promise<number> {
    if (ScreenBrightness == null) return 1;
    try {
      const value = await ScreenBrightness.getBrightness();
      return clamp(typeof value === 'number' ? value : 1, 0, 1);
    } catch (error) {
      console.warn('BrightnessService.getBrightness failed:', error);
      return 1;
    }
  },
};
