import { ScrollView, StyleSheet, Text, useColorScheme } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

const LAST_UPDATED = 'November 12, 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What stays on your device',
    body: 'The drug database, your searches, drugs you view, flashcard progress, usage stats, your saved Ask AI conversation, My medications, and today’s sodium log are stored only on your device (or in this browser for the web demo). PharmaSense has no accounts and does not upload this history.',
  },
  {
    title: 'What Ask AI sends',
    body: 'When you send a message in Ask AI, the app sends the recent messages in that conversation, the RxNorm ids of drugs from the local database that match your question, and a random install id to the PharmaSense server. The server forwards the conversation and the matching drug information to Anthropic, which generates the answer. The install id is used only to limit how many questions can be asked per hour; it is not linked to your name, email, or device identifiers.',
  },
  {
    title: 'What Scan sends',
    body: 'When you scan or upload a label photo, the image is sent to the PharmaSense server for vision extraction, then discarded. Photos are not saved on the device or server. Do not include a patient’s name or address in the frame. The server does not log image bytes or extracted raw label text.',
  },
  {
    title: 'How the server handles requests',
    body: 'The PharmaSense server does not store your messages or scan images. The hosting provider (Expo EAS Hosting) may keep standard request logs such as time, status, and approximate region for operating the service. Anthropic processes messages and images under its commercial API terms.',
  },
  {
    title: 'What to avoid sharing',
    body: 'Do not type your name, contact details, or other personal identifiers into Ask AI. Describe symptoms and medicines in general terms. Keep identifiers out of label photos.',
  },
  {
    title: 'Deleting your data',
    body: 'Clear the Ask AI conversation with the trash icon on that tab, remove items from My medications, or uninstall the app / clear site data in the browser to remove local data.',
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
        <ViewBlock key={section.title} title={section.title} body={section.body} colors={colors} />
      ))}
    </ScrollView>
  );
}

function ViewBlock({
  title,
  body,
  colors,
}: {
  title: string;
  body: string;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  updated: { fontSize: 13, marginBottom: Spacing.two },
  title: { fontSize: 17, fontWeight: '700', marginTop: Spacing.two },
  body: { fontSize: 15, lineHeight: 22 },
});
