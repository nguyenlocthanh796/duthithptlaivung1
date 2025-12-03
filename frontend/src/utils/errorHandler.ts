/**
 * Centralized error handling utilities
 */
export interface APIError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export const handleAPIError = (error: any): string => {
  // Check if it's a standardized error response
  if (error.error && error.error.message) {
    return error.error.message;
  }

  // Check if it's an Error object with status
  if (error.status) {
    switch (error.status) {
      case 401:
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      case 403:
        return 'Bạn không có quyền thực hiện hành động này.';
      case 404:
        return 'Không tìm thấy tài nguyên yêu cầu.';
      case 429:
        return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
      case 500:
      case 502:
      case 503:
        return 'Lỗi máy chủ. Vui lòng thử lại sau.';
      default:
        return error.message || 'Đã xảy ra lỗi không xác định.';
    }
  }

  // Fallback to error message
  return error.message || 'Đã xảy ra lỗi không xác định.';
};

export const isNetworkError = (error: any): boolean => {
  return (
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('Failed to fetch')
  );
};

export const shouldRetry = (error: any): boolean => {
  if (!error.status) return false;
  // Retry on 5xx errors and 429 (rate limit)
  return error.status >= 500 || error.status === 429;
};

