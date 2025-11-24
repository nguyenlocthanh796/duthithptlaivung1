/**
 * Firebase Storage Service
 * Upload files directly to Firebase Storage from frontend
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase'
import { compressImage, isImageFile, getCompressionOptions } from '../utils/imageCompression'

/**
 * Upload file to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} folder - Folder path in storage (default: 'uploads')
 * @returns {Promise<{url: string, path: string}>} Public URL and storage path
 */
export async function uploadFile(file, folder = 'uploads') {
  try {
    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomId}.${fileExtension}`
    
    // Create storage reference
    const storageRef = ref(storage, `${folder}/${fileName}`)
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file)
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      fileName: fileName,
    }
  } catch (error) {
    console.error('Error uploading file to Firebase Storage:', error)
    throw new Error(`Không thể upload file: ${error.message}`)
  }
}

/**
 * Upload image to Firebase Storage with compression
 * @param {File} file - Image file
 * @param {boolean} compress - Whether to compress image (default: true)
 * @returns {Promise<string>} Public URL
 */
export async function uploadImage(file, compress = true) {
  let fileToUpload = file
  
  // Compress image if it's an image file and compression is enabled
  if (compress && isImageFile(file)) {
    try {
      const options = getCompressionOptions(file)
      fileToUpload = await compressImage(file, options)
      console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`)
    } catch (error) {
      console.warn('Image compression failed, uploading original:', error)
      // Continue with original file if compression fails
    }
  }
  
  const result = await uploadFile(fileToUpload, 'images')
  return result.url
}

/**
 * Upload document to Firebase Storage
 * @param {File} file - Document file (PDF, DOC, DOCX)
 * @returns {Promise<string>} Public URL
 */
export async function uploadDocument(file) {
  const result = await uploadFile(file, 'documents')
  return result.url
}

/**
 * Delete file from Firebase Storage
 * @param {string} path - Storage path of the file
 */
export async function deleteFile(path) {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Error deleting file from Firebase Storage:', error)
    throw new Error(`Không thể xóa file: ${error.message}`)
  }
}

