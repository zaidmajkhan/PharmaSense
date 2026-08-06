import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { askClaude, type ChatMessage } from '@/ai/claude';
import { Colors, Spacing } from '@/constants/theme';
import { findRelevantDrugs, logUsage } from '@/db/database';

interface Bubble extends ChatMessage {
  id: string;
  error?: boolean;
}

const WELCOME =
  'Hi! I can explain any drug in your local PharmaSense cache in plain language, or suggest general OTC categories for mild symptoms. I never recommend specific brands or doses, and I\u2019m not a substitute for a doctor.';

export default function AskAiScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [messages, setMessages] = useState<Bubble[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Bubble>>(null);

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');

    const userBubble: Bubble = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userBubble]);
    setSending(true);

    // Ground the model in the local cache: find drugs whose name, class, or
    // uses text match the message and inject them as context.
    const contextDrugs = findRelevantDrugs(text);

    // Log the interaction; attach a drug_id when the message names a cached drug.
    const mentioned = contextDrugs.find((d) => text.toLowerCase().includes(d.name.toLowerCase()));
    logUsage('ai_query', mentioned?.id ?? null);

    try {
      if (!apiKey) {
        throw new Error(
          'No API key configured. Copy .env.example to .env, set EXPO_PUBLIC_ANTHROPIC_API_KEY, and restart the dev server.'
        );
      }
      const history: ChatMessage[] = [...messages, userBubble]
        .filter((m) => m.id !== 'welcome' && !m.error)
        .map(({ role, content }) => ({ role, content }));
      const reply = await askClaude(history, contextDrugs, apiKey);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user'
                ? [styles.userBubble, { backgroundColor: colors.tint }]
                : [
                    styles.assistantBubble,
                    { backgroundColor: item.error ? colors.tintSoft : colors.backgroundElement },
                  ],
            ]}>
            <Text
              style={{
                color: item.role === 'user' ? '#fff' : item.error ? colors.warning : colors.text,
                fontSize: 15,
                lineHeight: 21,
              }}>
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          sending ? (
            <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.backgroundElement }]}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : null
        }
      />

      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        General information only — not medical advice.
      </Text>

      <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.backgroundElement, color: colors.text },
          ]}
          placeholder="Ask about a drug or symptom…"
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: sending || !input.trim() ? colors.backgroundSelected : colors.tint,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  disclaimer: { fontSize: 11, textAlign: 'center', paddingBottom: Spacing.one },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
