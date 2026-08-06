import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { initDatabase } from '@/db/database';

// Create tables and import the seeded drug cache before any screen renders.
initDatabase();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="drug/[id]" options={{ title: 'Drug Details' }} />
      </Stack>
    </ThemeProvider>
  );
}
