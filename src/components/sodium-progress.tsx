import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import {
  SODIUM_DAILY_LIMIT_MG,
  SODIUM_IDEAL_LIMIT_MG,
  computeSodiumProgress,
} from '@/lib/sodium';

type Theme = (typeof Colors)['light'] | (typeof Colors)['dark'];

export function SodiumProgressBars({
  sodiumMg,
  colors,
  compact = false,
}: {
  sodiumMg: number;
  colors: Theme;
  compact?: boolean;
}) {
  const progress = computeSodiumProgress(sodiumMg);

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={`Sodium ${Math.round(sodiumMg)} milligrams. ${Math.round(progress.percentOfIdealLimit)} percent of the 1500 milligram ideal limit. ${Math.round(progress.percentOfDailyLimit)} percent of the 2300 milligram daily limit.`}>
      <Text style={[styles.amount, { color: colors.text, fontSize: compact ? 22 : 28 }]}>
        {Math.round(sodiumMg)} mg
      </Text>
      {!compact ? (
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          of today’s sodium (local log)
        </Text>
      ) : null}

      <Bar
        label={`Ideal limit ${SODIUM_IDEAL_LIMIT_MG.toLocaleString()} mg`}
        fill={progress.cappedIdealProgress}
        colors={colors}
        tone={progress.percentOfIdealLimit > 100 ? 'warning' : 'tint'}
      />
      <Bar
        label={`Common daily limit ${SODIUM_DAILY_LIMIT_MG.toLocaleString()} mg`}
        fill={progress.cappedDailyProgress}
        colors={colors}
        tone={progress.percentOfDailyLimit > 100 ? 'danger' : 'tint'}
      />

      <Text style={[styles.note, { color: colors.textSecondary }]}>
        Individual limits vary. Follow your clinician’s advice.
      </Text>
    </View>
  );
}

function Bar({
  label,
  fill,
  colors,
  tone,
}: {
  label: string;
  fill: number;
  colors: Theme;
  tone: 'tint' | 'warning' | 'danger';
}) {
  const fillColor =
    tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.tint;
  return (
    <View style={styles.barBlock}>
      <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
        <View
          style={[styles.fill, { width: `${Math.round(fill * 100)}%`, backgroundColor: fillColor }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  amount: { fontWeight: '700' },
  caption: { fontSize: 16, lineHeight: 22, marginTop: -4 },
  barBlock: { gap: 6, marginTop: Spacing.one },
  barLabel: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  track: { height: 12, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  note: { fontSize: 14, lineHeight: 20, marginTop: Spacing.one },
});
