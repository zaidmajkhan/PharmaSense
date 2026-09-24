import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_ID_KEY = 'app:installId';

let cached: string | null = null;

/** Random per-install id used only for server-side rate limiting. Not a user identity. */
export async function getInstallId(): Promise<string> {
  if (cached) return cached;
  const stored = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  await AsyncStorage.setItem(INSTALL_ID_KEY, id);
  cached = id;
  return id;
}
