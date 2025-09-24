import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lytdevelop',
  appName: 'lyt-develop',
  webDir: 'www',
  server: {
    cleartext: true
  },
  plugins: {
    App: {
      urlSchemes: ['lyt-develop'] // You can use any unique name here
    }
  }
};
export default config;
