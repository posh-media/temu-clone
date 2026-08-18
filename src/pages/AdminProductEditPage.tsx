import { ArrowLeft, GripVertical, ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useMatch, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "../components/ui/Field";
import { SmartImage } from "../components/ui/SmartImage";
import { formatPrice } from "../lib/format";
import { cn } from "../lib/utils";
import {
  createProduct,
  emptyForm,
  fetchAdminProductById,
  productToForm,
  updateProduct,
  type ProductFormData,
} from "../services/adminProducts";
import { uploadProductImage } from "../services/adminStorage";
import { logAdminAction } from "../services/audit";
import { useAuth } from "../store/AuthProvider";

const CATEGORY_CHOICES = [
  "Electronics",
  "Fashion",
  "Home",
  "Women",
  "Men",
  "Toys",
  "Beauty",
  "Sports & Outdoors",
  "Automotive",
  "Gadgets",
  "Bags",
  "Shoes",
  "Jewelry & Accessories",
  "Phone & Accessories",
  "Computer Accessories",
  "Office & School",
  "Home & Kitchen",
  "Tools",
  "Speaker",
];

export default function AdminProductEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const isNewRoute = useMatch("/admin/products/new");
  const isNew = Boolean(isNewRoute) || productId === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["admin", "product", productId || ""],
    queryFn: () => fetchAdminProductById(productId!),
    enabled: !isNew && Boolean(productId),
    staleTime: 60 * 1000,
  });

  const initial = useMemo(() => {
    if (isNew) return emptyForm();
    if (!existing) return emptyForm();
    return productToForm(existing);
  }, [existing, isNew]);

  const [form, setForm] = useState<ProductFormData>(initial);

  useEffect(() => {
    if (isNew) setForm(emptyForm());
    else if (existing) setForm(productToForm(existing));
  }, [existing, isNew]);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isNew && isLoading) {
    return (
      <div className="rounded-card bg-white p-8 text-center text-ink-3">Loading product...</div>
    );
  }

  function setField<K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.productName.trim()) next.productName = "Product name is required.";
    if (!form.category) next.category = "Category is required.";
    if (form.price < 0) next.price = "Price cannot be negative.";
    if (form.discountPercent < 0 || form.discountPercent > 100) next.discountPercent = "Discount must be 0-100.";
    if (form.availableStock < 0) next.availableStock = "Available stock cannot be negative.";
    if (form.totalStock < 0) next.totalStock = "Total stock cannot be negative.";
    if (form.totalStock < form.availableStock) next.totalStock = "Total stock cannot be less than available stock.";
    if (form.soldQuantity < 0) next.soldQuantity = "Sold quantity cannot be negative.";
    if (form.ratings < 0 || form.ratings > 5) next.ratings = "Rating must be 0-5.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadProductImage(file, user!.uid);
        urls.push(result.url);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      setMessage({ type: "success", text: `${urls.length} image${urls.length === 1 ? "" : "s"} uploaded.` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Image upload failed." });
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setForm((prev) => {
      const arr = [...prev.images];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return prev;
      const [moved] = arr.splice(index, 1);
      arr.splice(target, 0, moved);
      return { ...prev, images: arr };
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setMessage(null);
    try {
      if (isNew) {
        const id = await createProduct(form);
        await logAdminAction({
          adminUid: user!.uid,
          adminEmail: user!.email,
          action: "PRODUCT_CREATED",
          targetType: "product",
          targetId: id,
          after: { name: form.productName, category: form.category, price: form.price },
        });
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        queryClient.invalidateQueries({ queryKey: ["catalogue"] });
        navigate("/admin/products", { state: { message: `Product created: ${id}` } });
      } else {
        await updateProduct(productId!, form);
        await logAdminAction({
          adminUid: user!.uid,
          adminEmail: user!.email,
          action: "PRODUCT_UPDATED",
          targetType: "product",
          targetId: productId!,
        });
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "product", productId!] });
        queryClient.invalidateQueries({ queryKey: ["catalogue"] });
        setMessage({ type: "success", text: "Product saved successfully." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save product." });
    } finally {
      setSaving(false);
    }
  }

  const listPrice = form.discountPercent > 0 ? form.price / (1 - form.discountPercent / 100) : form.price;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link to="/admin/products" className="rounded p-1 text-ink-3 hover:bg-surface-muted hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-ink">{isNew ? "Add product" : "Edit product"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/products")}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>{isNew ? "Create product" : "Save changes"}</Button>
        </div>
      </div>

      {message && (
        <div className={cn(
          "rounded-card px-4 py-3 text-md",
          message.type === "success" ? "bg-trust/10 text-trust" : "bg-deal/10 text-deal"
        )}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4 rounded-card bg-white p-4 shadow-card">
          <h2 className="text-lg font-bold">Basic information</h2>
          <Input
            label="Product name"
            required
            value={form.productName}
            onChange={(e) => setField("productName", e.target.value)}
            error={errors.productName}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Brand name"
              value={form.brandName}
              onChange={(e) => setField("brandName", e.target.value)}
            />
            <Select
              label="Category"
              required
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              error={errors.category}
            >
              <option value="">Select category</option>
              {CATEGORY_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input
              label="Sub-category"
              value={form.subCategory}
              onChange={(e) => setField("subCategory", e.target.value)}
            />
            <Input
              label="Product type"
              value={form.productType}
              onChange={(e) => setField("productType", e.target.value)}
            />
          </div>

          <h2 className="pt-2 text-lg font-bold">Pricing & stock</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Price (₦)"
              type="number"
              min={0}
              required
              value={form.price}
              onChange={(e) => setField("price", Number(e.target.value))}
              error={errors.price}
            />
            <Input
              label="Discount %"
              type="number"
              min={0}
              max={100}
              value={form.discountPercent}
              onChange={(e) => setField("discountPercent", Number(e.target.value))}
              error={errors.discountPercent}
            />
            <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
              <span className="text-ink-3">List price</span>
              <p className="font-semibold text-ink">{formatPrice(listPrice)}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Available stock"
              type="number"
              min={0}
              value={form.availableStock}
              onChange={(e) => setField("availableStock", Number(e.target.value))}
              error={errors.availableStock}
            />
            <Input
              label="Total stock"
              type="number"
              min={0}
              value={form.totalStock}
              onChange={(e) => setField("totalStock", Number(e.target.value))}
              error={errors.totalStock}
            />
            <Input
              label="Sold quantity"
              type="number"
              min={0}
              value={form.soldQuantity}
              onChange={(e) => setField("soldQuantity", Number(e.target.value))}
              error={errors.soldQuantity}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Rating (0-5)"
              type="number"
              min={0}
              max={5}
              step="0.1"
              value={form.ratings}
              onChange={(e) => setField("ratings", Number(e.target.value))}
              error={errors.ratings}
            />
          </div>

          <h2 className="pt-2 text-lg font-bold">Details</h2>
          <Textarea
            label="Product details / description"
            value={form.productDetails}
            onChange={(e) => setField("productDetails", e.target.value)}
            hint="Short overview shown on the product page."
          />
          <Textarea
            label="Description paragraphs"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            hint="One paragraph per line."
          />
          <Textarea
            label="What's in the box"
            value={form.whatsInTheBox}
            onChange={(e) => setField("whatsInTheBox", e.target.value)}
            hint="One item per line."
          />
          <Input
            label="Tags"
            value={form.tags}
            onChange={(e) => setField("tags", e.target.value)}
            hint="Comma-separated search tags."
          />
          <Input
            label="Promotional tags"
            value={form.promotionalTags}
            onChange={(e) => setField("promotionalTags", e.target.value)}
            hint="e.g. flash-sale, Limited Offer"
          />
          <div className="flex flex-wrap gap-6 pt-2">
            <Checkbox
              label="Sponsored product"
              checked={form.sponsored}
              onChange={(checked) => setField("sponsored", checked)}
            />
            <Checkbox
              label="Visible to public"
              checked={form.visible}
              onChange={(checked) => setField("visible", checked)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-card bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold">Images</h2>
            <p className="mb-3 text-sm text-ink-3">First image is the primary image. Drag is not supported; use arrows to reorder.</p>
            {form.images.length === 0 ? (
              <div className="mb-3 rounded-lg border-2 border-dashed border-line p-6 text-center text-ink-3">
                <ImagePlus className="mx-auto mb-2 h-8 w-8" />
                No images added yet.
              </div>
            ) : (
              <ul className="mb-3 space-y-2">
                {form.images.map((url, i) => (
                  <li key={`${url}-${i}`} className="flex items-center gap-2 rounded-lg border border-line p-2">
                    <SmartImage src={url} alt="" wrapperClassName="h-14 w-14 shrink-0 rounded bg-surface-sunken" />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-3">{url}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-3 hover:bg-surface-muted disabled:opacity-40">
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </button>
                      <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="rounded p-1 text-ink-3 hover:bg-surface-muted disabled:opacity-40">
                        <GripVertical className="h-4 w-4 -rotate-90" />
                      </button>
                      <button type="button" onClick={() => removeImage(i)} className="rounded p-1 text-ink-3 hover:bg-deal/10 hover:text-deal">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {i === 0 && <span className="ml-1 rounded bg-brand-100 px-1.5 py-0.5 text-2xs font-bold text-brand-700">Primary</span>}
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              block
              loading={uploading}
              leadingIcon={<Upload className="h-4 w-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload images
            </Button>
          </div>

          {!isNew && productId && (
            <div className="rounded-card bg-white p-4 shadow-card">
              <h2 className="mb-2 text-lg font-bold">Document ID</h2>
              <p className="font-mono text-sm text-ink-3">{productId}</p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
