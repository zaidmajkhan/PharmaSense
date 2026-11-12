import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 18, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ask-ai"
        options={{
          title: 'Ask AI',
          tabBarAccessibilityLabel: 'Ask AI',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarAccessibilityLabel: 'Scan a label',
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => {
            const focused = Boolean(props.accessibilityState?.selected);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Scan a label"
                onPress={props.onPress}
                onLongPress={props.onLongPress}
                style={styles.scanWrap}>
                <View
                  style={[
                    styles.scanFab,
                    {
                      backgroundColor: colors.tint,
                      borderColor: colors.backgroundElement,
                      transform: [{ scale: focused ? 1.04 : 1 }],
                    },
                  ]}>
                  <Ionicons name="camera" size={28} color="#FFFFFF" />
                </View>
              </Pressable>
            );
          },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarAccessibilityLabel: 'Search drugs',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="flashcards"
        options={{
          title: 'Flashcards',
          tabBarAccessibilityLabel: 'Flashcards',
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanWrap: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  scanFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
});
