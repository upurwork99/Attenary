import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useTabBarVisibility } from '../context/TabBarVisibilityContext';
import { useLanguage } from '../context/LanguageContext';
import { colors, spacing, borderRadius, fonts, shadows } from '../theme/colors';

const HeaderIcon = ({ size = 28 }: { size?: number }) => (
  <Image source={require('../../assets/icons/profile.png')} style={{ width: size, height: size }} resizeMode="contain" />
);

const SuccessIcon = ({ size = 48 }: { size?: number }) => (
  <Image source={require('../../assets/icons/logs.png')} style={{ width: size, height: size }} resizeMode="contain" />
);

const CheckInModal = ({ navigation, route }: any) => {
  const { appData, checkIn } = useApp();
  const { t } = useLanguage();
  const { setVisible } = useTabBarVisibility();
  const [modalVisible, setModalVisible] = useState(true);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setVisible(false);
    return () => setVisible(true);
  }, [setVisible]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      setModalVisible(false);
      setVisible(true);
      navigation.dispatch(e.data.action);
    });
    return unsubscribe;
  }, [navigation, setVisible]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setVisible(true);
    navigation?.goBack?.();
  }, [navigation, setVisible]);

  useEffect(() => {
    if (!appData.employeeName) {
      setStatus('error');
      setMessage(t('modal.profileRequired'));
    }
  }, [appData.employeeName, t]);

  const handleConfirmCheckIn = async () => {
    const alreadyActive = appData.sessions.some((s: any) => s.checkOutTime === null);
    if (alreadyActive) {
      setStatus('success');
      setMessage(
        t('modal.checkedInSuccess').replace('{name}', appData.employeeName || ''),
      );
      return;
    }

    setStatus('processing');
    try {
      await checkIn();
      setStatus('success');
      setMessage(
        t('modal.checkedInSuccess').replace('{name}', appData.employeeName || ''),
      );
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || t('modal.checkInError'));
    }
  };

  if (!modalVisible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.iconWrap}>
          {status === 'success' ? <SuccessIcon size={44} /> : <HeaderIcon size={28} />}
        </View>
        <Text style={styles.modalTitle}>{t('modal.checkInTitle')}</Text>
        <Text style={styles.modalMessage}>
          {status === 'idle' ? t('modal.checkInConfirm') || 'Confirm check-in to start tracking your time.' : message}
        </Text>

        <View style={styles.footer}>
          {status === 'idle' || status === 'error' ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleConfirmCheckIn}
                activeOpacity={0.85}
                disabled={!appData.employeeName}
              >
                <Text style={styles.buttonText}>{t('modal.confirm') || 'Confirm'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={closeModal}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonTextSecondary}>{t('modal.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={closeModal} activeOpacity={0.85}>
              <Text style={styles.buttonText}>{t('modal.close')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold as any,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: fonts.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  footer: {
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: fonts.sizes.lg,
    color: colors.bgMain,
    fontWeight: fonts.weights.bold as any,
  },
  buttonTextSecondary: {
    fontSize: fonts.sizes.lg,
    color: colors.textSecondary,
    fontWeight: fonts.weights.bold as any,
  },
});

export default CheckInModal;
