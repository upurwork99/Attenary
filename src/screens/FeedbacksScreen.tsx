import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fonts, shadows } from '../theme/colors';
import Svg, { Path } from 'react-native-svg';
import { useSupabase } from '../context/SupabaseContext';
import { useLanguage } from '../context/LanguageContext';

const SendIcon = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" stroke={colors.bgMain} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BackIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15.75 19.5 8.25 12l7.5-7.5" stroke={colors.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FeedbackIcon = ({ size = 36 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" stroke={colors.textAccent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FeedbacksScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { t } = useLanguage();
  const { profile, createFeedback } = useSupabase();
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'feature'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert(t('common.error'), t('feedbacks.pleaseEnterFeedback'));
      return;
    }

    if (feedback.trim().length < 10) {
      Alert.alert(t('common.error'), t('feedbacks.feedbackMinLength').replace('{minLength}', '10'));
      return;
    }

    if (email.trim() && !isValidEmail(email.trim())) {
      Alert.alert(t('common.error'), t('feedbacks.validEmail'));
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await createFeedback({
        type: feedbackType,
        email: email.trim() || profile?.email,
        content: feedback.trim(),
        metadata: {
          userAgent: 'Attenary Mobile App',
          referrer: 'React Native App',
          screenResolution: `${Math.round(Dimensions.get('window').width)}x${Math.round(Dimensions.get('window').height)}`,
        },
      });

      if (error) {
        throw error;
      }

      setRetryAttempts(0);
      Alert.alert(
        t('feedbacks.thankYou'),
        t('feedbacks.feedbackSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              setFeedback('');
              setEmail('');
              setFeedbackType('general');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      const canRetry = retryAttempts < MAX_RETRY_ATTEMPTS;
      const remainingAttempts = MAX_RETRY_ATTEMPTS - retryAttempts;

      Alert.alert(
        t('feedbacks.connectionError'),
        canRetry
          ? t('feedbacks.connectionErrorRetry').replace('{remaining}', remainingAttempts.toString())
          : t('feedbacks.maxRetryReached'),
        canRetry
          ? [
              { text: t('feedbacks.cancel'), style: 'cancel', onPress: () => setRetryAttempts(0) },
              {
                text: t('feedbacks.retry'),
                onPress: () => {
                  setRetryAttempts(retryAttempts + 1);
                  handleSubmit();
                },
              },
            ]
          : [
              { text: t('common.ok'), onPress: () => setRetryAttempts(0) },
            ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    { id: 'general', label: t('feedbacks.general') },
    { id: 'bug', label: t('feedbacks.bugReport') },
    { id: 'feature', label: t('feedbacks.featureRequest') },
  ];

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
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('feedbacks.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon Section */}
          <View style={styles.iconSection}>
            <View style={styles.iconContainer}>
              <FeedbackIcon size={36} />
            </View>
            <Text style={styles.title}>{t('feedbacks.weValueYourFeedback')}</Text>
            <Text style={styles.subtitle}>
              {t('feedbacks.helpUsImprove')}
            </Text>
          </View>

          {/* Feedback Type Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('feedbacks.feedbackType')}</Text>
            <View style={styles.typeGrid}>
              {feedbackTypes.map((type) => {
                const isActive = feedbackType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      isActive && styles.typeButtonActive,
                    ]}
                    onPress={() => setFeedbackType(type.id as any)}
                    activeOpacity={0.85}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      isActive && styles.typeButtonTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('feedbacks.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('feedbacks.emailPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Feedback Input */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('feedbacks.yourFeedback')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('feedbacks.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.bgMain} size="small" />
            ) : (
              <SendIcon size={18} />
            )}
            <Text style={styles.submitButtonText}>
              {isSubmitting ? t('feedbacks.submitting') : t('feedbacks.submit')}
            </Text>
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            {t('feedbacks.feedbackInfoText')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderRadius: borderRadius.md,
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
  iconSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.accentGlowSubtle,
  },
  title: {
    fontSize: fonts.sizes.xxl,
    fontWeight: fonts.weights.bold as any,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fonts.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold as any,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(36,36,36,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(54,54,54,0.6)',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(168,130,255,0.12)',
    borderColor: colors.textAccent,
  },
  typeButtonText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold as any,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.textAccent,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(54,54,54,0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fonts.sizes.md,
    color: colors.textPrimary,
  },
  textArea: {
    height: 150,
    paddingTop: spacing.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xxl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.sm,
    ...shadows.accentGlow,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as any,
    color: colors.bgMain,
    marginLeft: spacing.sm,
  },
  infoText: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
});

export default FeedbacksScreen;
