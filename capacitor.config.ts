import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.app.whatsappcatalog',
  appName: 'Matum',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
