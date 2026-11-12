import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { getMyMedications, removeMyMedication } from '@/db/database';
import type { MyMedication } from '@/types/scan';

export default function MyMedicationsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [items, setItems] = useState<MyMedication[]>([]);

  const refresh = useCallback(() => {
    setItems(getMyMedications());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'My medications' }} />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            Saved on this device only. No account and no cloud sync.
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No medications yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Scan a medication label or add a drug from Search.
            </Text>
            <Pressable
              onPress={() => router.push('/scan')}
              accessibilityRole="button"
              accessibilityLabel="Scan a label"
              style={[styles.primary, { backgroundColor: colors.tint }]}>
              <Text style={styles.primaryText}>Scan a label</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/search')}
              accessibilityRole="button"
              accessibilityLabel="Search drugs"
              style={[styles.secondary, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryText, { color: colors.text }]}>Search drugs</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Pressable
              disabled={!item.drug_id}
              onPress={() => item.drug_id && router.push(`/drug/${item.drug_id}`)}
              accessibilityRole={item.drug_id ? 'button' : 'text'}
              accessibilityLabel={item.display_name}
              style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.name, { color: colors.text }]}>{item.display_name}</Text>
              {item.strength || item.form ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {[item.strength, item.form].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {item.directions ? (
                <Text style={[styles.directions, { color: colors.text }]} numberOfLines={3}>
                  {item.directions}
                </Text>
              ) : null}
              <Text style={[styles.source, { color: colors.textSecondary }]}>
                Added from {item.source === 'scan' ? 'scan' : 'search'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                removeMyMedication(item.id);
                refresh();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.display_name}`}
              hitSlop={12}
              style={styles.remove}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        )}
      />
      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Check with your pharmacist or doctor before changing anything.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  intro: { fontSize: 16, lineHeight: 24, marginBottom: Spacing.two },
  empty: { paddingTop: Spacing.five, gap: Spacing.two },
  emptyTitle: { fontSize: 22, fontWeight: '700' },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  card: {
    borderRadius: 18,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  name: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 15, lineHeight: 22 },
  directions: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  source: { fontSize: 13, marginTop: 6 },
  remove: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  primary: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondary: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: '600' },
  disclaimer: { fontSize: 14, lineHeight: 20, padding: Spacing.three },
});
