import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_CREDENTIALS_KEY = "biometric_login_credentials";

type BiometricCredentials = {
  email: string;
  password: string;
};

export async function isBiometricLoginAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function authenticateBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Authentifiez-vous pour continuer",
    cancelLabel: "Annuler",
    fallbackLabel: "Utiliser le code",
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function getStoredBiometricCredentials(): Promise<BiometricCredentials | null> {
  const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BiometricCredentials;
    if (!parsed.email || !parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveBiometricCredentials(params: BiometricCredentials): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(params));
}

export async function clearBiometricCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
}
