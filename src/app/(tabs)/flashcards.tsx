import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getAllDrugs, getDatabaseInitError, logUsage } from '@/db/database';

const LAST_INDEX_KEY = 'flashcards:lastIndex';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

export default function FlashcardsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const drugs = useMemo(() => getAllDrugs(), []);
  const [index, setIndex] = useState<number | null>(null); // null until restored
  const indexRef = useRef(0);
  const loggedIndex = useRef<number | null>(null);

  const translateX = useSharedValue(0);
  const flip = useSharedValue(0); // 0 = front, 1 = back

  // Resume from the last-viewed card.
  useEffect(() => {
    AsyncStorage.getItem(LAST_INDEX_KEY).then((stored) => {
      const parsed = stored ? Number(stored) : 0;
      setIndex(Number.isFinite(parsed) && parsed >= 0 && parsed < drugs.length ? parsed : 0);
    });
  }, [drugs.length]);

  useEffect(() => {
    if (index !== null) indexRef.current = index;
  }, [index]);

  // Persist position only. A review is logged when the card is flipped or swiped forward.
  useEffect(() => {
    if (index === null || drugs.length === 0) return;
    AsyncStorage.setItem(LAST_INDEX_KEY, String(index));
  }, [index, drugs.length]);

  function recordReviewOnce() {
    const current = indexRef.current;
    if (loggedIndex.current === current) return;
    const drug = drugs[current];
    if (!drug) return;
    loggedIndex.current = current;
    logUsage('flashcard', drug.id);
  }

  function advance(direction: 1 | -1) {
    if (direction === 1) recordReviewOnce();
    setIndex((prev) => {
      if (prev === null || drugs.length === 0) return prev;
      return (prev + direction + drugs.length) % drugs.length;
    });
    flip.value = 0;
    translateX.value = 0;
  }

  // Gesture callbacks run on the UI thread and call into JS via runOnJS.
  // React Compiler's ref lint treats that as reading refs during render.
  /* eslint-disable react-hooks/refs */
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        // Swipe left -> next card, swipe right -> previous card.
        const direction = e.translationX < 0 ? 1 : -1;
        translateX.value = withTiming(
          -direction * SCREEN_WIDTH * 1.2,
          { duration: 180 },
          (finished) => {
            if (finished) runOnJS(advance)(direction as 1 | -1);
          }
        );
      } else {
        translateX.value = withSpring(0);
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    const opening = flip.value <= 0.5;
    flip.value = withTiming(opening ? 1 : 0, { duration: 350 });
    if (opening) runOnJS(recordReviewOnce)();
  });

  const gesture = Gesture.Exclusive(pan, tap);
  /* eslint-enable react-hooks/refs */

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${translateX.value / 28}deg` },
    ],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
    opacity: flip.value < 0.5 ? 0 : 1,
  }));

  if (index === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  if (drugs.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: Spacing.four }]}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {getDatabaseInitError() ?? 'No drugs are cached yet. Run the seed script, then reopen the app.'}
        </Text>
      </View>
    );
  }

  const drug = drugs[index];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.progress, { color: colors.textSecondary }]}>
        Card {index + 1} of {drugs.length}
      </Text>

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.cardWrap, cardStyle]}>
          <Animated.View
            style={[styles.card, { backgroundColor: colors.tintSoft }, frontStyle]}>
            <Text style={[styles.frontLabel, { color: colors.tint }]}>DRUG</Text>
            <Text style={[styles.frontName, { color: colors.text, fontFamily: Fonts?.rounded }]}>
              {drug.name}
            </Text>
            <Text style={[styles.frontClass, { color: colors.textSecondary }]}>
              {drug.drug_class}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>Tap to flip</Text>
          </Animated.View>

          <Animated.View
            style={[styles.card, styles.cardBack, { backgroundColor: colors.backgroundElement }, backStyle]}>
            <Text style={[styles.backLabel, { color: colors.tint }]}>USES</Text>
            <Text style={[styles.backBody, { color: colors.text }]} numberOfLines={7}>
              {drug.uses}
            </Text>
            <Text style={[styles.backLabel, { color: colors.warning, marginTop: Spacing.three }]}>
              SIDE EFFECTS
            </Text>
            <Text style={[styles.backBody, { color: colors.text }]} numberOfLines={7}>
              {drug.side_effects}
            </Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <Text style={[styles.swipeHint, { color: colors.textSecondary }]}>
        Swipe left for next · right for previous
      </Text>
      <Text style={[styles.swipeHint, { color: colors.textSecondary }]}>
        Study aid only — not medical advice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progress: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.three },
  cardWrap: { width: '100%', maxWidth: 480, aspectRatio: 0.72, maxHeight: 520 },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  cardBack: { alignItems: 'flex-start', justifyContent: 'flex-start' },
  frontLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  frontName: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginTop: Spacing.two },
  frontClass: { fontSize: 16, textAlign: 'center', marginTop: Spacing.one },
  hint: { position: 'absolute', bottom: Spacing.three, fontSize: 12 },
  backLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  backBody: { fontSize: 14, lineHeight: 20, marginTop: Spacing.one },
  swipeHint: { fontSize: 12, marginTop: Spacing.three },
});
