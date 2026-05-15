import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { colors, pvKit, spacing } from '@/theme';

/**
 * Expo Router `<Tabs>` does not render a custom React child for the bar — use these
 * defaults in `screenOptions` so every tab layout stays on the PulseVerse system.
 */
export const PVBottomNav = {
  tabBarActiveTintColor: pvKit.tabBar.active,
  tabBarInactiveTintColor: pvKit.tabBar.inactive,
  tabBarStyle: {
    backgroundColor: pvKit.tabBar.fill,
    borderTopWidth: 1,
    borderTopColor: pvKit.tabBar.border,
    height: Platform.OS === 'ios' ? 86 : 68,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  } as ViewStyle,

  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 6,
  } as TextStyle,

  tabBarIconStyle: {
    marginBottom: 2,
  } as ViewStyle,
};

/** Spread into `<Tabs screenOptions={{ ... }} />` */
export function pvBottomNavScreenOptions() {
  return {
    tabBarStyle: PVBottomNav.tabBarStyle,
    tabBarActiveTintColor: PVBottomNav.tabBarActiveTintColor,
    tabBarInactiveTintColor: PVBottomNav.tabBarInactiveTintColor,
    tabBarLabelStyle: PVBottomNav.tabBarLabelStyle,
    tabBarIconStyle: PVBottomNav.tabBarIconStyle,
  };
}

/** Create-button center FAB ring — primary teal aligned with legacy tabs (optional use). */
export const pvBottomNavCreateFabGradient = [colors.primary.teal, '#0D9488', colors.primary.teal] as const;
