import { APP_CONFIG } from '../config';
import { storage as firebaseStorage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { supabase } from './supabase';

// Cloudflare CDN URL (e.g., https://cdn.yourdomain.com)
const CLOUDFLARE_CDN_URL = import.meta.env.VITE_CLOUDFLARE_CDN_URL || '';

export async function uploadToStorage(file: File | Blob, path: string, fileName?: string): Promise<string> {
  const name = fileName || (file instanceof File ? file.name : `file-${Date.now()}`);
  const fullPath = `${path}/${Date.now()}-${name}`;

  let rawUrl = '';

  if (APP_CONFIG.storageMode === 'firebase+cloudflare') {
    const storageRef = ref(firebaseStorage, fullPath);
    await uploadBytes(storageRef, file);
    rawUrl = await getDownloadURL(storageRef);
  } else {
    // Supabase Storage
    const { data, error } = await supabase.storage
      .from('media') // Assuming 'media' is the default bucket
      .upload(fullPath, file);
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(fullPath);
      
    rawUrl = publicUrl;
  }

  // If Cloudflare CDN is configured, replace the base URL
  if (CLOUDFLARE_CDN_URL) {
    try {
      const urlObj = new URL(rawUrl);
      return `${CLOUDFLARE_CDN_URL}${urlObj.pathname}${urlObj.search}`;
    } catch (e) {
      return rawUrl;
    }
  }

  return rawUrl;
}

// Keep old function names for backward compatibility
export async function uploadToR2(file: File, path: string): Promise<string> {
  return uploadToStorage(file, path);
}

export async function uploadBlobToR2(blob: Blob, path: string, fileName: string): Promise<string> {
  return uploadToStorage(blob, path, fileName);
}
