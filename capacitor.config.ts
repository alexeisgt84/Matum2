import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.app.whatsappcatalog',
  appName: 'WA Catalog',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
