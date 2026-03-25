import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

/**
 * Check for OTA updates on app launch.
 * This allows pushing JS-only fixes and features without
 * going through App Store review each time.
 *
 * HOW IT WORKS:
 * - On app open, checks Expo's update server
 * - If a new JS bundle is available, downloads in background
 * - Prompts user to restart to apply the update
 * - If offline or no update, does nothing (no crash)
 *
 * WHEN TO USE OTA vs APP STORE UPDATE:
 * - OTA: Bug fixes, UI tweaks, new screens, stat calculations
 * - App Store: New native modules, SDK upgrades, icon/splash changes
 */
export async function checkForUpdates(): Promise<void> {
  // Don't check in development mode
  if (__DEV__) return;

  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();

      Alert.alert(
        'Update Available',
        'A new version of Swish Stats is ready. Restart now to apply?',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Restart',
            onPress: () => Updates.reloadAsync(),
          },
        ]
      );
    }
  } catch (error) {
    // Silently fail — user can still use the app with the current version
    console.log('Update check failed:', error);
  }
}
