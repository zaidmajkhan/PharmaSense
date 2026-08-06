import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getDrugById, logUsage } from '@/db/database';

export default function DrugDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const drug = useMemo(() => getDrugById(Number(id)), [id]);

  useEffect(() => {
    if (drug) logUsage('view', drug.id);
  }, [drug]);

  if (!drug) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Drug not found.</Text>
      </View>
    );
  }

  const isOtc = drug.otc_or_prescription === 'otc';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: drug.name }} />

      <Text style={[styles.name, { color: colors.text, fontFamily: Fonts?.rounded }]}>
        {drug.name}
      </Text>
      <Text style={[styles.drugClass, { color: colors.textSecondary }]}>{drug.drug_class}</Text>

      <View
        style={[
          styles.badge,
          { backgroundColor: isOtc ? colors.tintSoft : colors.backgroundElement },
        ]}>
        <Text style={[styles.badgeText, { color: isOtc ? colors.tint : colors.warning }]}>
          {isOtc ? 'Over the counter' : 'Prescription only'}
        </Text>
      </View>

      <Section title="Notable fact" body={drug.notable_fact} colors={colors} />
      <Section title="Uses" body={drug.uses} colors={colors} />
      <Section title="Dosing" body={drug.dosing} colors={colors} />
      <Section title="Side effects" body={drug.side_effects} colors={colors} />
      <Section title="Interactions" body={drug.interactions} colors={colors} />

      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Cached from OpenFDA / RxNorm label data. Informational only — not medical advice.
      </Text>
    </ScrollView>
  );
}

function Section({
  title,
  body,
  colors,
}: {
  title: string;
  body: string;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.sectionTitle, { color: colors.tint }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.text }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  name: { fontSize: 28, fontWeight: '700' },
  drugClass: { fontSize: 16, marginTop: Spacing.one },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  section: {
    borderRadius: 16,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.one,
  },
  sectionBody: { fontSize: 15, lineHeight: 22 },
  disclaimer: { fontSize: 12, marginTop: Spacing.three, textAlign: 'center' },
});
