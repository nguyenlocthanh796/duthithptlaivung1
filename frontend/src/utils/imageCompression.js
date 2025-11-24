/**
 * Image Compression Utility
 * Compress images to reduce file size while maintaining good quality
 */

/**
 * Compress image file
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width (default: 1920)
 * @param {number} options.maxHeight - Maximum height (default: 1920)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 1)
 * @returns {Promise<File>} Compressed image file
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    maxSizeMB = 1,
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }
        
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Không thể nén ảnh'))
              return
            }
            
            // Check file size
            const fileSizeMB = blob.size / (1024 * 1024)
            
            if (fileSizeMB > maxSizeMB) {
              // If still too large, reduce quality further
              const newQuality = Math.max(0.1, quality * (maxSizeMB / fileSizeMB))
              canvas.toBlob(
                (finalBlob) => {
                  if (!finalBlob) {
                    reject(new Error('Không thể nén ảnh'))
                    return
                  }
                  const compressedFile = new File(
                    [finalBlob],
                    file.name,
                    { type: 'image/jpeg' } // Always convert to JPEG for better compression
                  )
                  resolve(compressedFile)
                },
                'image/jpeg',
                newQuality
              )
            } else {
              const compressedFile = new File(
                [blob],
                file.name,
                { type: 'image/jpeg' }
              )
              resolve(compressedFile)
            }
          },
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('Không thể đọc file ảnh'))
      }
      
      img.src = e.target.result
    }
    
    reader.onerror = () => {
      reject(new Error('Không thể đọc file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Check if file is an image
 * @param {File} file - File to check
 * @returns {boolean}
 */
export function isImageFile(file) {
  return file.type.startsWith('image/')
}

/**
 * Get optimal compression settings based on file size
 * @param {File} file - Image file
 * @returns {Object} Compression options
 */
export function getCompressionOptions(file) {
  const fileSizeMB = file.size / (1024 * 1024)
  
  if (fileSizeMB > 5) {
    // Large file: aggressive compression
    return {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.7,
      maxSizeMB: 0.8,
    }
  } else if (fileSizeMB > 2) {
    // Medium file: moderate compression
    return {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.75,
      maxSizeMB: 1,
    }
  } else {
    // Small file: light compression
    return {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.85,
      maxSizeMB: 1.5,
    }
  }
}

