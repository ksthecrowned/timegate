import * as SecureStore from 'expo-secure-store';

const DEVICE_INSTALL_KEY = 'timegate_device_install_id';
const DEVICE_TRUST_KEY = 'timegate_device_trust';
const DEVICE_ONBOARDING_SEEN_KEY = 'timegate_device_onboarding_seen_v1';

function createInstallId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceInstallId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_INSTALL_KEY);
  if (existing) return existing;
  const id = createInstallId();
  await SecureStore.setItemAsync(DEVICE_INSTALL_KEY, id);
  return id;
}

export async function setDeviceTrust(
  trust: 'TRUSTED' | 'PENDING' | null,
): Promise<void> {
  if (!trust) {
    await SecureStore.deleteItemAsync(DEVICE_TRUST_KEY);
    return;
  }
  await SecureStore.setItemAsync(DEVICE_TRUST_KEY, trust);
  // Once trusted, allow onboarding again if this install becomes PENDING later.
  if (trust === 'TRUSTED') {
    await SecureStore.deleteItemAsync(DEVICE_ONBOARDING_SEEN_KEY);
  }
}

export async function getDeviceTrust(): Promise<'TRUSTED' | 'PENDING' | null> {
  const v = await SecureStore.getItemAsync(DEVICE_TRUST_KEY);
  if (v === 'TRUSTED' || v === 'PENDING') return v;
  return null;
}

export async function shouldShowDeviceOnboarding(): Promise<boolean> {
  const trust = await getDeviceTrust();
  if (trust !== 'PENDING') return false;
  const seen = await SecureStore.getItemAsync(DEVICE_ONBOARDING_SEEN_KEY);
  return seen !== '1';
}

export async function markDeviceOnboardingSeen(): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_ONBOARDING_SEEN_KEY, '1');
}
