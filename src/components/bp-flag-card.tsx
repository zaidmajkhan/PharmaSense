import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import type { BpFlagEntry } from '@/types/scan';

type Theme = (typeof Colors)['light'] | (typeof Colors)['dark'];

export function BpFlagCard({ flag, colors }: { flag: BpFlagEntry; colors: Theme }) {
  const directionLabel =
    flag.direction === 'raise'
      ? 'May raise blood pressure'
      : flag.direction === 'lower'
        ? 'May lower blood pressure'
        : 'Blood pressure effect can vary';

  return (
    <View
      style={[styles.card, { backgroundColor: colors.tintSoft, borderColor: colors.border }]}
      accessibilityRole="text"
      accessibilityLabel={`${directionLabel}. ${flag.note} ${flag.pharmacistLine}`}>
      <View style={styles.row}>
        <Ionicons name="warning-outline" size={22} color={colors.warning} />
        <Text style={[styles.title, { color: colors.warning }]}>{directionLabel}</Text>
      </View>
      <Text style={[styles.note, { color: colors.text }]}>{flag.note}</Text>
      <Text style={[styles.pharmacist, { color: colors.textSecondary }]}>
        {flag.pharmacistLine}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  note: { fontSize: 16, lineHeight: 24 },
  pharmacist: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
});
