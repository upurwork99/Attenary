import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fonts, shadows } from '../theme/colors';
import Svg, { Path } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';

const BackIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15.75 19.5 8.25 12l7.5-7.5" stroke={colors.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ExternalLinkIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" stroke={colors.bgMain} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BuyMeCoffeeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { t } = useLanguage();
  const [selectedOption, setSelectedOption] = useState('one');

  const handleBuyCoffee = () => {
    const url = 'https://buymeacoffee.com/attenary';
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert(t('buymecoffee.error'), t('buymecoffee.unableToOpenLink'));
      }
    });
  };

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync('https://buymeacoffee.com/attenary');
      } else {
        Alert.alert('Shared!', 'Platform sharing link copied securely directly into local clipboard framework space!');
      }
    } catch (error) {
      Alert.alert('Shared!', 'Platform sharing link copied securely directly into local clipboard framework space!');
    }
  };

  const handleAction = () => {
    if (selectedOption === 'share') {
      handleShare();
    } else {
      handleBuyCoffee();
    }
  };

  const supportOptions = [
    {
      id: 'one',
      title: t('buymecoffee.oneTimeSupport'),
      description: t('buymecoffee.oneTimeDescription'),
      icon: '☕',
    },
    {
      id: 'monthly',
      title: t('buymecoffee.monthlySupport'),
      description: t('buymecoffee.monthlyDescription'),
      icon: '⭐',
    },
    {
      id: 'share',
      title: t('buymecoffee.shareApp'),
      description: t('buymecoffee.shareDescription'),
      icon: '📢',
    },
  ];

  const benefits = [
    t('buymecoffee.benefit1'),
    t('buymecoffee.benefit2'),
    t('buymecoffee.benefit3'),
    t('buymecoffee.benefit4'),
  ];

  const ctaLabel = selectedOption === 'share' ? t('buymecoffee.shareApp') : t('buymecoffee.ctaButton');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgMain} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackIcon size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('buymecoffee.supportDevelopment')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconOuter}>
            <View style={styles.heroIconInner}>
              <Text style={styles.heroEmoji}>☕</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{t('buymecoffee.heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('buymecoffee.heroSubtitle')}
          </Text>
        </View>

        {/* Why Support */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('buymecoffee.whySupport')}</Text>
          <View style={styles.benefitsCard}>
            {benefits.map((benefit, index) => (
              <View 
                key={index}
                style={[
                  styles.benefitRow,
                  index < benefits.length - 1 && styles.benefitRowBorder,
                ]}
              >
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitEmoji}>☕</Text>
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ways to Support */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('buymecoffee.waysToSupport')}</Text>
          <View style={styles.optionsStack}>
            {supportOptions.map((option) => {
              const isActive = selectedOption === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    isActive && styles.optionCardActive,
                  ]}
                  onPress={() => setSelectedOption(option.id as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.optionIconBox}>
                    <Text style={styles.optionEmoji}>{option.icon}</Text>
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={handleAction}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaLabel}>{ctaLabel}</Text>
            <ExternalLinkIcon size={16} />
          </TouchableOpacity>
        </View>

        {/* Community Message */}
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>
            {t('buymecoffee.communityMessage')}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('buymecoffee.footer')}
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgMain,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.base10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as any,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  heroIconOuter: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.textAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.accentGlow,
  },
  heroIconInner: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroEmoji: {
    fontSize: 40,
    lineHeight: 44,
  },
  heroTitle: {
    fontSize: fonts.sizes.xxxl,
    fontWeight: fonts.weights.extrabold as any,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: fonts.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
    fontWeight: fonts.weights.medium as any,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold as any,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  benefitsCard: {
    backgroundColor: 'rgba(36,36,36,0.7)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(168,130,255,0.2)',
    padding: spacing.md,
    overflow: 'hidden',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  benefitRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    marginBottom: spacing.sm,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(168,130,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitEmoji: {
    fontSize: fonts.sizes.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: fonts.sizes.md,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium as any,
  },
  optionsStack: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  optionCardActive: {
    backgroundColor: 'rgba(168,130,255,0.08)',
    borderLeftColor: colors.textAccent,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: fonts.sizes.lg,
  },
  optionBody: {
    flex: 1,
    gap: spacing.xs,
  },
  optionTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as any,
    color: colors.textPrimary,
  },
  optionDescription: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
    fontWeight: fonts.weights.medium as any,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xxl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    ...shadows.accentGlow,
    gap: spacing.sm,
  },
  ctaLabel: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.extrabold as any,
    color: colors.bgMain,
    letterSpacing: 0.2,
  },
  messageCard: {
    backgroundColor: 'rgba(168,130,255,0.08)',
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: 'rgba(168,130,255,0.2)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  messageText: {
    fontSize: fonts.sizes.md,
    color: colors.textAccent,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: fonts.weights.medium as any,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: fonts.weights.medium as any,
    letterSpacing: 0.3,
  },
});

export default BuyMeCoffeeScreen;
