import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId as defaultAppId } from './firebase';

/**
 * Tạo thông báo mới
 * @param {string} userId - ID của user nhận thông báo
 * @param {string} type - Loại thông báo: 'like', 'comment', 'follow', 'ai', 'system'
 * @param {string} title - Tiêu đề thông báo
 * @param {string} message - Nội dung thông báo
 * @param {object} data - Dữ liệu bổ sung (link, postId, etc.)
 * @param {string} customAppId - App ID tùy chỉnh (optional)
 */
export const createNotification = async (userId, type, title, message = '', data = {}, customAppId = null) => {
  if (!db || !userId) {
    return null;
  }

  const currentAppId = customAppId || defaultAppId;
  const notificationsPath = `artifacts/${currentAppId}/public/data/notifications`;

  try {
    const notificationRef = await addDoc(collection(db, notificationsPath), {
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return notificationRef.id;
  } catch (error) {
    return null;
  }
};

/**
 * Tạo thông báo khi có người like bài viết
 */
export const notifyPostLiked = async (postAuthorId, likerName, postId, postText = '') => {
  return createNotification(
    postAuthorId,
    'like',
    `${likerName} đã thích bài viết của bạn`,
    postText ? `"${postText.substring(0, 50)}${postText.length > 50 ? '...' : ''}"` : '',
    { postId, action: 'view_post' }
  );
};

/**
 * Tạo thông báo khi có người comment bài viết
 */
export const notifyPostCommented = async (postAuthorId, commenterName, postId, commentText = '') => {
  return createNotification(
    postAuthorId,
    'comment',
    `${commenterName} đã bình luận bài viết của bạn`,
    commentText ? `"${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"` : '',
    { postId, action: 'view_post' }
  );
};

/**
 * Tạo thông báo khi có người follow
 */
export const notifyNewFollower = async (userId, followerName) => {
  return createNotification(
    userId,
    'follow',
    `${followerName} đã theo dõi bạn`,
    '',
    { action: 'view_profile' }
  );
};

/**
 * Tạo thông báo từ AI
 */
export const notifyAIResponse = async (userId, title, message) => {
  return createNotification(
    userId,
    'ai',
    title,
    message,
    { action: 'open_ai_chat' }
  );
};

/**
 * Tạo thông báo hệ thống
 */
export const notifySystem = async (userId, title, message, data = {}) => {
  return createNotification(
    userId,
    'system',
    title,
    message,
    data
  );
};

