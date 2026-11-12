import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { SodiumProgressBars } from '@/components/sodium-progress';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import {
  getDatabaseInitError,
  getDrugOfTheDay,
  getMyMedications,
  getMyMedicationsCount,
  getRecentlyViewedDrugs,
  getSodiumTotalForDate,
} from '@/db/database';
import type { Drug } from '@/types/drug';
import type { MyMedication } from '@/types/scan';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [drugOfTheDay, setDrugOfTheDay] = useState<Drug | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<Drug[]>([]);
  const [medCount, setMedCount] = useState(0);
  const [medPreview, setMedPreview] = useState<MyMedication[]>([]);
  const [sodiumToday, setSodiumToday] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setDrugOfTheDay(getDrugOfTheDay());
      setRecentlyViewed(getRecentlyViewedDrugs(5));
      setMedCount(getMyMedicationsCount());
      setMedPreview(getMyMedications().slice(0, 3));
      setSodiumToday(getSodiumTotalForDate());
    }, [])
  );

  const initError = getDatabaseInitError();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      accessibilityLabel="PharmaSense home">
      {initError ? (
        <Text style={{ color: colors.warning, marginBottom: Spacing.three, fontSize: 16 }}>
          {initError}
        </Text>
      ) : null}

      <View style={[styles.hero, { backgroundColor: colors.hero, borderColor: colors.border }]}>
        <Text style={[styles.brand, { color: colors.tint, fontFamily: Fonts?.rounded }]}>
          PharmaSense
        </Text>
        <Text style={[styles.heroTitle, { color: colors.text, fontFamily: Fonts?.rounded }]}>
          Blood pressure support, on your phone
        </Text>
        <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
          Scan medication and nutrition labels. Keep a simple med list and watch today’s sodium —
          all on this device.
        </Text>

        <Pressable
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Scan a label"
          style={({ pressed }) => [
            styles.scanButton,
            { backgroundColor: colors.tint, opacity: pressed ? 0.88 : 1 },
          ]}>
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.scanButtonText}>Scan a label</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <Pressable
          onPress={() => router.push('/my-medications')}
          accessibilityRole="button"
          accessibilityLabel={`My medications, ${medCount} saved`}
          style={({ pressed }) => [
            styles.summaryCard,
            { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.9 : 1 },
          ]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="medkit-outline" size={22} color={colors.tint} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>My medications</Text>
          </View>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{medCount}</Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>
            {medCount === 0
              ? 'Nothing saved yet. Scan a label or add from Search.'
              : medPreview.map((m) => m.display_name).join(', ')}
          </Text>
        </Pressable>

        <View
          style={[styles.summaryCard, { backgroundColor: colors.backgroundElement }]}
          accessibilityLabel="Sodium watch summary">
          <View style={styles.summaryHeader}>
            <Ionicons name="water-outline" size={22} color={colors.tint} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Sodium watch</Text>
          </View>
          <SodiumProgressBars sodiumMg={sodiumToday} colors={colors} compact />
        </View>
      </View>

      {drugOfTheDay ? (
        <Pressable
          onPress={() => router.push(`/drug/${drugOfTheDay.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Drug of the day, ${drugOfTheDay.name}`}
          style={({ pressed }) => [
            styles.dotdCard,
            { backgroundColor: colors.tintSoft, opacity: pressed ? 0.9 : 1 },
          ]}>
          <Text style={[styles.dotdLabel, { color: colors.tint }]}>DRUG OF THE DAY</Text>
          <Text style={[styles.dotdName, { color: colors.text, fontFamily: Fonts?.rounded }]}>
            {drugOfTheDay.name}
          </Text>
          <Text style={[styles.dotdClass, { color: colors.textSecondary }]}>
            {drugOfTheDay.drug_class}
          </Text>
          <Text style={[styles.dotdFact, { color: colors.text }]}>{drugOfTheDay.notable_fact}</Text>
          <Text style={[styles.dotdTap, { color: colors.tint }]}>Tap for full details →</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently viewed</Text>
      {recentlyViewed.length === 0 ? (
        <Text style={[styles.emptyRecent, { color: colors.textSecondary }]}>
          Drugs you open will show up here.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentlyViewed.map((drug) => (
            <Pressable
              key={drug.id}
              onPress={() => router.push(`/drug/${drug.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${drug.name}, ${drug.drug_class}`}
              style={({ pressed }) => [
                styles.recentCard,
                { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.9 : 1 },
              ]}>
              <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                {drug.name}
              </Text>
              <Text
                style={[styles.recentClass, { color: colors.textSecondary }]}
                numberOfLines={2}>
                {drug.drug_class}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Prototype only — not medical advice. Drug facts are cached from OpenFDA and RxNorm. Check
        with your pharmacist or doctor before changing anything.
      </Text>
      <Pressable
        onPress={() => router.push('/about')}
        accessibilityRole="button"
        accessibilityLabel="About and safety"
        style={styles.aboutLink}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.tint} />
        <Text style={[styles.aboutText, { color: colors.tint }]}>About and safety</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  brand: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  heroTitle: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heroBody: { fontSize: 16, lineHeight: 24 },
  scanButton: {
    marginTop: Spacing.two,
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  summaryRow: { gap: Spacing.three, marginTop: Spacing.three },
  summaryCard: { borderRadius: 20, padding: Spacing.three, gap: Spacing.two },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  summaryTitle: { fontSize: 17, fontWeight: '700' },
  summaryValue: { fontSize: 36, fontWeight: '700', lineHeight: 40 },
  summaryHint: { fontSize: 15, lineHeight: 22 },
  dotdCard: { borderRadius: 20, padding: Spacing.four, marginTop: Spacing.three },
  dotdLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  dotdName: { fontSize: 26, fontWeight: '700', marginTop: Spacing.one },
  dotdClass: { fontSize: 16, marginTop: 2 },
  dotdFact: { fontSize: 16, lineHeight: 24, marginTop: Spacing.two },
  dotdTap: { fontSize: 15, fontWeight: '600', marginTop: Spacing.two },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  emptyRecent: { fontSize: 16, lineHeight: 24 },
  recentCard: {
    width: 150,
    borderRadius: 16,
    padding: Spacing.three,
    marginRight: Spacing.two,
    minHeight: 88,
  },
  recentName: { fontSize: 16, fontWeight: '600' },
  recentClass: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  disclaimer: { fontSize: 14, lineHeight: 20, marginTop: Spacing.four },
  aboutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
    minHeight: 44,
  },
  aboutText: { fontSize: 16, fontWeight: '600' },
});
