import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  ImageOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { SmartImage } from "../components/ui/SmartImage";
import { formatPrice } from "../lib/format";
import type { Product } from "../types/product";
import { deleteProduct, fetchAdminProducts, updateProduct, productToForm } from "../services/adminProducts";
import { logAdminAction } from "../services/audit";
import { useAuth } from "../store/AuthProvider";

const PAGE_SIZE = 20;

const CATEGORY_CHOICES = ["All", "Electronics", "Fashion", "Home", "Women", "Men", "Toys", "Beauty", "Sports & Outdoors", "Automotive", "Gadgets", "Bags", "Shoes", "Jewelry & Accessories", "Phone & Accessories", "Computer Accessories", "Office & School", "Home & Kitchen", "Tools", "Speaker"];

export default function AdminProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [visibility, setVisibility] = useState<"all" | "visible" | "hidden">("all");
  const [promo, setPromo] = useState<"all" | "promo">("all");
  const [stock, setStock] = useState<"all" | "in" | "low" | "out">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "price-asc" | "price-desc" | "stock">("newest");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ["admin", "products"],
    queryFn: () => fetchAdminProducts(),
    staleTime: 60 * 1000,
  });

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || p.category === category;
      const matchesVisible =
        visibility === "all" ||
        (visibility === "visible" && p.visible) ||
        (visibility === "hidden" && !p.visible);
      const matchesPromo = promo === "all" || (promo === "promo" && p.promotionalTags.length > 0);
      const matchesStock =
        stock === "all" ||
        (stock === "in" && p.availableStock > 60) ||
        (stock === "low" && p.availableStock > 0 && p.availableStock <= 60) ||
        (stock === "out" && p.availableStock === 0);
      return matchesSearch && matchesCategory && matchesVisible && matchesPromo && matchesStock;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "stock": return a.availableStock - b.availableStock;
        case "oldest": return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
        default: return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
      }
    });

    return list;
  }, [products, search, category, visibility, promo, stock, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function toggleVisibility(product: Product) {
    setBusyId(product.id);
    try {
      const form = productToForm(product);
      form.visible = !product.visible;
      await updateProduct(product.id, form);
      await logAdminAction({
        adminUid: user!.uid,
        adminEmail: user!.email,
        action: "PRODUCT_VISIBILITY_CHANGED",
        targetType: "product",
        targetId: product.id,
        before: { visible: product.visible },
        after: { visible: !product.visible },
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["catalogue"] });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await deleteProduct(toDelete.id);
      await logAdminAction({
        adminUid: user!.uid,
        adminEmail: user!.email,
        action: "PRODUCT_DELETED",
        targetType: "product",
        targetId: toDelete.id,
        before: { name: toDelete.name, price: toDelete.price },
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["catalogue"] });
      setToDelete(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Products</h1>
          <p className="text-sm text-ink-3">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Link to="/admin/products/new">
          <Button leadingIcon={<Plus className="h-4 w-4" />}>Add product</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input
            placeholder="Search by name or ID"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="h-11 rounded-lg border border-line bg-white px-3 text-md"
        >
          {CATEGORY_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={visibility}
          onChange={(e) => { setVisibility(e.target.value as typeof visibility); setPage(1); }}
          className="h-11 rounded-lg border border-line bg-white px-3 text-md"
        >
          <option value="all">All visibility</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          value={promo}
          onChange={(e) => { setPromo(e.target.value as typeof promo); setPage(1); }}
          className="h-11 rounded-lg border border-line bg-white px-3 text-md"
        >
          <option value="all">All promos</option>
          <option value="promo">Promotional</option>
        </select>
        <select
          value={stock}
          onChange={(e) => { setStock(e.target.value as typeof stock); setPage(1); }}
          className="h-11 rounded-lg border border-line bg-white px-3 text-md"
        >
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }}
          className="h-11 rounded-lg border border-line bg-white px-3 text-md"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="stock">Stock</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-card bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-card bg-white p-6 text-center text-deal">Failed to load products.</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card bg-white p-8 text-center text-ink-3">No products match your filters.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card bg-white shadow-card">
            <table className="w-full min-w-[900px] text-left text-md">
              <thead className="bg-surface-muted text-ink-3">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {pageItems.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-sunken">
                          {product.images[0] ? (
                            <SmartImage src={product.images[0]} alt={product.name} wrapperClassName="h-full w-full" />
                          ) : (
                            <ImageOff className="h-10 w-10 p-2 text-ink-4" />
                          )}
                        </div>
                        <span className="max-w-[220px] truncate font-medium text-ink">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-3">{product.id}</td>
                    <td className="px-4 py-3 text-ink-2">{product.category}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">{product.availableStock}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {!product.visible && (
                          <span className="rounded bg-ink/10 px-1.5 py-0.5 text-2xs font-bold text-ink">Hidden</span>
                        )}
                        {product.sponsored && (
                          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-2xs font-bold text-brand-700">Sponsored</span>
                        )}
                        {product.promotionalTags.length > 0 && (
                          <span className="rounded bg-deal/10 px-1.5 py-0.5 text-2xs font-bold text-deal">Promo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleVisibility(product)}
                          disabled={busyId === product.id}
                          className="rounded p-1.5 text-ink-3 hover:bg-surface-muted hover:text-brand disabled:opacity-50"
                          title={product.visible ? "Hide product" : "Show product"}
                        >
                          {product.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/products/${product.id}`)}
                          className="rounded p-1.5 text-ink-3 hover:bg-surface-muted hover:text-brand"
                          title="Edit product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(product)}
                          className="rounded p-1.5 text-ink-3 hover:bg-deal/10 hover:text-deal"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-3">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete product"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={busyId === toDelete?.id}>Cancel</Button>
            <Button variant="deal" onClick={confirmDelete} loading={busyId === toDelete?.id}>Delete</Button>
          </div>
        }
      >
        {toDelete && (
          <div className="space-y-2 text-md text-ink">
            <p>Are you sure you want to permanently delete this product?</p>
            <p><strong>{toDelete.name}</strong></p>
            <p className="font-mono text-sm text-ink-3">ID: {toDelete.id}</p>
            <p className="flex items-center gap-2 rounded bg-deal/10 p-2 text-sm text-deal">
              <AlertTriangle className="h-4 w-4" />
              This action cannot be undone.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
