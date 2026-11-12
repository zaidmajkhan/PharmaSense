import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { ScanError, scanLabelImage } from '@/ai/scan-client';
import { Colors, Spacing } from '@/constants/theme';
import { setLatestScanResult } from '@/lib/scan-session';

const IS_WEB = Platform.OS === 'web';

export default function ScanScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  async function processBase64(base64: string, mimeType: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await scanLabelImage(base64, mimeType);
      setLatestScanResult(result);
      router.push('/scan-result');
    } catch (err) {
      const message = err instanceof ScanError ? err.message : 'Scan failed. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    if (!cameraRef.current || busy) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        exif: false,
        shutterSound: false,
      });
      if (!photo?.base64) {
        setError('Could not capture that photo. Try again or pick from your library.');
        return;
      }
      await processBase64(photo.base64, 'image/jpeg');
    } catch {
      setError('Could not capture that photo. Try again or pick from your library.');
    }
  }

  async function pickFromLibrary() {
    if (busy) return;
    if (!IS_WEB) {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        setError('Photo library permission is needed to choose a label image.');
        return;
      }
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      exif: false,
    });
    if (picked.canceled || !picked.assets?.[0]?.base64) return;
    const asset = picked.assets[0];
    const base64 = asset.base64;
    if (!base64) return;
    const mime =
      asset.mimeType === 'image/png' ||
      asset.mimeType === 'image/webp' ||
      asset.mimeType === 'image/gif'
        ? asset.mimeType
        : 'image/jpeg';
    await processBase64(base64, mime);
  }

  if (IS_WEB) {
    return (
      <View style={[styles.container, styles.webWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.webCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <View style={[styles.webIcon, { backgroundColor: colors.tintSoft }]}>
            <Ionicons name="cloud-upload-outline" size={32} color={colors.tint} />
          </View>
          <Text style={[styles.webTitle, { color: colors.text }]}>Scan a label (web demo)</Text>
          <Text style={[styles.webBody, { color: colors.textSecondary }]}>
            Upload a photo of a medication or Nutrition Facts label. Photos are processed in memory
            and are not saved.
          </Text>
          <Text style={[styles.privacyInline, { color: colors.textSecondary }]}>
            Avoid including a patient’s name or address in the image.
          </Text>
          <Pressable
            onPress={pickFromLibrary}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Upload a label photo"
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: colors.tint, opacity: pressed || busy ? 0.85 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="image-outline" size={22} color="#fff" />
                <Text style={styles.primaryText}>Upload label photo</Text>
              </>
            )}
          </Pressable>
          {busy ? (
            <Text style={[styles.busyHint, { color: colors.textSecondary }]}>Reading label…</Text>
          ) : null}
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Camera access</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          PharmaSense uses the camera to read medication and nutrition labels. Photos are not saved
          on this device.
        </Text>
        <Pressable
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Allow camera access"
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: colors.tint, opacity: pressed ? 0.88 : 1 },
          ]}>
          <Text style={styles.primaryText}>Allow camera</Text>
        </Pressable>
        <Pressable
          onPress={pickFromLibrary}
          accessibilityRole="button"
          accessibilityLabel="Choose a photo from library"
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
          ]}>
          <Text style={[styles.secondaryText, { color: colors.text }]}>Choose from library</Text>
        </Pressable>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {isFocused ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.privacyBanner, { backgroundColor: 'rgba(10,18,24,0.82)' }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#D7EEF6" />
          <Text style={styles.privacyText}>
            Photos are not saved. Avoid including your name or address in the frame.
          </Text>
        </View>

        <View style={styles.frameGuide} accessibilityElementsHidden />

        <View style={styles.controls}>
          {error ? <Text style={[styles.error, { color: '#FFB4A8' }]}>{error}</Text> : null}
          <View style={styles.controlRow}>
            <Pressable
              onPress={pickFromLibrary}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Choose a photo from library"
              style={({ pressed }) => [
                styles.libraryButton,
                { opacity: pressed || busy ? 0.7 : 1 },
              ]}>
              <Ionicons name="images-outline" size={26} color="#fff" />
              <Text style={styles.libraryLabel}>Library</Text>
            </Pressable>

            <Pressable
              onPress={takePhoto}
              disabled={busy || !cameraReady}
              accessibilityRole="button"
              accessibilityLabel="Take photo of label"
              style={({ pressed }) => [
                styles.shutter,
                { opacity: pressed || busy || !cameraReady ? 0.7 : 1 },
              ]}>
              {busy ? (
                <ActivityIndicator color="#0B6E99" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </Pressable>

            <View style={styles.libraryButton}>
              <Text style={styles.libraryLabel}> </Text>
            </View>
          </View>
          {busy ? (
            <Text style={styles.busyText}>Reading label…</Text>
          ) : (
            <Text style={styles.busyText}>Center the label, then tap the shutter</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webWrap: { padding: Spacing.three, justifyContent: 'center' },
  webCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  webIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTitle: { fontSize: 26, fontWeight: '700' },
  webBody: { fontSize: 16, lineHeight: 24 },
  privacyInline: { fontSize: 14, lineHeight: 20 },
  busyHint: { fontSize: 15, fontWeight: '600' },
  centered: { padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  primary: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondary: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  secondaryText: { fontSize: 16, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'space-between', padding: Spacing.three },
  privacyBanner: {
    marginTop: Spacing.two,
    borderRadius: 14,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  privacyText: { color: '#F4F8FB', fontSize: 15, lineHeight: 22, flex: 1 },
  frameGuide: {
    alignSelf: 'center',
    width: '88%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  controls: { paddingBottom: Spacing.four, gap: Spacing.two },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  libraryButton: { width: 72, alignItems: 'center', gap: 4 },
  libraryLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#0B6E99',
  },
  busyText: { color: '#fff', textAlign: 'center', fontSize: 15, fontWeight: '600' },
  error: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
