import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, useColorScheme, useWindowDimensions } from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * On desktop web, frames the Expo app like a phone so demos look presentable
 * in a browser without a device.
 */
export function WebAppShell({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const framed = width >= 900;

  if (!framed) {
    return <View style={[styles.mobileWeb, { backgroundColor: colors.background }]}>{children}</View>;
  }

  return (
    <View style={styles.desktopPage}>
      <View style={styles.copyCol}>
        <Text style={[styles.brand, { color: colors.tint }]}>PharmaSense</Text>
        <Text style={[styles.headline, { color: colors.text }]}>
          Hypertension label-scan prototype
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Demo Home, Scan (upload a label photo), Search, Ask AI, My medications, and Sodium watch
          in the browser — no phone install required.
        </Text>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Prototype only — not medical advice. Photos are not saved.
        </Text>
      </View>
      <View style={[styles.phoneChrome, { borderColor: colors.border, backgroundColor: '#0A1218' }]}>
        <View style={styles.notch} />
        <View
          style={[styles.phoneScreen, { backgroundColor: colors.background, maxWidth: MaxContentWidth }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileWeb: { flex: 1 },
  desktopPage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  copyCol: { maxWidth: 360, gap: Spacing.two },
  brand: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  headline: { fontSize: 34, fontWeight: '700', lineHeight: 40 },
  body: { fontSize: 16, lineHeight: 24 },
  note: { fontSize: 14, lineHeight: 20, marginTop: Spacing.two },
  phoneChrome: {
    width: 390,
    height: 780,
    borderRadius: 36,
    borderWidth: 10,
    overflow: 'hidden',
    shadowColor: '#0A1B2A',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
  },
  notch: {
    alignSelf: 'center',
    width: 120,
    height: 28,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#0A1218',
    zIndex: 2,
  },
  phoneScreen: { flex: 1, overflow: 'hidden' },
});
