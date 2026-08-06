import Ionicons from '@expo/vector-icons/Ionicons';
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
import { logUsage, searchDrugsByName } from '@/db/database';
import type { Drug } from '@/types/drug';

export default function SearchScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Track which drugs already got a 'view' log this session so re-collapsing
  // and re-expanding the same card doesn't double count.
  const viewedIds = useRef(new Set<number>());
  const searchLogged = useRef(false);

  const results = useMemo(() => searchDrugsByName(query), [query]);

  function handleQueryChange(text: string) {
    setQuery(text);
    setExpandedId(null);
    // Log one 'search' usage per typed query session.
    if (text.trim().length >= 2 && !searchLogged.current) {
      logUsage('search');
      searchLogged.current = true;
    }
    if (text.trim().length === 0) searchLogged.current = false;
  }

  function toggleExpand(drug: Drug) {
    const opening = expandedId !== drug.id;
    setExpandedId(opening ? drug.id : null);
    if (opening && !viewedIds.current.has(drug.id)) {
      logUsage('view', drug.id);
      viewedIds.current.add(drug.id);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search drugs by name…"
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
              ? 'No cached drugs match that name.'
              : 'Search the local cache of 73 common OTC and prescription drugs.'}
          </Text>
        }
        renderItem={({ item }) => (
          <ResultCard
            drug={item}
            expanded={expandedId === item.id}
            onPress={() => toggleExpand(item)}
            colors={colors}
          />
        )}
      />
    </View>
  );
}

function ResultCard({
  drug,
  expanded,
  onPress,
  colors,
}: {
  drug: Drug;
  expanded: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  const isOtc = drug.otc_or_prescription === 'otc';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.9 : 1 },
      ]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: colors.text }]}>{drug.name}</Text>
          <Text style={[styles.cardClass, { color: colors.textSecondary }]}>
            {drug.drug_class}
          </Text>
        </View>
        <View
          style={[styles.badge, { backgroundColor: isOtc ? colors.tintSoft : colors.backgroundSelected }]}>
          <Text style={[styles.badgeText, { color: isOtc ? colors.tint : colors.warning }]}>
            {isOtc ? 'OTC' : 'Rx'}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
          style={{ marginLeft: Spacing.two }}
        />
      </View>

      {expanded && (
        <View style={styles.detail}>
          <DetailRow label="Uses" body={drug.uses} colors={colors} />
          <DetailRow label="Dosing" body={drug.dosing} colors={colors} />
          <DetailRow label="Side effects" body={drug.side_effects} colors={colors} />
          <DetailRow label="Interactions" body={drug.interactions} colors={colors} />
          <DetailRow
            label="Availability"
            body={isOtc ? 'Over the counter' : 'Prescription only'}
            colors={colors}
          />
        </View>
      )}
    </Pressable>
  );
}

function DetailRow({
  label,
  body,
  colors,
}: {
  label: string;
  body: string;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <View style={{ marginTop: Spacing.two }}>
      <Text style={[styles.detailLabel, { color: colors.tint }]}>{label}</Text>
      <Text style={[styles.detailBody, { color: colors.text }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  empty: { textAlign: 'center', marginTop: Spacing.five, fontSize: 14 },
  card: { borderRadius: 16, padding: Spacing.three, marginBottom: Spacing.two },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardClass: { fontSize: 13, marginTop: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  detail: { marginTop: Spacing.one },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailBody: { fontSize: 14, lineHeight: 20, marginTop: 2 },
});
