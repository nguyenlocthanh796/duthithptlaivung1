import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

/**
 * Image component với fallback khi lỗi
 * Xử lý cả blob URLs (có thể hết hạn) và Firebase Storage URLs
 */
const ImageWithFallback = ({ src, alt, className, ...props }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra nếu là blob URL (có thể đã hết hạn)
  const isBlobUrl = src && src.startsWith('blob:');

  // Nếu là blob URL, đánh dấu lỗi ngay (không cần thử load vì chúng thường hết hạn sau reload)
  useEffect(() => {
    if (isBlobUrl) {
      // Blob URLs thường hết hạn sau khi reload trang
      // Đánh dấu lỗi ngay để hiển thị placeholder thay vì thử load
      setHasError(true);
      setIsLoading(false);
    }
  }, [isBlobUrl]);

  const handleError = () => {
    // Không log warning cho blob URLs (chúng ta đã biết chúng sẽ fail)
    // Chỉ log cho các URLs khác để debug
    if (!isBlobUrl) {
      // Chỉ log trong development mode
      if (import.meta.env.DEV) {
        console.warn('Image failed to load:', src);
      }
    }
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // Extract className và các props khác
  const { className: imgClassName, ...imgProps } = props;

  // Nếu là blob URL và đã có lỗi, hoặc không có src, hiển thị placeholder
  if (hasError || !src) {
    return (
      <div className={`${className || ''} bg-gray-200 flex items-center justify-center`}>
        <div className="text-center p-4">
          <ImageIcon className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-xs text-gray-500">Không thể tải ảnh</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-0">
          <ImageIcon className="text-gray-400" size={24} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className || ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity relative z-10`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        {...imgProps}
      />
      {isBlobUrl && !hasError && (
        <div className="absolute top-1 right-1 bg-yellow-500/80 text-white text-[10px] px-1.5 py-0.5 rounded z-20">
          Preview
        </div>
      )}
    </div>
  );
};

export default ImageWithFallback;

