import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Line,
  Text as SvgText,
  G,
  Path,
} from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { colors, spacing, borderRadius, fonts } from '../theme/colors';

const {
  formatHoursMinutes,
  getTodayString,
  getDateString,
} = require('../utils/timeUtils');

// ═══════════════════════════════════════════════════════════════════
// DESIGN TOKENS (HTML exact)
// ═══════════════════════════════════════════════════════════════════

const PURPLE = '#a374f9';
const PURPLE_RGB = '163, 116, 249';

const HOUR_LABELS = [
  '12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM','7 AM','8 AM','9 AM','10 AM','11 AM',
  '12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM','11 PM',
];


// ═══════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════

const formatHoursMinutesSeconds = (seconds: number): string => {
  if (!seconds || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
};

const formatTimeWithSpace = (date: Date): string => {
  const h = date.getHours();
  const m = date.getMinutes();
  const display = h % 12 || 12;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
};

const formatTimeNoSuffix = (date: Date): string => {
  const h = date.getHours();
  const m = date.getMinutes();
  const display = h % 12 || 12;
  return `${display}:${String(m).padStart(2, '0')}`;
};

// ═══════════════════════════════════════════════════════════════════
// SVG BAR CHART (exact HTML clone + tooltip)
// ═══════════════════════════════════════════════════════════════════

interface ActivityChartProps {
  data: number[];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; value: number } | null>(null);
  const isSmall = width <= 360;
  const CHART_W = isSmall ? Math.max(480, width - 24) : Math.min(720, width);
  const CHART_H = 160;
  const CHART_PAD_LEFT = 24;
  const CHART_PAD_RIGHT = 12;
  const CHART_PAD_TOP = 8;
  const CHART_PAD_BOT = 24;
  const PLOT_X = CHART_PAD_LEFT;
  const PLOT_W = CHART_W - CHART_PAD_LEFT - CHART_PAD_RIGHT;
  const NUM_HOURS = 24;
  const DEFAULT_MAX_Y = 5;
  const BAR_PERCENT = 0.55;
  const SLOT_W = PLOT_W / NUM_HOURS;
  const BAR_W = SLOT_W * BAR_PERCENT;
  const bottomY = CHART_H - CHART_PAD_BOT;
  const topY = CHART_PAD_TOP;
  const plotHeight = bottomY - topY;

  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollTo({ x: Math.max(0, CHART_W / 3.5 - 40), animated: true }),
      300,
    );
    return () => clearTimeout(t);
  }, [CHART_W]);

  const maxY = useMemo(() => {
    const values = data ?? [];
    const peak = values.reduce((m, v) => Math.max(m, v), 0);
    if (peak <= DEFAULT_MAX_Y) return DEFAULT_MAX_Y;
    const rounded = Math.ceil(peak / 5) * 5;
    return rounded;
  }, [data]);

  const yItems: { v: number; y: number }[] = [];
  for (let v = 0; v <= maxY; v++) {
    const y = bottomY - (v / maxY) * plotHeight;
    yItems.push({ v, y });
  }

  const barPath = (x: number, y: number, w: number, h: number, r: number) => {
    if (h <= 0) return '';
    return `
      M ${x + r} ${y}
      L ${x + w - r} ${y}
      Q ${x + w} ${y} ${x + w} ${y + r}
      L ${x + w} ${y + h}
      L ${x} ${y + h}
      L ${x} ${y + r}
      Q ${x} ${y} ${x + r} ${y}
      Z
    `;
  };

  const resolveSlot = (scrollX: number) => {
    if (scrollX < PLOT_X || scrollX > PLOT_X + PLOT_W) return -1;
    const idx = Math.floor((scrollX - PLOT_X) / SLOT_W);
    return Math.max(0, Math.min(NUM_HOURS - 1, idx));
  };

  // Touchable overlay that captures taps and maps them to chart slots
  const ChartTouchOverlay = () => {
    const [touchedIndex, setTouchedIndex] = useState<number | null>(null);

    return (
      <TouchableOpacity
        activeOpacity={1}
        style={styles.chartTouchOverlay}
        onPressIn={(evt) => {
          const idx = resolveSlot(evt.nativeEvent.locationX);
          if (idx >= 0 && data[idx] > 0) {
            setTouchedIndex(idx);
            const cx = PLOT_X + idx * SLOT_W + SLOT_W / 2;
            const barH = Math.max((data[idx] / (maxY || 1)) * plotHeight, 0);
            const cy = bottomY - barH;
            setTooltip({ cx, cy, value: data[idx] });
          } else {
            setTouchedIndex(null);
            setTooltip(null);
          }
        }}
        onPressOut={() => {
          setTouchedIndex(null);
        }}
      >
        {touchedIndex !== null && tooltip && (
          <View style={styles.rnTooltip} pointerEvents="none">
            <Text style={styles.rnTooltipText}>Sessions: {tooltip.value}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.chartOuterWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ width: CHART_W }}
      >
        <View style={{ width: CHART_W, height: CHART_H }}>
          <Svg width={CHART_W} height={CHART_H}>
            <Defs>
              <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={`rgba(${PURPLE_RGB}, 0.85)`} />
                <Stop offset="100%" stopColor={`rgba(${PURPLE_RGB}, 0.01)`} />
              </LinearGradient>
            </Defs>

            {yItems.map(({ v, y }) => (
              <G key={`ygrid-${v}`}>
                <Line
                  x1={PLOT_X}
                  y1={y}
                  x2={CHART_W - 4}
                  y2={y}
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={PLOT_X - 6}
                  y={y + 3}
                  fontSize={9}
                  fontFamily={Platform.select({ ios: 'Menlo', android: 'monospace' })}
                  fill="#666666"
                  textAnchor="end"
                >
                  {v}
                </SvgText>
              </G>
            ))}

            {data.map((val, i) => {
              const x = PLOT_X + i * SLOT_W + (SLOT_W - BAR_W) / 2;
              const barH = Math.max((val / (maxY || 1)) * plotHeight, 0);
              const y = bottomY - barH;
              return (
                <Path
                  key={`bar-${i}`}
                  d={barPath(x, y, BAR_W, barH, 4)}
                  fill="url(#barGrad)"
                  stroke={PURPLE}
                  strokeWidth={1.5}
                />
              );
            })}

            {HOUR_LABELS.map((label, i) => {
              const cx = PLOT_X + i * SLOT_W + SLOT_W / 2;
              return (
                <SvgText
                  key={`xlbl-${i}`}
                  x={cx}
                  y={bottomY + 14}
                  fontSize={9}
                  fontWeight="600"
                  fontFamily={Platform.select({ ios: 'Menlo', android: 'monospace' })}
                  fill="#666666"
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            })}
          </Svg>
          <ChartTouchOverlay />
        </View>
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// SHARED CARD
// ═══════════════════════════════════════════════════════════════════

const InnerCard: React.FC<{ style?: any; children: React.ReactNode }> = ({
  style,
  children,
}) => <View style={[styles.innerCard, style]}>{children}</View>;

// ═══════════════════════════════════════════════════════════════════
// AMBIENT BLURS
// ═══════════════════════════════════════════════════════════════════

const AmbientBlurs = () => {
  const { width } = useWindowDimensions();
  const size = width <= 360 ? 64 : 128;
  const offset = width <= 360 ? -24 : -48;
  return (
    <>
      <View style={[styles.ambientBase, { width: size, height: size, top: offset, right: offset }, styles.ambientBlurTop]} pointerEvents="none" />
      <View style={[styles.ambientBase, { width: size, height: size, bottom: offset, left: offset }, styles.ambientBlurBottom]} pointerEvents="none" />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════
// TOTAL HOURS CARD
// ═══════════════════════════════════════════════════════════════════

const TotalHoursCard: React.FC<{ totalHours: string; t: (k: string) => string }> = ({
  totalHours,
  t,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity activeOpacity={0.85} onPressIn={onPressIn} onPressOut={onPressOut}>
        <InnerCard style={styles.hoursCard}>
          <Text style={styles.totalLabel}>{t('dailylog.totalHours')}</Text>
          <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>
            {totalHours}
          </Text>
        </InnerCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// HOURLY ACTIVITY CHART CARD
// ═══════════════════════════════════════════════════════════════════

const HourlyActivityCard: React.FC<{ data: number[]; t: (k: string) => string }> = ({
  data,
  t,
}) => (
  <InnerCard style={styles.chartCard}>
    <View style={styles.chartHeader}>
      <Text style={styles.chartTitle}>{t('dailylog.hourlyActivity')}</Text>
      <View style={styles.swipeBadge}>
        <Text style={styles.swipeBadgeText}>{t('dailylog.swipeView')}</Text>
      </View>
    </View>
    <ActivityChart data={data} />
  </InnerCard>
);

// ═══════════════════════════════════════════════════════════════════
// STATS ROW
// ═══════════════════════════════════════════════════════════════════

const StatsRow: React.FC<{
  totalSessions: number;
  active: number;
  completed: number;
  t: (k: string) => string;
}> = ({ totalSessions, active, completed, t }) => {
  const activeDisplay = totalSessions > 0 ? active : 0;
  const completedDisplay = totalSessions > 0 ? completed : 0;

  return (
    <View style={styles.statsRow}>
      <InnerCard style={styles.statCard}>
        <Text style={styles.statLabel}>{t('dailylog.totalSessions')}</Text>
        <Text style={styles.statValue}>{totalSessions}</Text>
      </InnerCard>
      <InnerCard style={styles.statCard}>
        <Text style={[styles.statLabel, styles.statLabelActive]}>{t('dailylog.active')}</Text>
        <Text style={[styles.statValue, styles.statValueActive]}>{activeDisplay}</Text>
      </InnerCard>
      <InnerCard style={styles.statCard}>
        <Text style={styles.statLabel}>{t('dailylog.completed')}</Text>
        <Text style={styles.statValue}>{completedDisplay}</Text>
      </InnerCard>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// SESSION CARD
// ═══════════════════════════════════════════════════════════════════

const SessionRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.sessionRow}>
    <Text style={styles.sessionRowLabel}>{label}</Text>
    <Text style={styles.sessionRowValue}>{value}</Text>
  </View>
);

const SessionCard: React.FC<{ sessions: any[]; t: (k: string) => string }> = ({
  sessions,
  t,
}) => {
  const sorted = useMemo(
    () => [...sessions].sort((a: any, b: any) => b.checkInTime - a.checkInTime),
    [sessions],
  );

  if (sorted.length === 0) return null;

  return (
    <InnerCard style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle}>{t('dailylog.sessions')}</Text>
        <View style={styles.completedBadge}>
          <View style={styles.completedDot} />
          <Text style={styles.completedBadgeText}>{t('dailylog.completed')}</Text>
        </View>
      </View>

      {sorted.map((session: any, idx: number) => {
        const checkin = new Date(session.checkInTime);
        const checkout = session.checkOutTime
          ? new Date(session.checkOutTime)
          : null;
        const durationMs = checkout
          ? checkout.getTime() - checkin.getTime()
          : Date.now() - checkin.getTime();
        const durationSec = Math.floor(durationMs / 1000);

        const isLast = idx === sorted.length - 1;

        return (
          <View
            key={session.sessionId}
            style={[styles.sessionBlock, !isLast && styles.sessionBlockDivider]}
          >
            <SessionRow
              label={`${t('dailylog.checkIn')}:`}
              value={formatTimeWithSpace(checkin)}
            />
            <SessionRow
              label={`${t('dailylog.checkOut')}:`}
              value={checkout ? formatTimeNoSuffix(checkout) : '—'}
            />
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>{t('dailylog.duration')}:</Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationValue}>
                  {formatHoursMinutesSeconds(durationSec)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </InnerCard>
  );
};

// ═══════════════════════════════════════════════════════════════════
// DAILY LOG SCREEN
// ═══════════════════════════════════════════════════════════════════

const DailyLogScreen = ({ navigation }: any) => {
  const { appData } = useApp();
  const { t, isRTL } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const today = getTodayString();
  const sessions = appData.sessions.filter(
    (s: any) => getDateString(s.checkInTime) === today,
  );

  const hourlyCounts = useMemo(() => {
    const counts = Array.from({ length: 24 }, () => 0);
    sessions.forEach((session: any) => {
      const h = new Date(session.checkInTime).getHours();
      counts[h] += 1;
    });
    return counts;
  }, [sessions]);

  const todayStats = useMemo(() => {
    let totalDurationMs = 0;
    let liveActive = 0;
    sessions.forEach((session: any) => {
      if (session.checkOutTime) {
        totalDurationMs += session.checkOutTime - session.checkInTime;
      } else {
        liveActive++;
      }
    });
    return {
      totalSessions: sessions.length,
      activeSessions: liveActive,
      completedSessions: sessions.length - liveActive,
      totalDurationMs,
    };
  }, [sessions]);

  const totalHoursStr = formatHoursMinutesSeconds(
    Math.floor(todayStats.totalDurationMs / 1000),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <AmbientBlurs />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PURPLE}
            colors={[PURPLE]}
          />
        }
      >
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Daily Log</Text>
        </View>

        <TotalHoursCard totalHours={totalHoursStr} t={t} />
        <HourlyActivityCard data={hourlyCounts} t={t} />
        <StatsRow
          totalSessions={todayStats.totalSessions}
          active={todayStats.activeSessions}
          completed={todayStats.completedSessions}
          t={t}
        />
        <SessionCard sessions={sessions} t={t} />

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  scrollView: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    gap: 20,
  },

  ambientBase: {
    position: 'absolute',
    borderRadius: 64,
  },
  ambientBlurTop: {
    backgroundColor: `rgba(${PURPLE_RGB}, 0.08)`,
  },
  ambientBlurBottom: {
    backgroundColor: '#363636',
    opacity: 0.3,
  },

  titleRow: { width: '100%', paddingTop: 8 },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },

  innerCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Total Hours
  hoursCard: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#666666',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },

  // Chart
  chartCard: { padding: 16, gap: 12 },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dadada',
  },
  swipeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  swipeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666666',
  },
  chartOuterWrap: { width: '100%' },
  chartTouchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  rnTooltip: {
    position: 'absolute',
    backgroundColor: '#212121',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'center',
  },
  rnTooltipText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    color: '#ffffff',
  },

  // Stats
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
    color: '#666666',
    textTransform: 'uppercase',
  },
  statLabelActive: { color: PURPLE },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#dadada',
    marginTop: 2,
  },
  statValueActive: { color: PURPLE },

  // Session
  sessionCard: {
    padding: 20,
    gap: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  sessionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dadada',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3f3f3f',
  },
  completedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666666',
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666666',
  },
  sessionBlock: { gap: 8 },
  sessionBlockDivider: {
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  sessionRowLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  sessionRowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dadada',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    borderStyle: 'dashed',
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#bababa',
  },
  durationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 108, 239, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(163, 116, 249, 0.25)',
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: PURPLE,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});

export default DailyLogScreen;
