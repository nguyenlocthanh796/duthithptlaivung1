import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config - có thể được inject từ window hoặc env variables
let firebaseConfig = null;
let app = null;
let auth = null;
let db = null;
let storage = null;

// Hàm kiểm tra config hợp lệ
const isValidConfig = (config) => {
  return config && 
         config.apiKey && 
         config.apiKey !== 'your-api-key' &&
         config.authDomain && 
         config.authDomain !== 'your-project.firebaseapp.com' &&
         config.projectId;
};

// Lấy config từ các nguồn
if (typeof window !== 'undefined' && window.__firebase_config) {
  // Config được inject từ HTML (production)
  try {
    firebaseConfig = typeof window.__firebase_config === 'string' 
      ? JSON.parse(window.__firebase_config) 
      : window.__firebase_config;
  } catch (e) {
    // Failed to parse config
  }
} else if (import.meta.env.VITE_FIREBASE_CONFIG) {
  // Config từ environment variables (development)
  try {
    firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
  } catch (e) {
    // Failed to parse config
  }
} else {
  // Default config từ Firebase Console
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  firebaseConfig = {
    apiKey: "AIzaSyB1trzVsu9VQGMUu2PygCUBmDIv3-WSMhQ",
    authDomain: "gen-lang-client-0581370080.firebaseapp.com",
    projectId: "gen-lang-client-0581370080",
    storageBucket: "gen-lang-client-0581370080.firebasestorage.app",
    messagingSenderId: "626004693464",
    appId: "1:626004693464:web:d7e28f4a86f784bb29a2ad",
    measurementId: "G-ERHJE0DM3L"
  };
}

// Chỉ khởi tạo Firebase nếu config hợp lệ
if (isValidConfig(firebaseConfig)) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    // Đảm bảo set về null nếu lỗi
    auth = null;
    db = null;
    storage = null;
    app = null;
  }
} else {
  // Đảm bảo set về null nếu config không hợp lệ
  auth = null;
  db = null;
  storage = null;
  app = null;
}

export { auth, db, storage };
export const appId = typeof window !== 'undefined' && window.__app_id 
  ? window.__app_id 
  : import.meta.env.VITE_APP_ID || 'default-app-id';
