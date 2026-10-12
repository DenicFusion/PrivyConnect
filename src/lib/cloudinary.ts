/**
 * Cloudinary Client Utilities
 * Handles image and media uploads via backend proxy or direct Cloudinary API.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export interface UploadResult {
  url: string;
  public_id: string;
  format?: string;
}

/**
 * Upload an image (File, Blob, or base64 data URI) to Cloudinary
 */
export async function uploadToCloudinary(
  fileOrData: File | Blob | string,
  folder: string = 'privyconnect/avatars'
): Promise<UploadResult> {
  // If string already URL and not base64, return it
  if (typeof fileOrData === 'string' && (fileOrData.startsWith('http://') || fileOrData.startsWith('https://'))) {
    return { url: fileOrData, public_id: 'external-url' };
  }

  // 1. If direct Cloudinary unsigned preset is available
  if (CLOUD_NAME && UPLOAD_PRESET) {
    try {
      const formData = new FormData();
      if (typeof fileOrData === 'string') {
        formData.append('file', fileOrData);
      } else {
        formData.append('file', fileOrData);
      }
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return {
          url: data.secure_url || data.url,
          public_id: data.public_id,
          format: data.format,
        };
      }
      console.warn('Direct Cloudinary upload failed, trying backend upload route...');
    } catch (err) {
      console.warn('Direct upload error:', err);
    }
  }

  // 2. Convert File/Blob to base64 if needed for backend upload
  let base64String = '';
  if (typeof fileOrData === 'string') {
    base64String = fileOrData;
  } else {
    base64String = await blobToBase64(fileOrData);
  }

  // 3. Upload via backend proxy (/api/upload-image)
  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64String,
        folder,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      url: data.url,
      public_id: data.public_id,
      format: data.format,
    };
  } catch (backendError: any) {
    console.error('Backend image upload error:', backendError);
    // If backend fails, fallback to local data URI so user UI does not crash
    return {
      url: base64String,
      public_id: `fallback-${Date.now()}`,
    };
  }
}

/**
 * Helper to convert Blob or File to Data URL
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
