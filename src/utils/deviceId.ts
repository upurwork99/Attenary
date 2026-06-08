import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'device_anon_id';

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = `anon_${crypto.randomUUID()}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}
