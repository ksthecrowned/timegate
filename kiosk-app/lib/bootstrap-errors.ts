import { LogBox } from "react-native";

/** Surface JS errors in Metro logcat (`ReactNativeJS`) during dev. */
export function installGlobalErrorLogging() {
  if (!__DEV__) return;

  LogBox.ignoreLogs([]);

  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error(
      `[TimeGateKiosk] ${isFatal ? "fatal" : "non-fatal"} JS error`,
      error?.message ?? error,
      error?.stack,
    );
    previousHandler?.(error, isFatal);
  });
}
