import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { PVBottomNav, pvBottomNavCreateFabGradient } from '@/components/pv/PVBottomNav';
import { useUnreadCount } from '@/hooks/useQueries';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ITEMS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'feed', title: 'Feed', icon: 'home-outline', activeIcon: 'home' },
  { name: 'circles', title: 'Circles', icon: 'people-outline', activeIcon: 'people' },
  { name: 'create', title: '', icon: 'add', activeIcon: 'add' },
  { name: 'live', title: 'Live', icon: 'radio-outline', activeIcon: 'radio' },
  { name: 'my-pulse', title: 'My Pulse', icon: 'person-outline', activeIcon: 'person' },
];

/** Tab icons — unread notifications badge on My Pulse (matches header bell). */
function MyPulseTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const { data: unreadCount } = useUnreadCount();
  const showBadge = (unreadCount ?? 0) > 0;
  return (
    <View style={styles.iconSlot}>
      <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
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
          colors={[...pvBottomNavCreateFabGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.createBtnRing, focused && styles.createBtnRingFocused]}
        >
          <View style={styles.createBtnInner}>
            <LinearGradient
              colors={['rgba(51,65,85,0.55)', 'rgba(15,23,42,0.38)', 'rgba(15,23,42,0.22)']}
              locations={[0, 0.45, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.08)', 'transparent']}
              locations={[0, 0.35, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.createGlassSheen}
              pointerEvents="none"
            />
            <Image
              key={`creator-hub-fab-${FAB.outer}-${FAB.logoOverscan}`}
              source={require('../../assets/images/pulseverse-creator-hub-fab.png')}
              style={styles.createLogo}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
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
        <View style={styles.iconSlot}>
          <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
        </View>
      </View>
    );
  }

  if (tab.name === 'my-pulse') {
    return (
      <View style={[styles.neonShell, neon]}>
        <MyPulseTabIcon focused={focused} color={color} />
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
        /** Mount tab scenes on first visit — cuts cold-start work before the user leaves Feed. */
        lazy: true,
        headerShown: false,
        tabBarStyle: PVBottomNav.tabBarStyle,
        tabBarActiveTintColor: PVBottomNav.tabBarActiveTintColor,
        tabBarInactiveTintColor: PVBottomNav.tabBarInactiveTintColor,
        tabBarLabelStyle: PVBottomNav.tabBarLabelStyle,
        tabBarIconStyle: PVBottomNav.tabBarIconStyle,
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarActiveTintColor: PVBottomNav.tabBarActiveTintColor,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon tab={tab} focused={focused} color={color} />
            ),
            tabBarLabel: tab.name === 'create' ? '' : tab.title,
            ...(tab.name === 'create'
              ? {
                  tabBarShowLabel: false,
                  tabBarItemStyle: styles.createTabItem,
                  tabBarIconStyle: styles.createTabIconSlot,
                }
              : {}),
          }}
        />
      ))}
    </Tabs>
  );
}

const FAB = {
  /** Outer gradient ring — sized to sit between 24px tab glyphs and the bar edge */
  outer: 50,
  ringPad: 2,
  get inner() {
    return FAB.outer - FAB.ringPad * 2;
  },
  /** Slightly smaller than inner so the mark doesn’t hug the rim after `cover` crop */
  logoOverscan: 54,
} as const;

const styles = StyleSheet.create({
  createTabItem: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    /** Line up with tabs that show icon + label (icon cluster sits below bar top padding). */
    paddingTop: Platform.OS === 'ios' ? 4 : 2,
  },
  createTabIconSlot: {
    marginTop: Platform.OS === 'ios' ? -4 : -2,
    marginBottom: 2,
  },
  /** Nudge the larger disc so its optical center matches the 24px tab icons. */
  createOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { transform: [{ translateY: -5 }] },
      android: { transform: [{ translateY: -4 }] },
      default: { transform: [{ translateY: -5 }] },
    }),
  },
  createBtnRing: {
    width: FAB.outer,
    height: FAB.outer,
    borderRadius: FAB.outer / 2,
    padding: FAB.ringPad,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: `
          0 2px 6px rgba(0,0,0,0.32),
          0 10px 28px ${colors.primary.teal}38,
          0 0 0 1px rgba(34,211,238,0.45)
        `
          .replace(/\s+/g, ' ')
          .trim(),
      },
      ios: {
        shadowColor: colors.primary.teal,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.42,
        shadowRadius: 14,
      },
      default: {
        elevation: 12,
      },
    }),
  },
  createBtnRingFocused: {
    ...Platform.select({
      web: {
        boxShadow: `
          0 2px 8px rgba(0,0,0,0.38),
          0 12px 36px ${colors.primary.teal}4d,
          0 0 0 1.5px rgba(45,212,191,0.65)
        `
          .replace(/\s+/g, ' ')
          .trim(),
      },
      ios: {
        shadowColor: colors.primary.teal,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.52,
        shadowRadius: 17,
      },
      android: {
        elevation: 16,
      },
      default: {
        elevation: 14,
      },
    }),
  },
  createBtnInner: {
    width: FAB.inner,
    height: FAB.inner,
    borderRadius: FAB.inner / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  createGlassSheen: {
    ...StyleSheet.absoluteFillObject,
    height: '52%',
    borderTopLeftRadius: FAB.inner / 2,
    borderTopRightRadius: FAB.inner / 2,
  },
  createLogo: {
    width: FAB.logoOverscan,
    height: FAB.logoOverscan,
    zIndex: 2,
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
