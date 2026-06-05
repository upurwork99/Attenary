import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, ScrollView, Alert, Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { colors, spacing, borderRadius, fonts, shadows } from '../theme/colors';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Svg, { Path, Circle } from 'react-native-svg';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const BackIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FileIcon = ({ size = 20, color = colors.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShareIcon = ({ size = 20, color = colors.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BossExportScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { appData } = useApp();
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [generating, setGenerating] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [generatedFilePath, setGeneratedFilePath] = useState<string | null>(null);

  const years = useMemo(() => {
    const uniqueYears = new Set<number>();
    appData.sessions.forEach((s: any) => uniqueYears.add(new Date(s.checkInTime).getFullYear()));
    uniqueYears.add(new Date().getFullYear());
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [appData.sessions]);

  const monthIndex = MONTHS.indexOf(selectedMonth);

  const monthStats = useMemo(() => {
    const filtered = appData.sessions.filter((s: any) => {
      const date = new Date(s.checkInTime);
      return date.getFullYear().toString() === selectedYear && MONTHS[date.getMonth()] === selectedMonth && s.checkOutTime !== null;
    });
    const totalSeconds = filtered.reduce((sum: number, s: any) => sum + Math.floor((s.checkOutTime - s.checkInTime) / 1000), 0);
    return { totalSeconds, totalHours: totalSeconds / 3600, sessionsCount: filtered.length, daysCount: new Set(filtered.map((s: any) => new Date(s.checkInTime).getDate())).size };
  }, [appData.sessions, selectedYear, selectedMonth]);

  const buildPdfHtml = () => {
    const employeeName = appData.employeeName || 'Employee';
    const jobTitle = appData.jobTitle || '';
    const department = appData.department || '';
    const rate = appData.hourRate || 0;
    const earnings = (monthStats.totalHours) * rate;
    const sectionDaily = t('bossExport.sectionDaily');
    const sectionSession = t('bossExport.sectionSession');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 32px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px; }
        .brand-name { font-size: 20px; font-weight: 700; color: #0f172a; }
        .report-meta { text-align: right; font-size: 12px; color: #64748b; }
        .title { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .subtitle { font-size: 14px; color: #64748b; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
        .card { background: #f8fafc; border-radius: 16px; padding: 18px; border: 1px solid #e2e8f0; }
        .card-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.8; margin-bottom: 6px; }
        .card-value { font-size: 22px; font-weight: 700; color: #0f172a; }
        .card-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .section { margin-top: 28px; }
        .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 10px 12px; background: #f1f5f9; color: #475569; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; }
        tr:last-child td { border-bottom: none; }
        .amount { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <div class="brand-icon">A</div>
          <div class="brand-name">Attenary</div>
        </div>
        <div class="report-meta">
          <div>Generated: ${new Date().toLocaleDateString()}</div>
          <div>Period: ${selectedMonth} ${selectedYear}</div>
        </div>
      </div>

      <div class="title">Boss Export</div>
      <div class="subtitle">Hours report for ${employeeName}${jobTitle ? ` · ${jobTitle}` : ''}${department ? ` · ${department}` : ''}</div>

      <div class="grid">
        <div class="card">
          <div class="card-label">Total Hours</div>
          <div class="card-value">${monthStats.totalHours.toFixed(2)}</div>
          <div class="card-sub">in ${selectedMonth} ${selectedYear}</div>
        </div>
        <div class="card">
          <div class="card-label">Sessions</div>
          <div class="card-value">${monthStats.sessionsCount}</div>
          <div class="card-sub">completed sessions</div>
        </div>
        <div class="card">
          <div class="card-label">Days Worked</div>
          <div class="card-value">${monthStats.daysCount}</div>
          <div class="card-sub">active days</div>
        </div>
        <div class="card">
          <div class="card-label">Earnings (est.)</div>
          <div class="card-value amount">${earnings.toFixed(2)}</div>
          <div class="card-sub">at ${rate.toFixed(2)} / hour</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">${sectionDaily}</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Hours</th>
              <th>Earnings</th>
            </tr>
          </thead>
          <tbody>
            ${appData.sessions
              .filter((s: any) => {
                const d = new Date(s.checkInTime);
                return d.getFullYear().toString() === selectedYear && MONTHS[d.getMonth()] === selectedMonth && s.checkOutTime !== null;
              })
              .sort((a: any, b: any) => b.checkInTime - a.checkInTime)
              .map((s: any) => {
                const d = new Date(s.checkInTime);
                const hours = Math.floor((s.checkOutTime - s.checkInTime) / 3600);
                const mins = Math.floor(((s.checkOutTime - s.checkInTime) % 3600) / 60);
                const dayEarnings = ((s.checkOutTime - s.checkInTime) / 3600000) * rate;
                return `
                  <tr>
                    <td>${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td>${hours}h ${mins}m</td>
                    <td class="amount">${dayEarnings.toFixed(2)}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">${sectionSession}</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Duration</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${appData.sessions
              .filter((s: any) => {
                const d = new Date(s.checkInTime);
                return d.getFullYear().toString() === selectedYear && MONTHS[d.getMonth()] === selectedMonth && s.checkOutTime !== null;
              })
              .sort((a: any, b: any) => b.checkInTime - a.checkInTime)
              .map((s: any) => {
                const d = new Date(s.checkInTime);
                const checkIn = new Date(s.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                const checkOut = new Date(s.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                const durationHours = Math.floor((s.checkOutTime - s.checkInTime) / 3600);
                const durationMins = Math.floor(((s.checkOutTime - s.checkInTime) % 3600) / 60);
                const reason = s.reason && s.reason.trim() !== '' ? s.reason : '—';
                return `
                  <tr>
                    <td>${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td>${checkIn}</td>
                    <td>${checkOut}</td>
                    <td>${durationHours}h ${durationMins}m</td>
                    <td>${reason}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">Attenary · Time Tracking Made Simple · Generated on ${new Date().toLocaleString()}</div>
    </body>
    </html>
    `;
  };

  const handleGeneratePdf = async () => {
    try {
      setGenerating(true);
      const html = buildPdfHtml();
      const { printToFileAsync } = await import('expo-print');
      const { uri } = await printToFileAsync({ html, base64: false });
      setGeneratedFilePath(uri);
      setShowShareSheet(true);
    } catch (error) {
      console.log('PDF generation error:', error);
      Alert.alert(t('common.error'), t('bossExport.generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const handleShareOption = async (option: 'save' | 'whatsapp' | 'telegram' | 'gmail' | 'native') => {
    if (!generatedFilePath) return;
    setShowShareSheet(false);

    try {
      const fileName = `Attenary-BossExport-${selectedMonth}-${selectedYear}.pdf`;
      const destPath = (FileSystem as any).documentDirectory + fileName;
      await (FileSystem as any).copyAsync({ from: generatedFilePath, to: destPath });

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([await (FileSystem as any).readAsStringAsync(generatedFilePath, { encoding: (FileSystem as any).EncodingType.Base64 })]));
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (option === 'save') {
        Alert.alert(t('common.success'), t('bossExport.saved'));
        return;
      }

      if (option === 'native') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(destPath, { mimeType: 'application/pdf', dialogTitle: 'Share Boss Export' });
        } else {
          Alert.alert(t('bossExport.sharingNotAvailable'), t('bossExport.sharingNotAvailableDevice'));
        }
        return;
      }

      const shareUrl = `file://${destPath}`;
      const message = `Attenary Hours Report - ${selectedMonth} ${selectedYear}`;
      let appScheme = '';

      switch (option) {
        case 'whatsapp':
          appScheme = 'whatsapp://send?text=' + encodeURIComponent(message);
          break;
        case 'telegram':
          appScheme = 'tg://msg?text=' + encodeURIComponent(message);
          break;
        case 'gmail':
          appScheme = 'googlegmail://co?subject=' + encodeURIComponent(t('bossExport.reportSubject', { month: selectedMonth, year: selectedYear })) + '&body=' + encodeURIComponent(message);
          break;
        default:
          break;
      }

      const canOpen = await Linking.canOpenURL(appScheme).catch(() => false);
      if (canOpen) {
        await Linking.openURL(appScheme);
      } else {
        await Sharing.shareAsync(shareUrl, { mimeType: 'application/pdf', dialogTitle: 'Share Boss Export' });
      }
    } catch (error) {
      console.log('Share error:', error);
      Alert.alert(t('common.error'), t('bossExport.shareFailed'));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgMain} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <BackIcon size={24} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t('bossExport.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('bossExport.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileIcon size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{t('bossExport.selectPeriod')}</Text>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('hourRate.year')}</Text>
            <View style={styles.pillsRow}>
              {years.map((y) => {
                const active = selectedYear === y.toString();
                return (
                  <TouchableOpacity key={y} onPress={() => setSelectedYear(y.toString())} style={[styles.pill, active && styles.pillActive]}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{y}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('hourRate.month')}</Text>
            <View style={styles.pillsRow}>
              {MONTHS.map((m) => {
                const active = selectedMonth === m;
                return (
                  <TouchableOpacity key={m} onPress={() => setSelectedMonth(m)} style={[styles.pill, active && styles.pillActive]}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('hourRate.totalHours')}</Text>
              <Text style={styles.summaryValue}>{monthStats.totalHours.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('hourRate.sessions')}</Text>
              <Text style={styles.summaryValue}>{monthStats.sessionsCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('hourRate.daysWorked')}</Text>
              <Text style={styles.summaryValue}>{monthStats.daysCount}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleGeneratePdf} activeOpacity={0.8} disabled={generating}>
          <FileIcon size={18} color={colors.bgMain} />
          <Text style={styles.primaryButtonText}>{generating ? t('bossExport.generating') : t('bossExport.generate')}</Text>
        </TouchableOpacity>

        {showShareSheet && (
          <View style={styles.sheetOverlay}>
            <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowShareSheet(false)} />
            <View style={styles.sheetCard}>
              <View style={styles.dragHandle} />
              <Text style={styles.sheetTitle}>{t('bossExport.shareTitle')}</Text>
              <Text style={styles.sheetSubtitle}>{t('bossExport.shareSubtitle')}</Text>

              <View style={styles.shareOptions}>
                <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('save')}>
                  <View style={[styles.shareIconBox, { backgroundColor: '#e2e8f0' }]}>
                    <FileIcon size={20} color="#0f172a" />
                  </View>
                  <Text style={styles.shareLabel}>{t('bossExport.saveLocal')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('whatsapp')}>
                  <View style={[styles.shareIconBox, { backgroundColor: '#dcfce7' }]}>
                    <ShareIcon size={20} color="#166534" />
                  </View>
                  <Text style={styles.shareLabel}>{t('bossExport.whatsapp')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('telegram')}>
                  <View style={[styles.shareIconBox, { backgroundColor: '#e0e7ff' }]}>
                    <ShareIcon size={20} color="#3730a3" />
                  </View>
                  <Text style={styles.shareLabel}>{t('bossExport.telegram')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('gmail')}>
                  <View style={[styles.shareIconBox, { backgroundColor: '#fee2e2' }]}>
                    <ShareIcon size={20} color="#991b1b" />
                  </View>
                  <Text style={styles.shareLabel}>{t('bossExport.gmail')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('native')}>
                  <View style={[styles.shareIconBox, { backgroundColor: '#f1f5f9' }]}>
                    <ShareIcon size={20} color="#0f172a" />
                  </View>
                  <Text style={styles.shareLabel}>{t('bossExport.moreOptions')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMain },
  scrollView: { flex: 1 },
  contentContainer: { padding: 16, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4, gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  headerText: { flex: 1 },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as any, color: colors.textPrimary, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: fonts.sizes.sm, color: colors.textMuted, fontWeight: fonts.weights.medium as any, marginTop: 2 },
  card: { backgroundColor: colors.bgCard, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 16, ...shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold as any, color: colors.textPrimary },
  filterSection: { marginBottom: 14 },
  filterLabel: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold as any, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 10 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  pillActive: { backgroundColor: 'rgba(139,108,239,0.10)', borderColor: 'rgba(163,116,249,0.30)' },
  pillText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold as any, color: colors.textMuted },
  pillTextActive: { color: colors.primary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold as any, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  summaryValue: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.bold as any, color: colors.textPrimary, fontFamily: 'monospace' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 16, marginTop: 4 },
  primaryButtonText: { color: colors.bgMain, fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as any, letterSpacing: 0.2 },
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 50 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  sheetCard: { backgroundColor: colors.bgMain, borderTopColor: colors.border, borderTopWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
  dragHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.2, marginBottom: 4 },
  sheetSubtitle: { fontSize: 12, color: colors.textMuted, marginBottom: 18 },
  shareOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  shareOption: { width: '30%', alignItems: 'center', gap: 8 },
  shareIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  shareLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
});

export default BossExportScreen;
