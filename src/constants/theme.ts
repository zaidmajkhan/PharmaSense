/**
 * PharmaSense visual system — calm clinical azure (light-first).
 * Inspired by soft health-product UIs: high-key backgrounds, cool accent, generous space.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0A1B2A',
    background: '#F5F9FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4EEF6',
    textSecondary: '#5A6B7A',
    tint: '#1278B8',
    tintSoft: '#DCECFA',
    success: '#1B9E4B',
    warning: '#B45309',
    danger: '#B42318',
    border: '#D3E0EA',
    hero: '#E3F1FA',
    heroAccent: '#C5E3F5',
  },
  dark: {
    text: '#F4F8FB',
    background: '#0A1218',
    backgroundElement: '#142029',
    backgroundSelected: '#1E2C38',
    textSecondary: '#A8B6C2',
    tint: '#5CB8D6',
    tintSoft: '#123040',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF6B6B',
    border: '#2A3A48',
    hero: '#102029',
    heroAccent: '#163242',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
