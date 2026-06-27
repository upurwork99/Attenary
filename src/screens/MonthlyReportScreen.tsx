import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, fonts } from '../theme/colors';
import Svg, { Rect, Line, Text as SvgText, Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';

const MS_PER_HOUR = 3600000;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface DayChartData {
  day: number;
  hours: number;
  label: string;
}

const CustomBarChart = ({
  data,
  selectedMonth,
  isSmall = false,
}: {
  data: DayChartData[];
  selectedMonth: string;
  isSmall?: boolean;
}) => {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const chartHeight = 176;
  const xLabelHeight = 18;
  const innerHeight = chartHeight - xLabelHeight;

  const maxHoursRaw = useMemo(() => {
    const peak = Math.max(...data.map((d) => d.hours));
    if (peak <= 0.5) return 4;
    const rounded = Math.ceil(peak);
    const nice = Math.ceil(rounded / 4) * 4;
    return Math.max(nice, 4);
  }, [data]);

  const barSlotWidth = chartWidth > 0 && data.length > 0 ? chartWidth / data.length : chartWidth;
  const barWidth = Math.max(barSlotWidth * 0.65, 4);
  const barGap = (barSlotWidth - barWidth) / 2;

  const yAxisStep = maxHoursRaw <= 4 ? 1 : 4;
  const yAxisValues: number[] = [];
  for (let v = 0; v <= maxHoursRaw; v += yAxisStep) yAxisValues.push(v);
  if (yAxisValues[yAxisValues.length - 1] !== maxHoursRaw) yAxisValues.push(maxHoursRaw);

  const xTickDays = useMemo(() => {
    if (!data.length) return [] as number[];
    const daysInMonth = data.length;
    const ticks: number[] = [1];
    if (daysInMonth > 1) {
      ticks.push(5);
      if (daysInMonth >= 10) ticks.push(10);
      if (daysInMonth >= 15) ticks.push(15);
      if (daysInMonth >= 20) ticks.push(20);
      if (daysInMonth >= 25) ticks.push(25);
    }
    const last = daysInMonth;
    if (!ticks.includes(last)) ticks.push(last);
    return ticks;
  }, [data]);

  function resolveIdxFromX(locationX: number) {
    if (!chartWidth || !data.length) return -1;
    const idx = Math.floor(locationX / (chartWidth / data.length));
    if (idx >= 0 && idx < data.length && data[idx].hours > 0) return idx;
    return -1;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const idx = resolveIdxFromX(evt.nativeEvent.locationX);
        if (idx >= 0 && idx < data.length) {
          const slotW = chartWidth / data.length;
          const barH = Math.max((data[idx].hours / maxHoursRaw) * innerHeight, 2);
          setTooltip({
            idx,
            x: Math.min(idx * slotW + slotW / 2, chartWidth - 40),
            y: innerHeight - barH,
          });
        }
      },
      onPanResponderMove: (evt) => {
        const idx = resolveIdxFromX(evt.nativeEvent.locationX);
        if (idx >= 0 && idx < data.length) {
          const slotW = chartWidth / data.length;
          const barH = Math.max((data[idx].hours / maxHoursRaw) * innerHeight, 2);
          setTooltip({
            idx,
            x: Math.min(idx * slotW + slotW / 2, chartWidth - 40),
            y: innerHeight - barH,
          });
        } else {
          setTooltip(null);
        }
      },
      onPanResponderRelease: () => setTooltip(null),
      onPanResponderTerminate: () => setTooltip(null),
    })
  ).current;

  const getBarHighlight = (i: number) => tooltip?.idx === i;

  if (!chartWidth) {
    return (
      <View
        style={{ height: chartHeight + 10 }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      />
    );
  }

  return (
    <View style={{ height: chartHeight + 10 }}>
      <View style={{ height: chartHeight }} {...panResponder.panHandlers}>
        <Svg width={chartWidth} height={chartHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs>
            <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="rgba(168, 130, 255, 0.85)" />
              <Stop offset="100%" stopColor="rgba(168, 130, 255, 0.01)" />
            </LinearGradient>
          </Defs>
          {yAxisValues.map((val) => {
            const y = innerHeight - (val / maxHoursRaw) * innerHeight;
            return (
              <React.Fragment key={val}>
                <Line
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#2a2a2a"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={8}
                  y={y + 3}
                  fontSize={9}
                  fontFamily="monospace"
                  fill="#666666"
                  textAnchor="start"
                >
                  {val}h
                </SvgText>
              </React.Fragment>
            );
          })}
          {data.map((d, i) => {
            const barH = Math.max((d.hours / maxHoursRaw) * innerHeight, 2);
            const x = i * barSlotWidth + barGap;
            const yPos = innerHeight - barH;
            const highlight = getBarHighlight(i);
            return (
              <Rect
                key={i}
                x={x}
                y={yPos}
                width={barWidth}
                height={barH}
                rx={3}
                ry={3}
                fill={d.hours > 0 ? 'url(#barGrad)' : 'rgba(54, 54, 54, 0.4)'}
                stroke={highlight ? 'rgba(255,255,255,0.9)' : d.hours > 0 ? 'rgba(168, 130, 255, 1)' : 'rgba(54, 54, 54, 0.6)'}
                strokeWidth={highlight ? 2.5 : 1.5}
              />
            );
          })}
          {data.map((d, i) => {
            const showLabel = xTickDays.includes(d.day);
            if (!showLabel || !d.label) return null;
            const x = i * barSlotWidth + barSlotWidth / 2;
            return (
              <SvgText
                key={`xl-${d.day}`}
                x={x}
                y={innerHeight + 12}
                fill="#666666"
                fontSize={9}
                fontFamily="monospace"
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            );
          })}
        </Svg>
        {tooltip && (
          <View
            style={[
              styles.tooltip,
              isSmall ? { left: Math.max(2, Math.min(tooltip.x - 24, chartWidth - 50)), top: Math.max(0, tooltip.y - 24) } : {
                left: Math.max(4, Math.min(tooltip.x - 36, chartWidth - 76)),
                top: Math.max(0, tooltip.y - 32),
              },
            ]}
          >
            <Text style={[styles.tooltipText, isSmall && { fontSize: 9 }]}>
              {selectedMonth} {data[tooltip.idx].day}: {data[tooltip.idx].hours.toFixed(1)}h
            </Text>
          </View>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', top: innerHeight, left: 0, width: chartWidth, height: xLabelHeight }} />
      </View>
    </View>
  );
};

const MonthlyReportScreen = () => {
  const { appData } = useApp();
  const { width } = useWindowDimensions();
  const isSmall = width <= 360;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const distinctYears = useMemo(() => {
    if (!appData.sessions || appData.sessions.length === 0) {
      return [currentYear];
    }
    const years = new Set<number>();
    appData.sessions.forEach((s: any) => {
      const d = new Date(s.checkInTime);
      if (!isNaN(d.getTime())) {
        years.add(d.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [appData.sessions, currentYear]);

  const sessionsInPeriod = useMemo(() => {
    return appData.sessions.filter((s: any) => {
      const d = new Date(s.checkInTime);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonthIndex;
    });
  }, [appData.sessions, selectedYear, selectedMonthIndex]);

  const dailyHoursMap = useMemo(() => {
    const map: Record<number, number> = {};
    sessionsInPeriod.forEach((s: any) => {
      const d = new Date(s.checkInTime);
      if (isNaN(d.getTime())) return;
      const day = d.getDate();
      const dur = s.checkOutTime ? s.checkOutTime - s.checkInTime : 0;
      map[day] = (map[day] || 0) + dur;
    });
    return map;
  }, [sessionsInPeriod]);

  const metrics = useMemo(() => {
    const daysArr = Object.values(dailyHoursMap);
    const totalMs = daysArr.reduce((sum, s) => sum + s, 0);
    const totalSessions = sessionsInPeriod.length;
    const activeDays = daysArr.filter((h) => h > 0).length;
    const peakMs = daysArr.length > 0 ? Math.max(...daysArr) : 0;
    const peakHours = peakMs / MS_PER_HOUR;
    return {
      totalHours: totalMs / MS_PER_HOUR,
      totalSessions,
      activeDays,
      peakOutput: Math.max(peakHours, 0),
    };
  }, [dailyHoursMap, sessionsInPeriod]);

  const chartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        day,
        hours: (dailyHoursMap[day] || 0) / MS_PER_HOUR,
        label:
          day === 1 || day % 5 === 0 || day === daysInMonth ? String(day) : '',
      };
    });
  }, [dailyHoursMap, selectedYear, selectedMonthIndex]);

  const monthHasData = useCallback(
    (mIndex: number, year: number) => {
      return appData.sessions.some((s: any) => {
        const d = new Date(s.checkInTime);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === year && d.getMonth() === mIndex;
      });
    },
    [appData.sessions]
  );

  const handleMonthPress = useCallback(
    (mIndex: number) => {
      const currentYearHas = monthHasData(mIndex, selectedYear);
      if (currentYearHas) {
        setSelectedMonthIndex(mIndex);
      } else {
        const firstYearWithMonth = distinctYears.find((y) => monthHasData(mIndex, y));
        if (firstYearWithMonth) {
          setSelectedYear(firstYearWithMonth);
          setSelectedMonthIndex(mIndex);
        } else {
          setSelectedMonthIndex(mIndex);
        }
      }
      setTimeout(() => {
        const offset = mIndex * 80 - 120;
        scrollViewRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
      }, 50);
    },
    [selectedYear, distinctYears, monthHasData]
  );

  const selectedMonthLabel = MONTH_NAMES[selectedMonthIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, isSmall && { padding: 14, paddingTop: 32, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={[styles.title, isSmall && { fontSize: fonts.sizes.sm }]}>Monthly Report</Text>
          <View style={styles.yearSelectorContainer}>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setShowYearDropdown(!showYearDropdown)}
              activeOpacity={0.8}
            >
              <Text style={styles.yearButtonText}>{selectedYear}</Text>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Polyline points="6 9 12 15 18 9" />
              </Svg>
            </TouchableOpacity>
            {showYearDropdown && (
              <TouchableOpacity
                style={styles.yearDropdownOverlay}
                activeOpacity={1}
                onPress={() => setShowYearDropdown(false)}
              >
                <View style={styles.yearDropdown}>
                  {distinctYears.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={styles.yearOption}
                      onPress={() => {
                        setSelectedYear(year);
                        setShowYearDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          year === selectedYear && styles.yearOptionTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.monthCarousel}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthScrollContent}
          >
            {MONTH_NAMES.map((name, index) => {
              const hasData = monthHasData(index, selectedYear);
              const isSelected = selectedMonthIndex === index;
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.monthPill,
                    isSelected ? styles.monthPillSelected : hasData ? styles.monthPillActive : styles.monthPillEmpty,
                  ]}
                  onPress={() => handleMonthPress(index)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.monthPillText,
                      isSelected && styles.monthPillTextSelected,
                    ]}
                  >
                    {name}
                  </Text>
                  {!isSelected && hasData && <View style={styles.purpleDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.metricsGrid, isSmall && { flexWrap: 'wrap' }]}>
          <View style={[styles.metricCard, isSmall && { padding: 10, minHeight: 60 }]}>
            <View style={styles.metricDotRow}>
              <View style={styles.metricDot} />
            </View>
            <Text style={[styles.metricLabel, isSmall && { fontSize: 9 }]}>Tracked</Text>
            <Text style={[styles.metricValue, isSmall && { fontSize: 13 }]}>{Math.floor(metrics.totalHours)}h</Text>
          </View>
          <View style={[styles.metricCard, isSmall && { padding: 10, minHeight: 60 }]}>
            <View style={styles.metricDotRow} />
            <Text style={[styles.metricLabel, isSmall && { fontSize: 9 }]}>Sessions</Text>
            <Text style={[styles.metricValue, isSmall && { fontSize: 13 }]}>{metrics.totalSessions}</Text>
          </View>
          <View style={[styles.metricCard, isSmall && { padding: 10, minHeight: 60 }]}>
            <View style={styles.metricDotRow} />
            <Text style={[styles.metricLabel, isSmall && { fontSize: 9 }]}>Active Days</Text>
            <Text style={[styles.metricValue, isSmall && { fontSize: 13 }]}>{metrics.activeDays} d</Text>
          </View>
        </View>

        <View style={[styles.dailyCard, isSmall && { padding: 12 }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartDot} />
             <Text style={[styles.chartTitle, isSmall && { fontSize: 10 }]}>Daily Breakdown</Text>
          </View>
          <View style={[styles.chartContainer, isSmall && { height: 140 }]}>
            <CustomBarChart
              data={chartData}
              selectedMonth={selectedMonthLabel}
              isSmall={isSmall}
            />
          </View>
        </View>

        <View style={[styles.peakCard, isSmall && { padding: 12 }]}>
          <View>
          <Text style={[styles.peakLabel, isSmall && { fontSize: 9 }]}>Peak Output</Text>
          <Text style={[styles.peakSublabel, isSmall && { fontSize: 10 }]}>Highest single-day focus duration</Text>
        </View>
        <Text style={[styles.peakValue, isSmall && { fontSize: 14 }]}>{metrics.peakOutput.toFixed(1)} hrs</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: fonts.sizes.lg,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  yearSelectorContainer: {
    position: 'relative',
  },
  yearButton: {
    backgroundColor: colors.base05,
    borderWidth: 1,
    borderColor: colors.base30,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yearButtonText: {
    color: colors.base100,
    fontSize: 12,
    fontWeight: '600',
  },
  yearDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  yearDropdown: {
    position: 'absolute',
    right: 0,
    top: 40,
    width: 96,
    borderRadius: 8,
    backgroundColor: colors.base05,
    borderWidth: 1,
    borderColor: colors.base30,
    paddingVertical: 4,
    zIndex: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  yearOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.base25,
  },
  yearOptionText: {
    fontSize: 12,
    color: colors.base60,
    fontWeight: '600',
  },
  yearOptionTextActive: {
    color: colors.fnPurple,
  },
  monthCarousel: {
    marginBottom: 20,
  },
  monthScrollContent: {
    gap: 8,
  },
  monthPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthPillSelected: {
    backgroundColor: colors.fnPurple,
    color: colors.base00,
    borderColor: colors.fnPurple,
    shadowColor: colors.fnPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  monthPillActive: {
    backgroundColor: 'rgba(36,36,36,0.6)',
    borderColor: colors.base25,
  },
  monthPillEmpty: {
    backgroundColor: 'rgba(38,38,38,0.2)',
    borderColor: colors.base20,
  },
  monthPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.base60,
  },
  monthPillTextSelected: {
    color: colors.base00,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.base10,
    borderWidth: 1,
    borderColor: colors.base25,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'column',
    minHeight: 72,
  },
  metricDotRow: {
    height: 6,
    marginBottom: 4,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.fnPurple,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.base50,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.white,
    marginTop: 4,
  },
  dailyCard: {
    backgroundColor: colors.base10,
    borderWidth: 1,
    borderColor: colors.base25,
    borderRadius: 20,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.fnPurple,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.base60,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chartContainer: {
    position: 'relative',
    height: 176,
  },
  peakCard: {
    backgroundColor: colors.base10,
    borderWidth: 1,
    borderColor: colors.base25,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 20,
  },
  peakLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.base60,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  peakSublabel: {
    fontSize: 11,
    color: colors.base50,
    marginTop: 2,
  },
  peakValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.fnPurple,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#212121',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    zIndex: 50,
  },
  tooltipText: {
    color: '#dadada',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  purpleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(168, 130, 255, 0.5)',
  },
});

export default MonthlyReportScreen;
