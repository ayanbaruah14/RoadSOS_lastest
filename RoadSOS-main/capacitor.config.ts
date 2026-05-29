import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kshitij.roadsos',
  appName: 'RoadSOS',
  server: {
    url: 'https://YOUR-VERCEL-URL.vercel.app',
    cleartext: false
  }
};

export default config;
