import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2 Configuration
// These should be set in your environment variables
const R2_ACCOUNT_ID = process.env.VITE_R2_ACCOUNT_ID || import.meta.env.VITE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.VITE_R2_ACCESS_KEY_ID || import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.VITE_R2_SECRET_ACCESS_KEY || import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.VITE_R2_BUCKET_NAME || import.meta.env.VITE_R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL || import.meta.env.VITE_R2_PUBLIC_URL || ''; // Custom domain or R2 public URL

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export async function uploadToR2(file: File, path: string): Promise<string> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.warn("R2 storage not configured. Using mock upload.");
    return URL.createObjectURL(file);
  }

  const fileName = `${Date.now()}-${file.name}`;
  const fullPath = `${path}/${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fullPath,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
    });

    await s3Client.send(command);
    
    // Return the public URL
    return `${R2_PUBLIC_URL}/${fullPath}`;
  } catch (error: any) {
    console.error("Error uploading to R2:", error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error("This is likely a CORS issue. Please ensure your R2 bucket CORS policy allows this origin.");
    }
    throw error;
  }
}

export async function uploadBlobToR2(blob: Blob, path: string, fileName: string): Promise<string> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.warn("R2 storage not configured. Using mock upload.");
    return URL.createObjectURL(blob);
  }

  const fullPath = `${path}/${Date.now()}-${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fullPath,
      Body: new Uint8Array(await blob.arrayBuffer()),
      ContentType: blob.type,
    });

    await s3Client.send(command);
    
    // Return the public URL
    return `${R2_PUBLIC_URL}/${fullPath}`;
  } catch (error: any) {
    console.error("Error uploading blob to R2:", error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error("This is likely a CORS issue. Please ensure your R2 bucket CORS policy allows this origin.");
    }
    throw error;
  }
}
