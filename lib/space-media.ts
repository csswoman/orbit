export const SPACE_IDENTITY_BUCKET = "orbit-canvas";

const ALLOWED_IMAGE_TYPES = /^image\/(avif|jpeg|png|webp)$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function isAllowedIdentityImage(file: File) {
  return ALLOWED_IMAGE_TYPES.test(file.type) && file.size <= MAX_IMAGE_BYTES;
}

export function spaceIconStoragePath(userId: string, spaceId: string, extension: string) {
  return `${userId}/space-identity/${spaceId}/icon.${extension}`;
}

export function spaceBackgroundStoragePath(userId: string, spaceId: string, extension: string) {
  return `${userId}/space-identity/${spaceId}/background.${extension}`;
}

export function normalizeBackgroundOverlay(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.55;
  return Math.min(1, Math.max(0, Math.round(number * 100) / 100));
}

export function isOwnedStoragePath(path: string, userId: string, spaceId: string) {
  return path.startsWith(`${userId}/space-identity/${spaceId}/`);
}
