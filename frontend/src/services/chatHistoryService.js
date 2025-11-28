import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'aiChatHistory';
const EXPIRY_HOURS = 24;
const STORAGE_KEY = 'ai_chat_history';
const STORAGE_EXPIRY_KEY = 'ai_chat_history_expiry';

// Helper: Lưu vào localStorage như fallback
const saveToLocalStorage = (userId, message) => {
  try {
    const key = `${STORAGE_KEY}_${userId}`;
    const expiryKey = `${STORAGE_EXPIRY_KEY}_${userId}`;
    
    // Load existing messages
    const existing = localStorage.getItem(key);
    const messages = existing ? JSON.parse(existing) : [];
    
    // Add new message
    messages.push({
      id: message.id || Date.now(),
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString()
    });
    
    // Keep only last 50 messages
    const trimmed = messages.slice(-50);
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(trimmed));
    localStorage.setItem(expiryKey, Date.now().toString());
  } catch (error) {
    // Silent fail for localStorage
  }
};

// Helper: Load từ localStorage
const loadFromLocalStorage = (userId) => {
  try {
    const key = `${STORAGE_KEY}_${userId}`;
    const expiryKey = `${STORAGE_EXPIRY_KEY}_${userId}`;
    
    const messagesJson = localStorage.getItem(key);
    const expiryTime = localStorage.getItem(expiryKey);
    
    if (!messagesJson) return [];
    
    // Check if expired (24 hours)
    if (expiryTime) {
      const expiry = parseInt(expiryTime) + (EXPIRY_HOURS * 60 * 60 * 1000);
      if (Date.now() > expiry) {
        localStorage.removeItem(key);
        localStorage.removeItem(expiryKey);
        return [];
      }
    }
    
    const messages = JSON.parse(messagesJson);
    return messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
    }));
  } catch (error) {
    return [];
  }
};

// Helper: Cleanup localStorage
const cleanupLocalStorage = (userId) => {
  try {
    const key = `${STORAGE_KEY}_${userId}`;
    const expiryKey = `${STORAGE_EXPIRY_KEY}_${userId}`;
    const expiryTime = localStorage.getItem(expiryKey);
    
    if (expiryTime) {
      const expiry = parseInt(expiryTime) + (EXPIRY_HOURS * 60 * 60 * 1000);
      if (Date.now() > expiry) {
        localStorage.removeItem(key);
        localStorage.removeItem(expiryKey);
      }
    }
  } catch (error) {
    // Silent fail
  }
};

/**
 * Lưu một message vào lịch sử chat
 */
export const saveMessage = async (userId, message, appId = 'default-app-id') => {
  if (!userId) return null;

  // Try Firestore first
  if (db) {
    try {
      const chatHistoryRef = collection(
        db, 
        'artifacts', 
        appId, 
        'public', 
        'data', 
        COLLECTION_NAME
      );

      const messageData = {
        userId,
        role: message.role,
        content: message.content,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        // Tự động xóa sau 24 giờ (Firestore sẽ tự động xóa nếu có TTL policy)
        expiresAt: Timestamp.fromDate(new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000))
      };

      const docRef = await addDoc(chatHistoryRef, messageData);
      
      // Also save to localStorage as backup
      saveToLocalStorage(userId, message);
      
      return docRef.id;
    } catch (error) {
      // If Firestore fails (ERR_BLOCKED_BY_CLIENT, permission denied, etc.), use localStorage
      const errorMessage = error.message || '';
      const isBlocked = errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
                       errorMessage.includes('blocked') ||
                       error.code === 'permission-denied' ||
                       error.code === 'PERMISSION_DENIED';
      
      if (isBlocked) {
        // Fallback to localStorage
        saveToLocalStorage(userId, message);
        return 'local_storage';
      }
      
      // For other errors, still try localStorage
      saveToLocalStorage(userId, message);
      return null;
    }
  } else {
    // No Firestore, use localStorage
    saveToLocalStorage(userId, message);
    return 'local_storage';
  }
};

/**
 * Lưu toàn bộ conversation
 */
export const saveConversation = async (userId, messages, appId = 'default-app-id') => {
  if (!db || !userId || !messages || messages.length === 0) return;

  try {
    // Xóa lịch sử cũ trước khi lưu mới
    await cleanupExpiredMessages(userId, appId);

    // Lưu từng message
    const savePromises = messages
      .filter(msg => msg.role !== 'system' && msg.content) // Không lưu system messages
      .map(msg => saveMessage(userId, msg, appId));

    await Promise.all(savePromises);
  } catch (error) {
    // Silent fail
    if (error.code !== 'permission-denied' && error.code !== 'PERMISSION_DENIED') {
      console.warn('Lỗi khi lưu conversation:', error.message);
    }
  }
};

/**
 * Load lịch sử chat của user
 */
export const loadChatHistory = async (userId, appId = 'default-app-id', limitCount = 50) => {
  if (!userId) return [];

  // Try Firestore first
  if (db) {
    try {
      const chatHistoryRef = collection(
        db, 
        'artifacts', 
        appId, 
        'public', 
        'data', 
        COLLECTION_NAME
      );

      // Query messages của user, sắp xếp theo thời gian, giới hạn số lượng
      const q = query(
        chatHistoryRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const messages = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Chỉ lấy messages chưa hết hạn (trong 24 giờ)
        const expiresAt = data.expiresAt?.toDate();
        const now = new Date();
        
        if (!expiresAt || expiresAt > now) {
          messages.push({
            id: doc.id,
            role: data.role || 'ai',
            content: data.content || '',
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        }
      });

      // Sắp xếp lại theo thời gian tăng dần (cũ nhất trước)
      const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
      
      // If we got messages from Firestore, return them
      if (sorted.length > 0) {
        return sorted;
      }
      
      // If no Firestore messages, try localStorage
      return loadFromLocalStorage(userId);
    } catch (error) {
      // If Firestore fails, fallback to localStorage
      const errorMessage = error.message || '';
      const isBlocked = errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
                       errorMessage.includes('blocked') ||
                       error.code === 'permission-denied' ||
                       error.code === 'PERMISSION_DENIED';
      
      if (isBlocked || error.code === 'unavailable') {
        // Fallback to localStorage
        return loadFromLocalStorage(userId);
      }
      
      // For other errors, try localStorage as fallback
      return loadFromLocalStorage(userId);
    }
  } else {
    // No Firestore, use localStorage
    return loadFromLocalStorage(userId);
  }
};

/**
 * Xóa messages đã hết hạn (cũ hơn 24 giờ)
 */
export const cleanupExpiredMessages = async (userId, appId = 'default-app-id') => {
  if (!userId) return;

  // Cleanup localStorage first
  cleanupLocalStorage(userId);

  // Try Firestore cleanup
  if (db) {
    try {
      const chatHistoryRef = collection(
        db, 
        'artifacts', 
        appId, 
        'public', 
        'data', 
        COLLECTION_NAME
      );

      const now = Timestamp.now();
      const expiryTime = Timestamp.fromDate(new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000));

      // Query messages cũ hơn 24 giờ
      const q = query(
        chatHistoryRef,
        where('userId', '==', userId),
        where('timestamp', '<', expiryTime)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = [];

      querySnapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(chatHistoryRef, docSnapshot.id)));
      });

      await Promise.all(deletePromises);
    } catch (error) {
      // Silent fail - localStorage already cleaned up
    }
  }
};

/**
 * Xóa toàn bộ lịch sử chat của user
 */
export const clearChatHistory = async (userId, appId = 'default-app-id') => {
  if (!db || !userId) return;

  try {
    const chatHistoryRef = collection(
      db, 
      'artifacts', 
      appId, 
      'public', 
      'data', 
      COLLECTION_NAME
    );

    const q = query(
      chatHistoryRef,
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const deletePromises = [];

    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(chatHistoryRef, docSnapshot.id)));
    });

    await Promise.all(deletePromises);
  } catch (error) {
    // Silent fail
    if (error.code !== 'permission-denied' && error.code !== 'PERMISSION_DENIED') {
      console.warn('Lỗi khi xóa chat history:', error.message);
    }
  }
};

