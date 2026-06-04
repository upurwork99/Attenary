import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Pressable, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const NAV_BG = 'rgba(0,0,0,0.45)';
const BORDER_COLOR = '#363636';
const ACCENT = '#8b6cef';
const PILL_RADIUS = 24;
const BTN_SIZE = 48;
const NAV_PADDING = 8;
const PANEL_RADIUS = 32;
const SLIDE_DURATION = 400;
const SLIDE_EASING = Easing.bezier(0.25, 1, 0.5, 1);

const HomePath = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);
const DailyLogPath = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
);
const MonthlyReportPath = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Polyline points="14 2 14 8 20 8" />
    <Line x1="16" y1="13" x2="8" y2="13" />
    <Line x1="16" y1="17" x2="8" y2="17" />
    <Line x1="10" y1="9" x2="8" y2="9" />
  </Svg>
);
const HistoryPath = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);
const AnalyticsPath = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="20" x2="18" y2="10" />
    <Line x1="12" y1="20" x2="12" y2="4" />
    <Line x1="6" y1="20" x2="6" y2="14" />
  </Svg>
);
const ProfilePath = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);
const MorePath = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="5" r="1.5" />
    <Circle cx="12" cy="12" r="1.5" />
    <Circle cx="12" cy="19" r="1.5" />
  </Svg>
);

const TAB_NAMES = ['TimeClock', 'DailyLog', 'MonthlyReport', 'History', 'Analytics', 'Profile', 'More'];
const ICON_PATHS = [HomePath, DailyLogPath, MonthlyReportPath, HistoryPath, AnalyticsPath, ProfilePath, MorePath];

type TabConfig = { name: string; Icon: React.FC };

interface CustomTabBarProps {
  state: { index: number };
  navigation: { emit: (e: any) => any; navigate: (name: string) => void };
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, navigation }) => {
  const tabs: TabConfig[] = TAB_NAMES.map((name, i) => ({ name, Icon: ICON_PATHS[i] }));

  const [layouts, setLayouts] = useState<{ left: number; top: number; width: number; height: number }[]>([]);
  const activeIndex = state.index ?? 0;

  const indLeft = useSharedValue(0);
  const indTop = useSharedValue(0);
  const indWidth = useSharedValue(0);
  const indHeight = useSharedValue(0);
  const indScaleX = useSharedValue(1);
  const indScaleY = useSharedValue(1);

  const updateIndicator = useCallback(
    (index: number, animate: boolean) => {
      if (!layouts[index]) return;
      const l = layouts[index];

      if (!animate) {
        indLeft.value = l.left;
        indTop.value = l.top;
        indWidth.value = l.width;
        indHeight.value = l.height;
        indScaleX.value = 1;
        indScaleY.value = 1;
        return;
      }

      const cfg = { duration: SLIDE_DURATION, easing: SLIDE_EASING };
      indWidth.value = withTiming(l.width, cfg);
      indHeight.value = withTiming(l.height, cfg);
      indLeft.value = withTiming(l.left, cfg);
      indTop.value = withTiming(l.top, cfg);

      indScaleX.value = withSequence(
        withTiming(1.15, { duration: 120, easing: Easing.linear }),
        withTiming(0.9, { duration: 100, easing: Easing.linear }),
        withTiming(1, { duration: 160, easing: Easing.linear })
      );
      indScaleY.value = withSequence(
        withTiming(0.85, { duration: 120, easing: Easing.linear }),
        withTiming(1.05, { duration: 100, easing: Easing.linear }),
        withTiming(1, { duration: 160, easing: Easing.linear })
      );
    },
    [layouts]
  );

  useEffect(() => {
    updateIndicator(activeIndex, false);
  }, []);

  useEffect(() => {
    updateIndicator(activeIndex, true);
  }, [activeIndex, updateIndicator]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      updateIndicator(activeIndex, false);
    });
    return () => sub?.remove();
  }, [activeIndex, updateIndicator]);

  useEffect(() => {
    const hasLayout = layouts.length > 0 && layouts[activeIndex];
    if (!hasLayout) return;
    updateIndicator(activeIndex, false);
  }, [layouts, activeIndex, updateIndicator]);

  const animatedIndicator = useAnimatedStyle(() => ({
    position: 'absolute',
    left: indLeft.value,
    top: indTop.value,
    width: indWidth.value,
    height: indHeight.value,
    borderRadius: PILL_RADIUS,
    backgroundColor: ACCENT,
    transform: [{ scaleX: indScaleX.value }, { scaleY: indScaleY.value }] as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  }));

  return (
    <View style={styles.navbar}>
      <Animated.View style={animatedIndicator} pointerEvents="none" />
      <View style={styles.navbarContainer}>
        {tabs.map((tab, index) => {
          const isFocused = activeIndex === index;

          const onPress = () => {
            if (isFocused) return;
            const event = navigation.emit({ type: 'tabPress', target: tab.name, canPreventDefault: true });
            if (!event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          return (
            <Pressable
              key={tab.name}
              onPress={onPress}
              style={({ pressed }) => [styles.tabWrapper, pressed && styles.tabItemPressed]}
            >
              <View
                style={styles.tabItem}
                onLayout={(e) => {
                  const { x, y, width, height } = e.nativeEvent.layout;
                  setLayouts((prev) => {
                    const copy = [...prev];
                    copy[index] = { left: x, top: y, width, height };
                    return copy;
                  });
                }}
              >
                <Animated.View
                  style={[
                    styles.iconInner,
                    {
                      opacity: isFocused ? 1 : 0.4,
                      transform: [{ scale: isFocused ? 1.12 : 1 }, { translateY: isFocused ? -1 : 0 }],
                    },
                  ]}
                >
                  <tab.Icon />
                </Animated.View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: NAV_BG,
    paddingVertical: NAV_PADDING,
    paddingHorizontal: NAV_PADDING,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    borderRadius: PANEL_RADIUS,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 50,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  navbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    height: BTN_SIZE,
    width: BTN_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PILL_RADIUS,
  },
  tabItemPressed: {
    opacity: 0.8,
  },
  iconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CustomTabBar;