import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../lib/firebase";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface UploadResult {
  url: string;
  path: string;
}

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG or WEBP images are allowed.";
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return `Image must be smaller than ${MAX_SIZE_MB} MB.`;
  return null;
}

/** Uploads an image to Firebase Storage under product-images/{uid}/{timestamp}-{name}. */
export async function uploadProductImage(file: File, adminUid: string): Promise<UploadResult> {
  const error = validateImage(file);
  if (error) throw new Error(error);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "");
  const path = `product-images/${adminUid}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  const url = await getDownloadURL(fileRef);
  return { url, path };
}
