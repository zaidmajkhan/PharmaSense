import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { BpFlagCard } from '@/components/bp-flag-card';
import { SodiumProgressBars } from '@/components/sodium-progress';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { matchBpFlags } from '@/lib/bp-flags';
import { matchDrugName, toMatchCandidates } from '@/lib/drug-match';
import { getLatestScanResult } from '@/lib/scan-session';
import {
  addMyMedication,
  addSodiumLogEntry,
  getAllDrugs,
  getDrugById,
  getSodiumTotalForDate,
} from '@/db/database';
import type { Drug } from '@/types/drug';
import type { ScanLabelResult } from '@/types/scan';

export default function ScanResultScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [result, setResult] = useState<ScanLabelResult | null>(null);
  const [addedMed, setAddedMed] = useState(false);
  const [loggedSodium, setLoggedSodium] = useState(false);
  const [sodiumToday, setSodiumToday] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setResult(getLatestScanResult());
      setSodiumToday(getSodiumTotalForDate());
      setAddedMed(false);
      setLoggedSodium(false);
    }, [])
  );

  const matched = useMemo(() => {
    if (!result?.drugName) return null;
    return matchDrugName(result.drugName, toMatchCandidates(getAllDrugs()));
  }, [result]);

  const matchedDrug: Drug | null = matched ? getDrugById(matched.drug.id) : null;

  const flags = useMemo(() => {
    if (!result || result.labelType !== 'medication') return [];
    return matchBpFlags([
      result.drugName,
      result.rawText,
      matchedDrug?.name,
      matchedDrug?.brand_names,
      matchedDrug?.drug_class,
    ]);
  }, [result, matchedDrug]);

  if (!result) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Scan result' }} />
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No scan result yet.</Text>
        <Pressable
          onPress={() => router.replace('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Go to Scan"
          style={[styles.primary, { backgroundColor: colors.tint }]}>
          <Text style={styles.primaryText}>Scan a label</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Scan result' }} />

      {result.labelType === 'medication' ? (
        <MedicationResult
          result={result}
          matchedDrug={matchedDrug}
          matchScore={matched?.score ?? null}
          colors={colors}
          flags={flags}
          addedMed={addedMed}
          onAdd={() => {
            addMyMedication({
              drugId: matchedDrug?.id ?? null,
              displayName: matchedDrug?.name ?? result.drugName ?? 'Scanned medication',
              strength: result.strength,
              form: result.form,
              directions: result.directions,
              source: 'scan',
            });
            setAddedMed(true);
          }}
        />
      ) : null}

      {result.labelType === 'nutrition' ? (
        <NutritionResult
          result={result}
          colors={colors}
          sodiumToday={sodiumToday}
          loggedSodium={loggedSodium}
          onLog={() => {
            if (result.sodiumMg == null) return;
            addSodiumLogEntry({
              productName: result.productName,
              servingSize: result.servingSize,
              sodiumMg: result.sodiumMg,
            });
            setSodiumToday(getSodiumTotalForDate());
            setLoggedSodium(true);
          }}
        />
      ) : null}

      {result.labelType === 'unknown' ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Couldn’t read that label</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {result.reason ?? 'Try again with brighter light and the label filling the frame.'}
          </Text>
          <Pressable
            onPress={() => router.replace('/scan')}
            accessibilityRole="button"
            accessibilityLabel="Try scanning again"
            style={[styles.primary, { backgroundColor: colors.tint }]}>
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel="Search drugs manually"
            style={[styles.secondary, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.text }]}>Search manually</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Check with your pharmacist or doctor before changing anything. Prototype only — not medical
        advice.
      </Text>
    </ScrollView>
  );
}

function MedicationResult({
  result,
  matchedDrug,
  matchScore,
  colors,
  flags,
  addedMed,
  onAdd,
}: {
  result: ScanLabelResult;
  matchedDrug: Drug | null;
  matchScore: number | null;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  flags: ReturnType<typeof matchBpFlags>;
  addedMed: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={{ gap: Spacing.three }}>
      <View style={[styles.card, { backgroundColor: colors.tintSoft }]}>
        <Text style={[styles.kicker, { color: colors.tint }]}>MEDICATION LABEL</Text>
        <Text style={[styles.heading, { color: colors.text, fontFamily: Fonts?.rounded }]}>
          {result.drugName ?? 'Name not readable'}
        </Text>
        {result.strength ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Strength: {result.strength}</Text>
        ) : null}
        {result.form ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Form: {result.form}</Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Confidence: {Math.round(result.confidence * 100)}%
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Directions (as printed)</Text>
        <Text style={[styles.body, { color: colors.text }]}>
          {result.directions ?? 'No directions text could be read from this photo.'}
        </Text>
      </View>

      {matchedDrug ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Matched in your cache</Text>
          <Text style={[styles.headingSmall, { color: colors.text }]}>{matchedDrug.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {matchedDrug.drug_class}
            {matchScore != null ? ` · match ${Math.round(matchScore * 100)}%` : ''}
          </Text>
          {matchedDrug.brand_names ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Brands: {matchedDrug.brand_names}
            </Text>
          ) : null}
          <Text style={[styles.body, { color: colors.text, marginTop: Spacing.two }]}>
            {matchedDrug.uses}
          </Text>
          <Pressable
            onPress={() => router.push(`/drug/${matchedDrug.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open details for ${matchedDrug.name}`}
            style={styles.linkRow}>
            <Text style={[styles.link, { color: colors.tint }]}>Open full drug screen</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.tint} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>No confident cache match</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            We could not match this name to the local OpenFDA/RxNorm cache with enough confidence.
          </Text>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel="Search drugs manually"
            style={[styles.secondary, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.text }]}>Search manually</Text>
          </Pressable>
        </View>
      )}

      {flags.map((flag) => (
        <BpFlagCard key={flag.id} flag={flag} colors={colors} />
      ))}

      <Pressable
        onPress={onAdd}
        disabled={addedMed || !result.drugName}
        accessibilityRole="button"
        accessibilityLabel={addedMed ? 'Added to my medications' : 'Add to my medications'}
        style={({ pressed }) => [
          styles.primary,
          {
            backgroundColor: addedMed ? colors.success : colors.tint,
            opacity: pressed || !result.drugName ? 0.75 : 1,
          },
        ]}>
        <Text style={styles.primaryText}>
          {addedMed ? 'Added to My medications' : 'Add to My medications'}
        </Text>
      </Pressable>
    </View>
  );
}

function NutritionResult({
  result,
  colors,
  sodiumToday,
  loggedSodium,
  onLog,
}: {
  result: ScanLabelResult;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  sodiumToday: number;
  loggedSodium: boolean;
  onLog: () => void;
}) {
  const perServing = result.sodiumMg ?? 0;
  return (
    <View style={{ gap: Spacing.three }}>
      <View style={[styles.card, { backgroundColor: colors.tintSoft }]}>
        <Text style={[styles.kicker, { color: colors.tint }]}>NUTRITION LABEL</Text>
        <Text style={[styles.heading, { color: colors.text, fontFamily: Fonts?.rounded }]}>
          {result.productName ?? 'Food label'}
        </Text>
        {result.servingSize ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Serving size: {result.servingSize}
          </Text>
        ) : null}
        {result.servingsPerContainer ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Servings per container: {result.servingsPerContainer}
          </Text>
        ) : null}
        {result.sodiumDailyValuePercent != null ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Sodium %DV (as printed): {result.sodiumDailyValuePercent}%
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sodium per serving</Text>
        {result.sodiumMg == null ? (
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Sodium was not clearly printed on this label.
          </Text>
        ) : (
          <SodiumProgressBars sodiumMg={perServing} colors={colors} />
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today’s total after logging</Text>
        <SodiumProgressBars
          sodiumMg={loggedSodium ? sodiumToday : sodiumToday + (result.sodiumMg ?? 0)}
          colors={colors}
          compact
        />
        <Pressable
          onPress={onLog}
          disabled={loggedSodium || result.sodiumMg == null}
          accessibilityRole="button"
          accessibilityLabel={loggedSodium ? 'Logged to today’s sodium' : 'Log to today’s sodium total'}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: loggedSodium ? colors.success : colors.tint,
              opacity: pressed || result.sodiumMg == null ? 0.75 : 1,
              marginTop: Spacing.two,
            },
          ]}>
          <Text style={styles.primaryText}>
            {loggedSodium ? 'Logged to today’s sodium' : 'Log to today’s sodium'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: 20, padding: Spacing.four, gap: Spacing.one },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1 },
  heading: { fontSize: 26, fontWeight: '700', lineHeight: 32 },
  headingSmall: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  body: { fontSize: 16, lineHeight: 24 },
  meta: { fontSize: 15, lineHeight: 22 },
  primary: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondary: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  secondaryText: { fontSize: 16, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.two, minHeight: 44 },
  link: { fontSize: 16, fontWeight: '600' },
  disclaimer: { fontSize: 14, lineHeight: 20 },
});
