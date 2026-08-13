import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pindo.app',
  appName: 'Pindo',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
