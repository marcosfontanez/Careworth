import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@/theme';
import { useUnreadCount } from '@/hooks/useQueries';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ITEMS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'feed', title: 'Feed', icon: 'home-outline', activeIcon: 'home' },
  { name: 'circles', title: 'Circles', icon: 'people-outline', activeIcon: 'people' },
  { name: 'create', title: '', icon: 'add', activeIcon: 'add' },
  { name: 'live', title: 'Live', icon: 'radio-outline', activeIcon: 'radio' },
  { name: 'my-pulse', title: 'My Pulse', icon: 'person-outline', activeIcon: 'person' },
];

/** Unread badge only on Feed — avoids calling useUnreadCount once per tab icon slot. */
function FeedTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const { data: unreadCount } = useUnreadCount();
  const showBadge = (unreadCount ?? 0) > 0;
  return (
    <View style={styles.iconSlot}>
      <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
      {showBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{(unreadCount ?? 0) > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const TabIcon = React.memo(function TabIcon({ tab, focused, color }: { tab: typeof TAB_ITEMS[0]; focused: boolean; color: string }) {
  if (tab.name === 'create') {
    return (
      <View style={styles.createOuter}>
        <LinearGradient
          colors={[colors.primary.teal, '#0D9488', colors.primary.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.createBtnRing}
        >
          <View style={styles.createBtnInner}>
            <Image
              source={require('../../assets/images/pulseverse-logo.png')}
              style={styles.createLogo}
              contentFit="cover"
              contentPosition="center"
            />
          </View>
        </LinearGradient>
      </View>
    );
  }

  const neon = focused ? styles.neonRing : styles.neonRingIdle;

  if (tab.name === 'feed') {
    return (
      <View style={[styles.neonShell, neon]}>
        <FeedTabIcon focused={focused} color={color} />
      </View>
    );
  }

  return (
    <View style={[styles.neonShell, neon]}>
      <View style={styles.iconSlot}>
        <Ionicons name={focused ? tab.activeIcon : tab.icon} size={24} color={color} />
        {tab.name === 'live' && <View style={styles.liveDot} />}
      </View>
    </View>
  );
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary.teal,
        tabBarInactiveTintColor: colors.dark.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabBarIconSlot,
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarActiveTintColor: colors.primary.teal,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon tab={tab} focused={focused} color={color} />
            ),
            tabBarLabel: tab.name === 'create' ? '' : tab.title,
            ...(tab.name === 'create'
              ? {
                  tabBarItemStyle: styles.createTabItem,
                  tabBarIconStyle: styles.createTabIconSlot,
                }
              : {}),
          }}
        />
      ))}
      <Tabs.Screen name="jobs" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.dark.bg,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    height: Platform.OS === 'ios' ? 86 : 68,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 6,
  },
  tabBarIconSlot: {
    marginBottom: 2,
  },
  /** Keeps the FAB vertically centered like other tabs (no negative lift into content). */
  createTabItem: {
    justifyContent: 'center',
  },
  createTabIconSlot: {
    marginTop: 0,
    marginBottom: 2,
  },
  createOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: `0 4px 22px ${colors.primary.teal}55`,
      },
      default: {
        elevation: 10,
      },
    }),
  },
  createBtnInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark.bg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Larger than inner so cover crops evenly; flex centers the frame (no transform — avoids vertical drift). */
  createLogo: {
    width: 62,
    height: 62,
  },
  neonShell: {
    width: 40,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 2,
  },
  neonRingIdle: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  neonRing: {
    borderWidth: 1.5,
    borderColor: colors.primary.teal,
    ...Platform.select({
      web: {
        boxShadow: `0 0 10px ${colors.primary.teal}99`,
      },
      default: {
        shadowColor: colors.primary.teal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.75,
        shadowRadius: 5,
        elevation: 6,
      },
    }),
  },
  iconSlot: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.status.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  liveDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.error,
    borderWidth: 1.5,
    borderColor: colors.dark.bg,
  },
});
