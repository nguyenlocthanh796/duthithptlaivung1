export const timeAgo = (date) => {
  if (!date) return 'Vừa xong';

  let dateObj;
  // Kiểm tra nếu là Firestore Timestamp (có hàm toDate)
  if (date && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    // Thử parse từ string/number
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) return 'Vừa xong';

  const seconds = Math.floor((new Date() - dateObj) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
};

export const parseAIJSON = (text) => {
  if (!text) return null;
  let cleanText = text.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    try {
      return JSON.parse(cleanText.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"));
    } catch (e2) {
      return null;
    }
  }
};

/**
 * Nén ảnh với chất lượng cao, dung lượng thấp
 * @param {File} file - File ảnh cần nén
 * @param {number} maxWidth - Chiều rộng tối đa (mặc định 1920px)
 * @param {number} maxHeight - Chiều cao tối đa (mặc định 1920px)
 * @param {number} quality - Chất lượng (0.0 - 1.0, mặc định 0.85)
 * @param {number} maxSizeMB - Dung lượng tối đa (MB, mặc định 1MB)
 * @returns {Promise<File>} - File ảnh đã nén
 */
export const compressImage = async (file, maxWidth = 1920, maxHeight = 1920, quality = 0.85, maxSizeMB = 1) => {
  return new Promise((resolve, reject) => {
    // Kiểm tra nếu không phải file ảnh
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    // Kiểm tra nếu file đã nhỏ hơn maxSizeMB
    if (file.size / (1024 * 1024) < maxSizeMB) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Tính toán kích thước mới giữ nguyên tỷ lệ
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Tạo canvas để vẽ lại ảnh
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Vẽ ảnh với chất lượng cao
        ctx.drawImage(img, 0, 0, width, height);

        // Chuyển đổi sang blob với chất lượng tối ưu
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Không thể nén ảnh'));
              return;
            }

            // Nếu vẫn còn lớn, giảm quality và thử lại
            if (blob.size / (1024 * 1024) > maxSizeMB && quality > 0.5) {
              compressImage(file, maxWidth, maxHeight, quality - 0.1, maxSizeMB)
                .then(resolve)
                .catch(reject);
              return;
            }

            // Tạo File object từ blob
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Lỗi khi tải ảnh'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc file'));
    };

    reader.readAsDataURL(file);
  });
};

