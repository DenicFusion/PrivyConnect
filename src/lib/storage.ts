import { uploadToCloudinary } from "./cloudinary";

/**
 * Storage adapter configured to use Cloudinary for all image and file uploads
 */
export async function uploadToR2(file: File, path: string): Promise<string> {
  try {
    const result = await uploadToCloudinary(file, path);
    return result.url;
  } catch (error: any) {
    console.error("Error uploading to Cloudinary:", error);
    return URL.createObjectURL(file);
  }
}

export async function uploadBlobToR2(blob: Blob, path: string, _fileName: string): Promise<string> {
  try {
    const result = await uploadToCloudinary(blob, path);
    return result.url;
  } catch (error: any) {
    console.error("Error uploading blob to Cloudinary:", error);
    return URL.createObjectURL(blob);
  }
}
