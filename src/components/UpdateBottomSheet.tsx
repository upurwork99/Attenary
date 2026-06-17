import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { UpdateInfo } from '../utils/updateService';
import { colors, spacing, borderRadius, fonts } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

interface Props {
  visible: boolean;
  updateInfo: UpdateInfo;
  onUpdateNow: () => void;
  onRemindLater: () => void;
  isMandatory?: boolean;
}

export const UpdateBottomSheet: React.FC<Props> = ({
  visible,
  updateInfo,
  onUpdateNow,
  onRemindLater,
  isMandatory = false,
}) => {
  const animRef = useRef({
    translateY: new Animated.Value(SHEET_HEIGHT) as Animated.Value,
    backdropOpacity: new Animated.Value(0) as Animated.Value,
  });

  useEffect(() => {
    const { translateY, backdropOpacity } = animRef.current;

    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SHEET_HEIGHT,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && animRef.current.translateY._value === SHEET_HEIGHT) return null;

  const releaseNotesArray = updateInfo.releaseNotes
    .split('\n')
    .filter((line) => line.trim().length > 0);

  const { translateY, backdropOpacity } = animRef.current;

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={isMandatory ? undefined : onRemindLater}
      />
      <StatusBar backgroundColor="rgba(0,0,0,0.6)" barStyle="light" />

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            height: isMandatory ? SHEET_HEIGHT : SHEET_HEIGHT * 0.75,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/update.png')}
            style={styles.updateImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.versionBadge}>v{updateInfo.version}</Text>
        </View>

        <View style={styles.body}>
          {releaseNotesArray.length > 0 ? (
            releaseNotesArray.map((line, idx) => (
              <View key={idx} style={styles.changelogItem}>
                <View style={styles.bullet} />
                <Text style={styles.changelogText}>{line.trim()}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.changelogText}>{updateInfo.releaseNotes}</Text>
          )}
        </View>

        <View style={styles.footer}>
          {!isMandatory && (
            <TouchableOpacity
              style={styles.laterButton}
              onPress={onRemindLater}
              activeOpacity={0.8}
            >
              <Text style={styles.laterButtonText}>Remind Me Later</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isMandatory && styles.primaryButtonFullWidth]}
            onPress={onUpdateNow}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isMandatory ? 'Update Now (Required)' : 'Update Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopLeftRadius: borderRadius.card,
    borderTopRightRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  updateImage: {
    width: 160,
    height: 160,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold as any,
    color: colors.textPrimary,
  },
  versionBadge: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as any,
    color: colors.textOnAccent,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  changelogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  changelogText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  laterButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as any,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonFullWidth: {},
  primaryButtonText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold as any,
    color: colors.textOnAccent,
  },
});
