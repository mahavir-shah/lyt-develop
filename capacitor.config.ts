import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lytcontrol',
  appName: 'lyt-control',
  webDir: 'www',
  server: {
    cleartext: true
  },
  plugins: {
    App: {
      urlSchemes: ['lyt'] // You can use any unique name here
    } as any,
    BluetoothLe: {
      // This is important for Android 12+
      displayStrings: {
        scanning: "Scanning for devices...",
        cancel: "Cancel",
        availableDevices: "Available Devices",
        noDeviceFound: "No device found"
      }
    }
  },
  android: {
    // Allow clear text traffic for debugging
    allowMixedContent: true
  }
};
export default config;
