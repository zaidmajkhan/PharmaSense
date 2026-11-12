import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { BpFlagCard } from '@/components/bp-flag-card';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { matchBpFlags } from '@/lib/bp-flags';
import {
  addMyMedication,
  getDrugById,
  isDrugInMyMedications,
  logUsage,
} from '@/db/database';

export default function DrugDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [saved, setSaved] = useState(false);

  const drug = useMemo(() => getDrugById(Number(id)), [id]);
  const flags = useMemo(
    () => (drug ? matchBpFlags([drug.name, drug.brand_names, drug.drug_class]) : []),
    [drug]
  );

  useEffect(() => {
    if (drug) logUsage('view', drug.id);
  }, [drug]);

  useFocusEffect(
    useCallback(() => {
      if (drug) setSaved(isDrugInMyMedications(drug.id));
    }, [drug])
  );

  if (!drug) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Drug not found.</Text>
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
      {!!drug.brand_names && (
        <Text style={[styles.drugClass, { color: colors.textSecondary }]}>
          Brands: {drug.brand_names}
        </Text>
      )}
      {!!drug.rxcui && (
        <Text style={[styles.drugClass, { color: colors.textSecondary }]}>RxNorm {drug.rxcui}</Text>
      )}

      <View
        style={[
          styles.badge,
          { backgroundColor: isOtc ? colors.tintSoft : colors.backgroundElement },
        ]}>
        <Text style={[styles.badgeText, { color: isOtc ? colors.tint : colors.warning }]}>
          {isOtc ? 'Over the counter' : 'Prescription only'}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          if (saved) return;
          addMyMedication({
            drugId: drug.id,
            displayName: drug.name,
            source: 'search',
          });
          setSaved(true);
        }}
        disabled={saved}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Already in my medications' : 'Add to my medications'}
        style={({ pressed }) => [
          styles.addButton,
          {
            backgroundColor: saved ? colors.success : colors.tint,
            opacity: pressed ? 0.88 : 1,
          },
        ]}>
        <Text style={styles.addButtonText}>
          {saved ? 'In My medications' : 'Add to My medications'}
        </Text>
      </Pressable>

      {flags.map((flag) => (
        <View key={flag.id} style={{ marginTop: Spacing.two }}>
          <BpFlagCard flag={flag} colors={colors} />
        </View>
      ))}

      <Section title="Notable fact" body={drug.notable_fact} colors={colors} />
      <Section title="Uses" body={drug.uses} colors={colors} />
      <Section title="Label dosing" body={drug.dosing} colors={colors} />
      <Section title="Side effects" body={drug.side_effects} colors={colors} />
      <Section title="Interactions" body={drug.interactions} colors={colors} />

      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Uses, dosing, side effects, and interactions are copied from OpenFDA drug labels and
        classified with RxNorm. The dosing section is label text, not a dose for you. Check with
        your pharmacist or doctor before changing anything. Informational only — not medical advice.
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
  addButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
  sectionBody: { fontSize: 16, lineHeight: 24 },
  disclaimer: { fontSize: 14, lineHeight: 20, marginTop: Spacing.three, textAlign: 'center' },
});
