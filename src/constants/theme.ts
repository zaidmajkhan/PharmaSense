/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1F33',
    background: '#F7FAFC',
    backgroundElement: '#EEF3F8',
    backgroundSelected: '#E0E8F0',
    textSecondary: '#4A5B6A',
    tint: '#0B6E99',
    tintSoft: '#D7EEF6',
    success: '#1B9E4B',
    warning: '#B45309',
    danger: '#B42318',
    border: '#D5DEE7',
    hero: '#E8F4F8',
  },
  dark: {
    text: '#F4F8FB',
    background: '#0A1218',
    backgroundElement: '#162029',
    backgroundSelected: '#1E2C38',
    textSecondary: '#A8B6C2',
    tint: '#5CB8D6',
    tintSoft: '#123040',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF6B6B',
    border: '#2A3A48',
    hero: '#102029',
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
