import { canOpenURL, openURL } from 'expo-linking';

export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  mandatory: boolean;
}

const UPDATE_CONFIG = {
  checkUrl: 'https://gist.githubusercontent.com/ZiadKhaled999/f786abc6db6b3dfc4d0de21d88e520e7/raw/update.json',
  currentVersion: '3.23.7',
};

export const checkForUpdate = async (): Promise<UpdateInfo | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(UPDATE_CONFIG.checkUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[UpdateCheck] Remote JSON not OK:', response.status);
      return null;
    }

    const updateData: UpdateInfo = await response.json();

    const currentVersion = UPDATE_CONFIG.currentVersion;
    const latestVersion = updateData.version;

    console.log('[UpdateCheck] current:', currentVersion, '| latest:', latestVersion);

    if (latestVersion === currentVersion) {
      console.log('[UpdateCheck] Versions match — no update needed (set a higher version in the Gist to trigger)');
      return null;
    }

    if (isNewVersionAvailable(currentVersion, latestVersion)) {
      console.log('[UpdateCheck] New version available:', updateData);
      return updateData;
    }

    console.log('[UpdateCheck] Remote version is older than current — skipping');
    return null;
  } catch (error) {
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.warn('[UpdateCheck] fetch/parse failed:', msg, '| URL:', UPDATE_CONFIG.checkUrl);
    return null;
  }
};

const isNewVersionAvailable = (current: string, latest: string): boolean => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (latestPart > currentPart) {
      return true;
    }
    if (latestPart < currentPart) {
      return false;
    }
  }

  return false;
};

export const downloadAndInstallUpdate = async (downloadUrl: string): Promise<boolean> => {
  try {
    const canOpen = await canOpenURL(downloadUrl);
    
    if (canOpen) {
      await openURL(downloadUrl);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('Error opening download URL:', error);
    return false;
  }
};

export const getCurrentVersion = (): string => {
  return UPDATE_CONFIG.currentVersion;
};