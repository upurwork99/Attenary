import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_AT_KEY = '@attenary:update_dismissed_at';
const DISMISSED_VERSION_KEY = '@attenary:update_dismissed_version';
const COOLDOWN_MS = 8 * 60 * 60 * 1000;

export const getDismissedAt = async (): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_AT_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
};

export const getDismissedVersion = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
};

export const setDismissedAt = async (version: string): Promise<void> => {
  try {
    await AsyncStorage.multiSet([
      [DISMISSED_AT_KEY, Date.now().toString()],
      [DISMISSED_VERSION_KEY, version],
    ]);
  } catch {
    // non-critical
  }
};

export const shouldShowUpdate = async (currentVersion: string): Promise<boolean> => {
  try {
    const dismissedAt = await getDismissedAt();
    const dismissedVersion = await getDismissedVersion();

    if (dismissedVersion && dismissedVersion !== currentVersion) {
      return true;
    }

    if (!dismissedAt) return true;

    return Date.now() - dismissedAt >= COOLDOWN_MS;
  } catch {
    return true;
  }
};

export const resetDismissed = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([DISMISSED_AT_KEY, DISMISSED_VERSION_KEY]);
  } catch {
    // non-critical
  }
};
