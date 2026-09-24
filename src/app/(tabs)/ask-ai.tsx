import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { AskError, askPharmaSense } from '@/ai/client';
import { mergeByRecency } from '@/ai/context';
import type { ChatMessage } from '@/ai/prompt';
import { Colors, Spacing } from '@/constants/theme';
import { findRelevantDrugs, logUsage } from '@/db/database';

interface Bubble extends ChatMessage {
  id: string;
  error?: boolean;
  /** For error bubbles: the user message to resend on Retry. */
  retryText?: string;
}

const THREAD_KEY = 'askai:thread';
const MAX_SAVED = 50;
const MAX_HISTORY_SENT = 20;
/** Earlier user turns scanned for drug context, and the server's rxcui cap. */
const CONTEXT_TURNS = 3;
const MAX_CONTEXT_DRUGS = 8;

const WELCOME: Bubble = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi! I can explain any drug in your local PharmaSense cache in plain language, or suggest general OTC categories for mild symptoms. I never recommend specific brands or doses, and I\u2019m not a substitute for a doctor.',
};

export default function AskAiScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation();

  const [messages, setMessages] = useState<Bubble[]>([WELCOME]);
  const [restored, setRestored] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Bubble>>(null);

  useEffect(() => {
    AsyncStorage.getItem(THREAD_KEY)
      .then((stored) => {
        const saved = stored ? (JSON.parse(stored) as Bubble[]) : [];
        if (Array.isArray(saved) && saved.length > 0) setMessages([WELCOME, ...saved]);
      })
      .catch(() => {})
      .finally(() => setRestored(true));
  }, []);

  useEffect(() => {
    if (!restored) return;
    const toSave = messages.filter((m) => m.id !== 'welcome').slice(-MAX_SAVED);
    AsyncStorage.setItem(THREAD_KEY, JSON.stringify(toSave)).catch(() => {});
  }, [messages, restored]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={confirmClear}
          hitSlop={10}
          accessibilityLabel="Clear chat"
          style={{ marginRight: Spacing.three }}>
          <Ionicons name="trash-outline" size={20} color={colors.tint} />
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, colors.tint, messages.length]);

  function confirmClear() {
    if (messages.length <= 1) return;
    const clear = () => setMessages([WELCOME]);
    if (Platform.OS === 'web') {
      clear();
      return;
    }
    Alert.alert('Clear chat?', 'This removes the conversation from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);
  }

  async function send(text: string, base: Bubble[]) {
    setSending(true);

    // Ground the model in the local cache; the server re-reads these drugs by RxNorm id.
    // Earlier user turns are matched too so follow-ups keep the drug under discussion.
    const currentDrugs = findRelevantDrugs(text);
    const earlierTurns = base
      .filter((m) => m.role === 'user')
      .slice(0, -1) // base always ends with the current question
      .slice(-CONTEXT_TURNS)
      .reverse();
    const contextDrugs = mergeByRecency(
      [currentDrugs, ...earlierTurns.map((m) => findRelevantDrugs(m.content))],
      (d) => d.id,
      MAX_CONTEXT_DRUGS
    );
    const mentioned = currentDrugs.find((d) => text.toLowerCase().includes(d.name.toLowerCase()));
    logUsage('ai_query', mentioned?.id ?? null);

    try {
      const history: ChatMessage[] = base
        .filter((m) => m.id !== 'welcome' && !m.error)
        .map(({ role, content }) => ({ role, content }))
        .slice(-MAX_HISTORY_SENT);
      while (history.length > 0 && history[0].role !== 'user') history.shift();
      const rxcuis = contextDrugs.map((d) => d.rxcui).filter((id): id is string => !!id);
      const reply = await askPharmaSense(history, rxcuis);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: err instanceof AskError ? err.message : 'Something went wrong. Please try again.',
          error: true,
          retryText: text,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userBubble: Bubble = { id: `u-${Date.now()}`, role: 'user', content: text };
    const next = [...messages, userBubble];
    setMessages(next);
    send(text, next);
  }

  function handleRetry(errorBubble: Bubble) {
    if (sending || !errorBubble.retryText) return;
    const next = messages.filter((m) => m.id !== errorBubble.id);
    setMessages(next);
    send(errorBubble.retryText, next);
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
            {item.error && item.retryText && (
              <Pressable
                onPress={() => handleRetry(item)}
                disabled={sending}
                style={({ pressed }) => [styles.retry, { opacity: pressed || sending ? 0.6 : 1 }]}>
                <Ionicons name="refresh" size={14} color={colors.tint} />
                <Text style={[styles.retryText, { color: colors.tint }]}>Retry</Text>
              </Pressable>
            )}
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
        General information only — not medical advice. Messages are sent to our server to answer.
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
          maxLength={2000}
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
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.two },
  retryText: { fontSize: 14, fontWeight: '600' },
  disclaimer: { fontSize: 11, textAlign: 'center', paddingBottom: Spacing.one, paddingHorizontal: Spacing.three },
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
