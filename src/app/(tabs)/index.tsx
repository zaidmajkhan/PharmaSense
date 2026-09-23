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

import { Colors, Fonts, Spacing } from '@/constants/theme';
import {
  getAiQueriesThisWeek,
  getDatabaseInitError,
  getDrugOfTheDay,
  getFlashcardsReviewedCount,
  getRecentlyViewedDrugs,
} from '@/db/database';
import type { Drug } from '@/types/drug';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [drugOfTheDay, setDrugOfTheDay] = useState<Drug | null>(null);
  const [flashcardsReviewed, setFlashcardsReviewed] = useState(0);
  const [aiQueriesThisWeek, setAiQueriesThisWeek] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState<Drug[]>([]);

  // Re-query on focus so stats and recents stay fresh after using other tabs.
  useFocusEffect(
    useCallback(() => {
      setDrugOfTheDay(getDrugOfTheDay());
      setFlashcardsReviewed(getFlashcardsReviewedCount());
      setAiQueriesThisWeek(getAiQueriesThisWeek());
      setRecentlyViewed(getRecentlyViewedDrugs(5));
    }, [])
  );

  const initError = getDatabaseInitError();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      {initError ? (
        <Text style={{ color: colors.warning, marginBottom: Spacing.three }}>{initError}</Text>
      ) : null}
      {drugOfTheDay && (
        <Pressable
          onPress={() => router.push(`/drug/${drugOfTheDay.id}`)}
          style={({ pressed }) => [
            styles.dotdCard,
            { backgroundColor: colors.tintSoft, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Text style={[styles.dotdLabel, { color: colors.tint }]}>DRUG OF THE DAY</Text>
          <Text style={[styles.dotdName, { color: colors.text, fontFamily: Fonts?.rounded }]}>
            {drugOfTheDay.name}
          </Text>
          <Text style={[styles.dotdClass, { color: colors.textSecondary }]}>
            {drugOfTheDay.drug_class}
          </Text>
          <Text style={[styles.dotdFact, { color: colors.text }]}>
            {drugOfTheDay.notable_fact}
          </Text>
          <Text style={[styles.dotdTap, { color: colors.tint }]}>Tap for full details →</Text>
        </Pressable>
      )}

      <View style={styles.statsRow}>
        <StatCard
          icon="albums"
          value={flashcardsReviewed}
          label="Flashcards reviewed"
          colors={colors}
        />
        <StatCard
          icon="sparkles"
          value={aiQueriesThisWeek}
          label="AI queries this week"
          colors={colors}
        />
      </View>

      <View style={styles.shortcutsRow}>
        <Shortcut icon="sparkles" label="Ask AI" onPress={() => router.push('/ask-ai')} colors={colors} />
        <Shortcut icon="search" label="Search" onPress={() => router.push('/search')} colors={colors} />
        <Shortcut
          icon="albums"
          label="Continue Flashcards"
          onPress={() => router.push('/flashcards')}
          colors={colors}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently viewed</Text>
      {recentlyViewed.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>
          Drugs you open will show up here.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentlyViewed.map((drug) => (
            <Pressable
              key={drug.id}
              onPress={() => router.push(`/drug/${drug.id}`)}
              style={({ pressed }) => [
                styles.recentCard,
                { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.85 : 1 },
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
        Drug facts are cached from OpenFDA and RxNorm. Informational only — not medical advice.
      </Text>
    </ScrollView>
  );
}

function StatCard({
  icon,
  value,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
      <Ionicons name={icon} size={18} color={colors.tint} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Ionicons name={icon} size={20} color={colors.tint} />
      <Text style={[styles.shortcutLabel, { color: colors.text }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  dotdCard: { borderRadius: 20, padding: Spacing.four },
  dotdLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  dotdName: { fontSize: 26, fontWeight: '700', marginTop: Spacing.one },
  dotdClass: { fontSize: 15, marginTop: 2 },
  dotdFact: { fontSize: 15, lineHeight: 21, marginTop: Spacing.two },
  dotdTap: { fontSize: 13, fontWeight: '600', marginTop: Spacing.two },
  statsRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  statCard: { flex: 1, borderRadius: 16, padding: Spacing.three, gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  shortcutsRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  shortcut: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  shortcutLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  recentCard: {
    width: 140,
    borderRadius: 16,
    padding: Spacing.three,
    marginRight: Spacing.two,
  },
  recentName: { fontSize: 15, fontWeight: '600' },
  recentClass: { fontSize: 12, marginTop: 2 },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: Spacing.four },
});
