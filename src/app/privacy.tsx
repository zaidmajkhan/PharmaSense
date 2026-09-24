import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

const LAST_UPDATED = 'September 24, 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What stays on your device',
    body: 'The drug database, your searches, drugs you view, flashcard progress, usage stats, and your saved Ask AI conversation are stored only on your device. PharmaSense has no accounts and does not upload this history.',
  },
  {
    title: 'What Ask AI sends',
    body: 'When you send a message in Ask AI, the app sends the recent messages in that conversation, the RxNorm ids of drugs from the local database that match your question, and a random install id to the PharmaSense server. The server forwards the conversation and the matching drug information to Anthropic, which generates the answer. The install id is used only to limit how many questions can be asked per hour; it is not linked to your name, email, or device identifiers.',
  },
  {
    title: 'How the server handles requests',
    body: 'The PharmaSense server does not store your messages. The hosting provider (Expo EAS Hosting) may keep standard request logs such as time, status, and approximate region for operating the service. Anthropic processes messages under its commercial API terms.',
  },
  {
    title: 'What to avoid sharing',
    body: 'Do not type your name, contact details, or other personal identifiers into Ask AI. Describe symptoms and medicines in general terms.',
  },
  {
    title: 'Deleting your data',
    body: 'Clear the Ask AI conversation with the trash icon on that tab, or uninstall the app to remove all data stored on the device.',
  },
  {
    title: 'Not medical advice',
    body: 'PharmaSense provides drug label information for reference and learning. It does not diagnose conditions or recommend doses. For severe or lasting symptoms, see a doctor or contact emergency services.',
  },
];

export default function PrivacyScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.updated, { color: colors.textSecondary }]}>Last updated {LAST_UPDATED}</Text>
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.title, { color: colors.text }]}>{section.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three, maxWidth: 720 },
  updated: { fontSize: 13 },
  section: { gap: Spacing.one },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
});
