import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  console.log(`Cloudinary configured successfully for cloud: ${cloudName}`);
} else {
  console.warn('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) not fully set. Mock/fallback will be used.');
}

export { cloudinary, isConfigured as isCloudinaryConfigured };

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

export async function uploadToCloudinary(
  imageContent: string,
  options: CloudinaryUploadOptions = {}
): Promise<{ url: string; public_id: string; format?: string; bytes?: number }> {
  const { folder = 'privyconnect/uploads', publicId, resourceType = 'auto' } = options;

  if (!isConfigured) {
    // Graceful fallback if credentials not provided
    console.warn('Cloudinary not configured. Returning image as data URI or direct link.');
    return {
      url: imageContent,
      public_id: publicId || `mock-${Date.now()}`,
    };
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(imageContent, {
      folder,
      public_id: publicId,
      resource_type: resourceType,
      overwrite: true,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(error.message || 'Failed to upload image to Cloudinary');
  }
}
