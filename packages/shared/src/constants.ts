export const API_PREFIX = '/api/v1';

export const JWT_ACCESS_EXPIRES = '15m';
export const JWT_REFRESH_EXPIRES = '7d';

export const RATE_LIMITS = {
  AUTH: { ttl: 60000, limit: 5 },
  UPLOAD: { ttl: 60000, limit: 10 },
  GENERAL: { ttl: 60000, limit: 100 },
} as const;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
