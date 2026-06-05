import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Platform, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, fonts, shadows } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import * as Sharing from 'expo-sharing';
import Svg, { Path } from 'react-native-svg';

const ChevronRightIcon = ({ size = 20 }: { size?: number }) => (
  <Text style={{ fontSize: size, color: colors.textFaint, fontWeight: '600' }}>›</Text>
);

const FeedbacksIcon = ({ size = 20 }: { size?: number }) => (
  <Image source={require('../../assets/icons/feedback.png')} style={{ width: size, height: size }} resizeMode="contain" />
);

const LanguagesIcon = ({ size = 20 }: { size?: number }) => (
  <Image source={require('../../assets/icons/Language.png')} style={{ width: size, height: size }} resizeMode="contain" />
);

const BackupIcon = ({ size = 20 }: { size?: number }) => (
  <Image source={require('../../assets/icons/export.png')} style={{ width: size, height: size }} resizeMode="contain" />
);

const RestoreIcon = ({ size = 20 }: { size?: number }) => (
  <Image source={require('../../assets/icons/import.png')} style={{ width: size, height: size }} resizeMode="contain" />
);

const CoffeeIcon = ({ size = 20 }: { size?: number }) => (
  <Image source={require('../../assets/icons/buymeacoffee.png')} style={{ width: size, height: size }} resizeMode="contain" />
);

const ShareIcon = ({ size = 20 }: { size?: number }) => (
  <Image source={require('../../assets/icons/analytics.png')} style={{ width: size, height: size }} resizeMode="contain" />
);

const AboutIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.textAccent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </Svg>
);

const PrivacyIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.textAccent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
  </Svg>
);

const MoreScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();

  const handleShare = async () => {
    try {
      const appUrl = 'https://attenary.pages.dev/';
      const message = Platform.select({
        web: 'Check out Attenary, the modern time tracking app!',
        default: 'Attenary - Time Tracking Made Simple',
      });

      if (Platform.OS === 'web') {
        const shareData = { title: 'Attenary', text: message as string, url: appUrl };
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(appUrl);
          Alert.alert(t('common.success'), 'Link copied to clipboard!');
        }
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(appUrl, {
            dialogTitle: t('more.share'),
            mimeType: 'text/plain',
          });
        } else {
          Alert.alert(t('common.success'), 'Sharing not available on this device.');
        }
      }
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const navItems = [
    {
      id: 'feedbacks',
      title: t('more.feedbacks'),
      subtitle: t('more.feedbacksSubtitle'),
      icon: <FeedbacksIcon size={20} />,
      screen: 'Feedbacks',
    },
    {
      id: 'languages',
      title: t('more.languages'),
      subtitle: t('more.languagesSubtitle'),
      icon: <LanguagesIcon size={20} />,
      screen: 'Languages',
    },
    {
      id: 'backup',
      title: t('more.backup'),
      subtitle: t('more.backupSubtitle'),
      icon: <BackupIcon size={20} />,
      screen: 'Backup',
    },
    {
      id: 'restoreBackup',
      title: t('more.restoreBackup'),
      subtitle: t('more.restoreBackupSubtitle'),
      icon: <RestoreIcon size={20} />,
      screen: 'RestoreBackup',
    },
    {
      id: 'coffee',
      title: t('more.coffee'),
      subtitle: t('more.coffeeSubtitle'),
      icon: <CoffeeIcon size={20} />,
      screen: 'BuyMeCoffee',
    },
    {
      id: 'share',
      title: t('more.share'),
      subtitle: t('more.shareSubtitle'),
      icon: <ShareIcon size={20} />,
      onPress: handleShare,
    },
    {
      id: 'about',
      title: t('more.about'),
      subtitle: t('more.aboutSubtitle'),
      icon: <AboutIcon size={20} />,
      screen: 'About',
    },
    {
      id: 'privacy',
      title: t('more.privacy'),
      subtitle: t('more.privacySubtitle'),
      icon: <PrivacyIcon size={20} />,
      onPress: () => Alert.alert(t('common.comingSoon'), 'Privacy Policy will be available soon.'),
    },
  ];

  const handlePress = (item: any) => {
    if (item.onPress) {
      item.onPress();
    } else if (item.screen) {
      navigation.navigate(item.screen as never);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgMain} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.headerLabel}>{t('common.settingsInfo')}</Text>
        </View>

        <View style={styles.glassPanel}>
          {navItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                index !== navItems.length - 1 && styles.navItemBorder,
              ]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.navItemIcon}>
                {item.icon}
              </View>
              <View style={styles.navItemContent}>
                <Text style={styles.navItemTitle}>{item.title}</Text>
                <Text style={styles.navItemSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={styles.chevronContainer}>
                <ChevronRightIcon size={16} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Attenary</Text>
          <Text style={styles.footerSubtitle}>Time Tracking Made Simple</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
    paddingTop: spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerSection: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold as any,
    color: colors.textAccent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  glassPanel: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 8,
    marginHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: spacing.xs,
    marginVertical: 2,
  },
  navItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  navItemContent: {
    flex: 1,
  },
  navItemTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as any,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  navItemSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    fontWeight: fonts.weights.normal as any,
  },
  chevronContainer: {
    marginLeft: spacing.sm,
    opacity: 0.6,
  },
  footer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    paddingTop: spacing.lg,
  },
  footerTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as any,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  footerSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    fontWeight: fonts.weights.medium as any,
  },
});

export default MoreScreen;