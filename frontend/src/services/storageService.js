import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, appId as defaultAppId } from './firebase';

/**
 * Upload một file ảnh lên Firebase Storage
 * @param {File|Blob} file - File ảnh cần upload
 * @param {string} userId - ID của user đang upload
 * @param {string} appId - App ID (optional)
 * @returns {Promise<string>} - URL của ảnh sau khi upload
 */
export const uploadImage = async (file, userId, appId = defaultAppId) => {
  if (!storage) {
    throw new Error('Firebase Storage chưa được khởi tạo');
  }

  if (!file) {
    throw new Error('File không hợp lệ');
  }

  // Tạo path: artifacts/{appId}/public/uploads/{userId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const filename = file.name || `image-${timestamp}.jpg`;
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `artifacts/${appId}/public/uploads/${userId}/${timestamp}-${sanitizedFilename}`;
  
  console.log('📤 Uploading image:', {
    path: storagePath,
    size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    type: file.type
  });

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('✅ Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};

/**
 * Upload nhiều ảnh cùng lúc
 * @param {File[]|Blob[]} files - Mảng các file ảnh
 * @param {string} userId - ID của user đang upload
 * @param {string} appId - App ID (optional)
 * @returns {Promise<string[]>} - Mảng các URL của ảnh
 */
export const uploadMultipleImages = async (files, userId, appId = defaultAppId) => {
  if (!files || files.length === 0) {
    return [];
  }

  console.log(`📤 Uploading ${files.length} images...`);
  
  try {
    const uploadPromises = files.map(file => uploadImage(file, userId, appId));
    const urls = await Promise.all(uploadPromises);
    console.log(`✅ Successfully uploaded ${urls.length} images`);
    return urls;
  } catch (error) {
    console.error('❌ Error uploading multiple images:', error);
    throw error;
  }
};

