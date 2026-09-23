import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { getDatabaseInitError, getDrugCount, logUsage, searchDrugsByName } from '@/db/database';
import type { Drug } from '@/types/drug';

export default function SearchScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const initError = getDatabaseInitError();
  const catalogSize = useMemo(() => getDrugCount(), []);

  const [query, setQuery] = useState('');
  const searchLogged = useRef(false);

  const results = useMemo(() => searchDrugsByName(query), [query]);

  function handleQueryChange(text: string) {
    setQuery(text);
    if (text.trim().length >= 2 && !searchLogged.current) {
      logUsage('search');
      searchLogged.current = true;
    }
    if (text.trim().length === 0) searchLogged.current = false;
  }

  if (initError) {
    return (
      <View style={[styles.container, styles.emptyWrap, { backgroundColor: colors.background }]}>
        <Text style={[styles.empty, { color: colors.warning }]}>{initError}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search name, class, or brand…"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleQueryChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => handleQueryChange('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {query.trim()
              ? 'No cached drugs match that search.'
              : `Search ${catalogSize} drugs cached from OpenFDA and RxNorm.`}
          </Text>
        }
        ListFooterComponent={
          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            Label information only — not medical advice or a personal dose.
          </Text>
        }
        renderItem={({ item }) => <ResultCard drug={item} colors={colors} />}
      />
    </View>
  );
}

function ResultCard({
  drug,
  colors,
}: {
  drug: Drug;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  const isOtc = drug.otc_or_prescription === 'otc';
  return (
    <Pressable
      onPress={() => router.push(`/drug/${drug.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.9 : 1 },
      ]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: colors.text }]}>{drug.name}</Text>
          <Text style={[styles.cardClass, { color: colors.textSecondary }]}>{drug.drug_class}</Text>
          {!!drug.brand_names && (
            <Text style={[styles.cardClass, { color: colors.textSecondary }]} numberOfLines={1}>
              {drug.brand_names}
            </Text>
          )}
        </View>
        <View
          style={[styles.badge, { backgroundColor: isOtc ? colors.tintSoft : colors.backgroundSelected }]}>
          <Text style={[styles.badgeText, { color: isOtc ? colors.tint : colors.warning }]}>
            {isOtc ? 'OTC' : 'Rx'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: Spacing.two }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyWrap: { justifyContent: 'center', padding: Spacing.four },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    margin: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: Spacing.five, fontSize: 14, paddingHorizontal: Spacing.three },
  disclaimer: { textAlign: 'center', fontSize: 12, marginTop: Spacing.three, marginBottom: Spacing.two },
  card: { borderRadius: 16, padding: Spacing.three, marginBottom: Spacing.two },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardClass: { fontSize: 13, marginTop: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
