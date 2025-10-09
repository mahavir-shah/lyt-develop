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
    } as any
  }
};
export default config;
