import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../lib/firebase";
import type { ProductDocument } from "../types/product";
import { mapProduct } from "./mappers";

export type AdminProductListItem = ReturnType<typeof mapProduct>;

/** Fetches all products for admin listing. Scales to ~1k docs via the limit. */
export async function fetchAdminProducts(max = 1000): Promise<AdminProductListItem[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.products), orderBy("created_time", "desc"), limit(max)),
  );
  return snap.docs.map(mapProduct);
}

/** Fetches a single product by document ID. */
export async function fetchAdminProductById(id: string): Promise<AdminProductListItem | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.products, id));
  return snap.exists() ? mapProduct(snap) : null;
}

export interface ProductFormData {
  productName: string;
  brandName: string;
  category: string;
  subCategory: string;
  productType: string;
  price: number;
  discountPercent: number;
  availableStock: number;
  totalStock: number;
  soldQuantity: number;
  ratings: number;
  productDetails: string;
  description: string;
  whatsInTheBox: string;
  tags: string;
  promotionalTags: string;
  images: string[];
  sponsored: boolean;
  visible: boolean;
}

function parseTags(input: string): string[] {
  return input
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function toDocument(data: ProductFormData, existing?: ProductDocument): ProductDocument {
  const price = Math.max(0, Math.round(data.price));
  const discount = Math.max(0, Math.min(100, data.discountPercent));
  const available = Math.max(0, Math.round(data.availableStock));
  const total = Math.max(0, Math.round(data.totalStock));
  const sold = Math.max(0, Math.round(data.soldQuantity));
  const ratings = Math.max(0, Math.min(5, data.ratings));
  const id = existing?.productId ?? `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    productId: id,
    productName: data.productName.trim(),
    brandName: data.brandName.trim() || existing?.brandName,
    category: data.category.trim(),
    subCategory: data.subCategory.trim() || data.category.trim(),
    productType: data.productType.trim() || data.category.trim(),
    price,
    discountPercent: discount,
    availableStock: available,
    totalStock: Math.max(total, available),
    soldQuantity: sold,
    ratings,
    productDetails: data.productDetails.trim(),
    description: data.description
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean),
    whatsInTheBox: data.whatsInTheBox
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean),
    tags: parseTags(data.tags),
    promotionalTags: parseTags(data.promotionalTags),
    images: data.images.filter(Boolean),
    descriptionImgs: data.images.filter(Boolean),
    sponsored: data.sponsored,
    visible: data.visible,
    display: data.visible,
    harmful: false,
    source: "admin-panel",
  };
}

/** Creates a new product document. */
export async function createProduct(data: ProductFormData): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS.products));
  const payload: ProductDocument = {
    ...toDocument(data),
    created_time: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return ref.id;
}

/** Updates an existing product document. */
export async function updateProduct(id: string, data: ProductFormData): Promise<void> {
  const existingSnap = await getDoc(doc(db, COLLECTIONS.products, id));
  const existing = existingSnap.exists() ? (existingSnap.data() as ProductDocument) : undefined;
  const payload = toDocument(data, existing);
  await updateDoc(doc(db, COLLECTIONS.products, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/** Deletes a product document. */
export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.products, id));
}

export function emptyForm(): ProductFormData {
  return {
    productName: "",
    brandName: "",
    category: "",
    subCategory: "",
    productType: "",
    price: 0,
    discountPercent: 0,
    availableStock: 0,
    totalStock: 0,
    soldQuantity: 0,
    ratings: 0,
    productDetails: "",
    description: "",
    whatsInTheBox: "",
    tags: "",
    promotionalTags: "",
    images: [],
    sponsored: false,
    visible: true,
  };
}

export function productToForm(product: AdminProductListItem): ProductFormData {
  return {
    productName: product.name,
    brandName: product.brand ?? "",
    category: product.category,
    subCategory: product.subCategory ?? "",
    productType: product.productType ?? "",
    price: product.price,
    discountPercent: product.discountPercent,
    availableStock: product.availableStock,
    totalStock: product.totalStock,
    soldQuantity: product.soldQuantity,
    ratings: product.rating,
    productDetails: product.details ?? "",
    description: product.descriptionParagraphs.join("\n"),
    whatsInTheBox: product.whatsInTheBox.join("\n"),
    tags: product.tags.join(", "),
    promotionalTags: product.promotionalTags.join(", "),
    images: [...product.images].filter((img) => !img.startsWith("data:image/svg")),
    sponsored: product.sponsored,
    visible: product.visible,
  };
}
