/**
 * Utility functions for optimizing Cloudinary and external image URLs.
 * Automatically injects responsive dimensions, modern formats (WebP/AVIF),
 * and automatic quality compression parameters.
 */

export const optimizeCloudinaryImage = (url, { width = 120, height, crop = 'fill', gravity = 'face', quality = 'auto' } = {}) => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/w_')) {
      return url;
    }
    const params = [
      'f_auto',
      `q_${quality}`,
      width ? `w_${width}` : null,
      height ? `h_${height}` : (crop === 'fill' ? `h_${width}` : null),
      crop ? `c_${crop}` : null,
      gravity ? `g_${gravity}` : null
    ].filter(Boolean).join(',');

    return url.replace('/image/upload/', `/image/upload/${params}/`);
  }
  return url;
};

export const optimizeAvatar = (url, size = 120) => {
  return optimizeCloudinaryImage(url, { width: size, height: size, crop: 'fill', gravity: 'face', quality: 'auto' });
};

export default {
  optimizeCloudinaryImage,
  optimizeAvatar
};
