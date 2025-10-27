import { getApps, initializeApp } from 'firebase/app';
import { Platform } from 'react-native';

// .env 혹은 app.json(extra)에서 읽어오세요
const firebaseConfig = {
  apiKey:        "AIzaSyBFSnQvIBByyrsmHsY3KbbINwYbV7wIYbA",
  authDomain:    "byulworks.firebaseapp.com",
  projectId:     "byulworks",
  storageBucket: "byulworks.firebasestorage.app",
  messagingSenderId: "2301088074",
  appId:         "1:2301088074:ios:1d2d29ec5ca3b14bf5b1b3",
};

const currentPlatform = Platform.OS;
if (currentPlatform === 'ios') {
  firebaseConfig.appId = '1:2301088074:ios:1d2d29ec5ca3b14bf5b1b3';
} else if (currentPlatform === 'android') {
  firebaseConfig.appId = '1:2301088074:android:1d2d29ec5ca3b14bf5b1b3';
}

// console.log(firebaseConfig);
console.log(getApps()[0]);

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);