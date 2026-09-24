import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme } from 'react-native';

import { SafetyNotice } from '@/components/safety-notice';
import { Colors, Spacing } from '@/constants/theme';
import { getDrugCount } from '@/db/database';

export default function AboutScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <SafetyNotice />
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {getDrugCount()} drugs cached from OpenFDA drug labels and the NLM RxNorm database.
      </Text>
      <Pressable onPress={() => router.push('/privacy')}>
        <Text style={[styles.link, { color: colors.tint }]}>Privacy policy</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  meta: { fontSize: 13, lineHeight: 18 },
  link: { fontSize: 15, fontWeight: '600' },
});
