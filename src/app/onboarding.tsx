import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SafetyNotice } from '@/components/safety-notice';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useDisclaimer } from '@/lib/disclaimer';

export default function OnboardingScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { accept } = useDisclaimer();
  const [saving, setSaving] = useState(false);

  async function handleAccept() {
    setSaving(true);
    try {
      await accept();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: colors.text, fontFamily: Fonts?.rounded }]}>
          Before you start
        </Text>
        <Text style={[styles.lead, { color: colors.textSecondary }]}>
          PharmaSense helps you look up and study common medicines. Please read how it should and
          should not be used.
        </Text>
        <SafetyNotice />
        <Pressable onPress={() => router.push('/privacy')} style={styles.linkWrap}>
          <Text style={[styles.link, { color: colors.tint }]}>Read the privacy policy</Text>
        </Pressable>
      </ScrollView>
      <Pressable
        onPress={handleAccept}
        disabled={saving}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.tint, opacity: pressed || saving ? 0.85 : 1 },
        ]}>
        <Text style={styles.buttonText}>I understand</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, paddingBottom: Spacing.three, gap: Spacing.three },
  heading: { fontSize: 30, fontWeight: '700' },
  lead: { fontSize: 16, lineHeight: 22 },
  linkWrap: { alignSelf: 'flex-start' },
  link: { fontSize: 15, fontWeight: '600' },
  button: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
