import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initDatabase } from '@/db/database';
import { DisclaimerProvider, useDisclaimer } from '@/lib/disclaimer';

// Create tables and import the seeded drug cache before any screen renders.
initDatabase();

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DisclaimerProvider>
          <RootStack />
        </DisclaimerProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { accepted } = useDisclaimer();

  useEffect(() => {
    if (accepted !== null) SplashScreen.hideAsync().catch(() => {});
  }, [accepted]);

  if (accepted === null) return null;

  return (
    <Stack>
      <Stack.Protected guard={accepted}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="drug/[id]" options={{ title: 'Drug Details' }} />
        <Stack.Screen name="about" options={{ title: 'About and safety' }} />
      </Stack.Protected>
      <Stack.Protected guard={!accepted}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="privacy" options={{ title: 'Privacy policy' }} />
    </Stack>
  );
}
