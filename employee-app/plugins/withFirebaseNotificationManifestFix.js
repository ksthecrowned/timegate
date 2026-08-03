const { withAndroidManifest } = require('expo/config-plugins');

/**
 * expo-notifications and @react-native-firebase/messaging both declare
 * com.google.firebase.messaging.default_notification_color / _icon.
 * Prefer the Expo values (teal icon color) via tools:replace.
 */
function withFirebaseNotificationManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.$) manifest.$ = {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const app = manifest.application?.[0];
    if (!app) return config;

    const names = new Set([
      'com.google.firebase.messaging.default_notification_color',
      'com.google.firebase.messaging.default_notification_icon',
    ]);

    for (const item of app['meta-data'] ?? []) {
      const name = item.$?.['android:name'];
      if (name && names.has(name)) {
        item.$['tools:replace'] = 'android:resource';
      }
    }

    return config;
  });
}

module.exports = withFirebaseNotificationManifestFix;
