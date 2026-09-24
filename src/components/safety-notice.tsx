import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'information-circle',
    title: 'Information only',
    body: 'PharmaSense shows drug label information from OpenFDA and RxNorm for learning and reference. It is not medical advice.',
  },
  {
    icon: 'medkit',
    title: 'No diagnosis, no personal dose',
    body: 'The app cannot diagnose you or tell you how much of a medicine to take. Follow the product label and ask a pharmacist or doctor.',
  },
  {
    icon: 'warning',
    title: 'Severe symptoms need real care',
    body: 'Trouble breathing, chest pain, face or throat swelling, a high fever, or symptoms that are severe or lasting: call your local emergency number or see a doctor now.',
  },
  {
    icon: 'cloud-upload',
    title: 'Ask AI uses a server',
    body: 'Questions you type in Ask AI are sent to the PharmaSense server and to Anthropic to generate an answer. Search, flashcards, and your history stay on this device.',
  },
];

export function SafetyNotice() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <View style={styles.list}>
      {POINTS.map((point) => (
        <View key={point.title} style={[styles.item, { backgroundColor: colors.backgroundElement }]}>
          <Ionicons name={point.icon} size={22} color={point.icon === 'warning' ? colors.warning : colors.tint} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{point.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{point.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  item: { flexDirection: 'row', gap: Spacing.three, borderRadius: 16, padding: Spacing.three },
  title: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20, marginTop: 2 },
});
