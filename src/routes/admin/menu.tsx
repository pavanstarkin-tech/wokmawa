import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Search, Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin/menu")({
  component: AdminMenu,
});

type Product = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  image?: string;
  veg?: boolean;
  spicy?: boolean;
  popular?: boolean;
};

type MenuCategory = {
  type: string;
  categoryName: string;
  products: Product[];
};

const EMPTY_FORM = {
  name: "",
  price: "",
  image: "",
  type: "veg",
  categoryName: "",
  newCategory: "",
  veg: true,
  spicy: false,
  popular: false,
};

function AdminMenu() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const menuRef = ref(db, "restaurant/menu");
    const unsub = onValue(menuRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setCategories([]); return; }
      const parsed: MenuCategory[] = [];
      for (const type of ["veg", "nonVeg"]) {
        if (data[type]) {
          for (const catName of Object.keys(data[type])) {
            const productsStr = data[type][catName]?.productsJson;
            if (productsStr) {
              try { parsed.push({ type, categoryName: catName, products: JSON.parse(productsStr) }); }
              catch (e) { console.error("Failed to parse category", catName, e); }
            }
          }
        }
      }
      setCategories(parsed);
    });
    return () => unsub();
  }, []);

  const toggleAvailability = async (type: string, categoryName: string, productId: string, currentStatus: boolean) => {
    const cat = categories.find(c => c.type === type && c.categoryName === categoryName);
    if (!cat) return;
    const updatedProducts = cat.products.map(p => p.id === productId ? { ...p, available: !currentStatus } : p);
    await update(ref(db, `restaurant/menu/${type}/${categoryName}`), { productsJson: JSON.stringify(updatedProducts) });
  };

  const saveNewItem = async () => {
    const targetCategory = form.newCategory.trim() || form.categoryName;
    if (!form.name.trim() || !form.price || !targetCategory) return;
    setSaving(true);

    const cat = categories.find(c => c.type === form.type && c.categoryName === targetCategory);
    const existingProducts = cat ? [...cat.products] : [];

    const newProduct: Product = {
      id: `item_${Date.now()}`,
      name: form.name.trim(),
      price: Number(form.price),
      available: true,
      veg: form.type === "veg",
      spicy: form.spicy,
      popular: form.popular,
      ...(form.image.trim() ? { image: form.image.trim() } : {}),
    };

    existingProducts.push(newProduct);
    await update(ref(db, `restaurant/menu/${form.type}/${targetCategory}`), {
      productsJson: JSON.stringify(existingProducts),
    });

    setForm({ ...EMPTY_FORM });
    setShowModal(false);
    setSaving(false);
  };

  const filteredCategories = categories.map(cat => ({
    ...cat,
    products: cat.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  })).filter(cat => cat.products.length > 0);

  // Unique category names per type for the dropdown
  const vegCategories = categories.filter(c => c.type === "veg").map(c => c.categoryName);
  const nonVegCategories = categories.filter(c => c.type === "nonVeg").map(c => c.categoryName);
  const availableCategories = form.type === "veg" ? vegCategories : nonVegCategories;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-brown-deep tracking-tight">Menu Manager</h1>
          <p className="text-muted-foreground mt-1">Manage pricing and instantly toggle availability.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-border/80 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 shadow-sm w-64"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brown-gradient text-cream px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pb-12">
        {filteredCategories.map((cat, idx) => (
          <div key={idx} className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-muted/30 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-brown-deep flex items-center gap-2">
                {cat.categoryName}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${cat.type === "veg" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {cat.type}
                </span>
              </h2>
              <span className="text-sm font-semibold text-muted-foreground">{cat.products.length} items</span>
            </div>
            <div className="grid p-4 gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
              {cat.products.map(product => (
                <div key={product.id} className="flex flex-col items-center border border-border/50 rounded-2xl p-3 bg-background hover:shadow-md transition-all gap-2 text-center">
                  <div className="h-14 w-14 rounded-xl bg-muted/50 border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className={`h-3 w-3 rounded-sm border ${product.veg ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"}`} />
                    )}
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="font-bold text-brown-deep text-xs leading-tight line-clamp-2">{product.name}</h3>
                    <div className="text-gold font-bold text-xs mt-1">₹{product.price}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={product.available !== false}
                      onChange={() => toggleAvailability(cat.type, cat.categoryName, product.id, product.available !== false)}
                    />
                    <div className="w-9 h-5 bg-red-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-medium text-lg border-2 border-dashed border-border/60 rounded-3xl">
            No items found.
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-3xl border border-border/60 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
              <h2 className="text-xl font-bold text-brown-deep">Add New Item</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                <button
                  onClick={() => setForm(f => ({ ...f, type: "veg", veg: true, categoryName: "" }))}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all ${form.type === "veg" ? "bg-green-500 text-white border-green-500" : "border-border/60 text-muted-foreground"}`}
                >
                  🟢 Veg
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, type: "nonVeg", veg: false, categoryName: "" }))}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all ${form.type === "nonVeg" ? "bg-red-500 text-white border-red-500" : "border-border/60 text-muted-foreground"}`}
                >
                  🔴 Non Veg
                </button>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-brown-deep mb-1.5">Category</label>
                <select
                  value={form.categoryName}
                  onChange={(e) => setForm(f => ({ ...f, categoryName: e.target.value, newCategory: "" }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border/80 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                  <option value="">— Select existing —</option>
                  {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="text-xs text-muted-foreground mt-2 mb-1">Or create a new category:</p>
                <input
                  type="text"
                  placeholder="New category name..."
                  value={form.newCategory}
                  onChange={(e) => setForm(f => ({ ...f, newCategory: e.target.value, categoryName: "" }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border/80 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-brown-deep mb-1.5">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Paneer Butter Masala"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border/80 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-brown-deep mb-1.5">Price (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 220"
                  value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border/80 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-semibold text-brown-deep mb-1.5">Image URL (optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={form.image}
                  onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border/80 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {/* Tags */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brown-deep/80">
                  <input type="checkbox" checked={form.spicy} onChange={e => setForm(f => ({ ...f, spicy: e.target.checked }))} className="rounded" />
                  🌶️ Spicy
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brown-deep/80">
                  <input type="checkbox" checked={form.popular} onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))} className="rounded" />
                  ⭐ Popular
                </label>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-border/60 font-bold text-sm text-muted-foreground hover:bg-muted/30 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveNewItem}
                disabled={saving || !form.name.trim() || !form.price || (!form.categoryName && !form.newCategory.trim())}
                className="flex-1 py-3 rounded-xl bg-brown-gradient text-cream font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
