import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Calendar,
  Clock,
  Tag,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointerClick,
  TrendingUp,
  Coins,
  Ticket,
  ChevronRight,
  Info,
  Layers,
  X
} from "lucide-react";
import {
  useOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  usePopupCampaigns,
  createPopupCampaign,
  updatePopupCampaign,
  deletePopupCampaign,
  usePromotionLogs,
  useSmartCollections,
  saveSmartCollection,
  type Offer,
  type PopupCampaign
} from "@/lib/promotions";
import { CATEGORIES } from "@/lib/paakashala-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

export const Route = createFileRoute("/admin/offers")({
  component: AdminOffers,
});

type TabType = "popups" | "collections" | "analytics";

const OFFER_TYPES = [
  { value: "percentage", label: "Percentage Discount" },
  { value: "fixed", label: "Fixed Discount" },
  { value: "cart_value", label: "Cart Value Threshold Offer" },
  { value: "bogo", label: "Buy One Get One (BOGO)" },
  { value: "buy_x_get_y", label: "Buy X Get Y Free" },
  { value: "category_bogo", label: "Category BOGO" },
  { value: "bundle", label: "Bundle Pricing" },
  { value: "free_gift", label: "Free Gift Offer" },
  { value: "happy_hours", label: "Happy Hours" },
  { value: "weekend", label: "Weekend Offer" },
  { value: "coupon", label: "Coupon Code Offer" },
];

const DEFAULT_OFFER_FORM = {
  name: "",
  description: "",
  type: "percentage" as Offer["type"],
  status: "active" as Offer["status"],
  priority: 10,
  targetType: "entire_order" as Offer["targetType"],
  targetCategories: [] as string[],
  targetProducts: [] as string[],
  isStackable: true,
  couponCode: "",
  // Schedule
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  startTime: "",
  endTime: "",
  weekdays: [] as string[],
  // Conditions
  minCartValue: "",
  buyProductId: "",
  buyCategoryId: "",
  buyQuantity: "1",
  freeProductId: "",
  freeCategoryId: "",
  freeQuantity: "1",
  requiredQuantity: "2",
  limit: "",
  // Rewards
  discountPercentage: "",
  discountValue: "",
  bundlePrice: "",
  mixMatchPrice: "",
  giftProductId: ""
};

const DEFAULT_POPUP_FORM = {
  title: "",
  description: "",
  image: "",
  ctaText: "Get Offer",
  ctaType: "coupon" as PopupCampaign["ctaType"],
  ctaLink: "",
  offerId: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  priority: 10,
  status: "active" as PopupCampaign["status"]
};

interface SearchableProductSelectProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  products: { id: string; name: string; category: string }[];
}

function SearchableProductSelect({ value, onChange, placeholder, products }: SearchableProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedProduct = products.find(p => p.id === value);
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handleOutside = () => setOpen(false);
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, [open]);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none text-left flex items-center justify-between cursor-pointer"
      >
        <span className={selectedProduct ? "text-brown-deep font-semibold" : "text-muted-foreground"}>
          {selectedProduct ? `${selectedProduct.name} (${selectedProduct.category})` : placeholder}
        </span>
        <span className="text-xs text-muted-foreground">▼</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto flex flex-col p-2 gap-2 animate-in fade-in duration-100">
          <input
            type="text"
            placeholder="Type to search product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus:border-gold focus:outline-none"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 space-y-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs text-muted-foreground transition-colors cursor-pointer"
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">No products found</div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gold/10 text-xs transition-colors cursor-pointer flex justify-between ${
                    p.id === value ? "bg-gold/10 text-gold font-bold" : "text-brown-deep"
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="text-[9px] text-muted-foreground/80 font-normal uppercase">{p.category}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminOffers() {
  const [activeTab, setActiveTab] = useState<TabType>("popups");
  const { offers, loading: loadingOffers } = useOffers();
  const { campaigns, loading: loadingCampaigns } = usePopupCampaigns();
  const { logs } = usePromotionLogs();
  const smartCollections = useSmartCollections();

  const [menuProducts, setMenuProducts] = useState<{ id: string; name: string; category: string }[]>([]);

  // Modals state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerModalMode, setOfferModalMode] = useState<"add" | "edit">("add");
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [offerForm, setOfferForm] = useState({ ...DEFAULT_OFFER_FORM });

  const [showPopupModal, setShowPopupModal] = useState(false);
  const [popupModalMode, setPopupModalMode] = useState<"add" | "edit">("add");
  const [selectedPopupId, setSelectedPopupId] = useState<string | null>(null);
  const [popupForm, setPopupForm] = useState({ ...DEFAULT_POPUP_FORM });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [targetProductSearch, setTargetProductSearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState<Record<string, string>>({});
  const [collectionDraft, setCollectionDraft] = useState<Record<string, string[]>>({});
  const [collectionSaving, setCollectionSaving] = useState<string | null>(null);

  // Sync Firebase smart_collections into local draft state
  useEffect(() => {
    setCollectionDraft(smartCollections);
  }, [smartCollections]);

  // Load menu items for conditions dropdown
  useEffect(() => {
    const menuRef = ref(db, "restaurant/menu");
    const unsub = onValue(menuRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const parsed: any[] = [];
      for (const type of ["veg", "nonVeg"]) {
        if (data[type]) {
          for (const catName of Object.keys(data[type])) {
            const productsStr = data[type][catName]?.productsJson;
            if (productsStr) {
              try {
                const products = JSON.parse(productsStr);
                parsed.push(...products.map((p: any) => ({ id: p.id, name: p.name, category: catName })));
              } catch (e) {}
            }
          }
        }
      }
      setMenuProducts(parsed);
    });
    return () => unsub();
  }, []);

  /* ---------- Offer CRUD Handlers ---------- */
  const openAddOffer = () => {
    setOfferForm({ ...DEFAULT_OFFER_FORM });
    setOfferModalMode("add");
    setSelectedOfferId(null);
    setTargetProductSearch("");
    setShowOfferModal(true);
  };

  const openEditOffer = (offer: Offer) => {
    setOfferForm({
      name: offer.name,
      description: offer.description,
      type: offer.type,
      status: offer.status,
      priority: offer.priority,
      targetType: offer.targetType,
      targetCategories: offer.targetCategories || [],
      targetProducts: offer.targetProducts || [],
      isStackable: offer.isStackable ?? true,
      couponCode: offer.couponCode || "",
      startDate: offer.startDate || "",
      endDate: offer.endDate || "",
      startTime: offer.startTime || "",
      endTime: offer.endTime || "",
      weekdays: offer.weekdays || [],
      minCartValue: offer.conditions?.minCartValue ? String(offer.conditions.minCartValue) : "",
      buyProductId: offer.conditions?.buyProductId || "",
      buyCategoryId: offer.conditions?.buyCategoryId || "",
      buyQuantity: offer.conditions?.buyQuantity ? String(offer.conditions.buyQuantity) : "1",
      freeProductId: offer.conditions?.freeProductId || "",
      freeCategoryId: offer.conditions?.freeCategoryId || "",
      freeQuantity: offer.conditions?.freeQuantity ? String(offer.conditions.freeQuantity) : "1",
      requiredQuantity: offer.conditions?.requiredQuantity ? String(offer.conditions.requiredQuantity) : "2",
      limit: offer.conditions?.limit ? String(offer.conditions.limit) : "",
      discountPercentage: offer.rewards?.discountPercentage ? String(offer.rewards.discountPercentage) : "",
      discountValue: offer.rewards?.discountValue ? String(offer.rewards.discountValue) : "",
      bundlePrice: offer.rewards?.bundlePrice ? String(offer.rewards.bundlePrice) : "",
      mixMatchPrice: offer.rewards?.mixMatchPrice ? String(offer.rewards.mixMatchPrice) : "",
      giftProductId: offer.rewards?.giftProductId || ""
    });
    setSelectedOfferId(offer.id);
    setOfferModalMode("edit");
    setTargetProductSearch("");
    setShowOfferModal(true);
  };

  const handleSaveOffer = async () => {
    if (!offerForm.name.trim()) return;
    setSaving(true);
    try {
      const dataToSave = {
        name: offerForm.name.trim(),
        description: offerForm.description.trim(),
        type: offerForm.type,
        status: offerForm.status,
        priority: Number(offerForm.priority) || 0,
        targetType: offerForm.targetType,
        isStackable: offerForm.isStackable,
        createdBy: "admin@gmail.com",
        startDate: offerForm.startDate,
        endDate: offerForm.endDate,
        ...(offerForm.startTime ? { startTime: offerForm.startTime } : {}),
        ...(offerForm.endTime ? { endTime: offerForm.endTime } : {}),
        ...(offerForm.weekdays.length > 0 ? { weekdays: offerForm.weekdays } : {}),
        ...(offerForm.couponCode ? { couponCode: offerForm.couponCode.trim().toUpperCase() } : {}),
        ...(offerForm.targetType === "categories" ? { targetCategories: offerForm.targetCategories } : {}),
        ...(offerForm.targetType === "products" ? { targetProducts: offerForm.targetProducts } : {}),
        
        conditions: {
          ...(offerForm.minCartValue ? { minCartValue: Number(offerForm.minCartValue) } : {}),
          ...(offerForm.buyProductId ? { buyProductId: offerForm.buyProductId } : {}),
          ...(offerForm.buyCategoryId ? { buyCategoryId: offerForm.buyCategoryId } : {}),
          ...(offerForm.buyQuantity ? { buyQuantity: Number(offerForm.buyQuantity) } : {}),
          ...(offerForm.freeProductId ? { freeProductId: offerForm.freeProductId } : {}),
          ...(offerForm.freeCategoryId ? { freeCategoryId: offerForm.freeCategoryId } : {}),
          ...(offerForm.freeQuantity ? { freeQuantity: Number(offerForm.freeQuantity) } : {}),
          ...(offerForm.requiredQuantity ? { requiredQuantity: Number(offerForm.requiredQuantity) } : {}),
          ...(offerForm.limit ? { limit: Number(offerForm.limit) } : {})
        },
        rewards: {
          ...(offerForm.discountPercentage ? { discountPercentage: Number(offerForm.discountPercentage) } : {}),
          ...(offerForm.discountValue ? { discountValue: Number(offerForm.discountValue) } : {}),
          ...(offerForm.bundlePrice ? { bundlePrice: Number(offerForm.bundlePrice) } : {}),
          ...(offerForm.mixMatchPrice ? { mixMatchPrice: Number(offerForm.mixMatchPrice) } : {}),
          ...(offerForm.giftProductId ? { giftProductId: offerForm.giftProductId } : {})
        }
      };

      if (offerModalMode === "add") {
        await createOffer(dataToSave);
      } else if (offerModalMode === "edit" && selectedOfferId) {
        await updateOffer(selectedOfferId, dataToSave);
      }
      setShowOfferModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    await deleteOffer(id);
  };

  const handleDuplicateOffer = async (offer: Offer) => {
    setSaving(true);
    try {
      const duplicateData = {
        ...offer,
        name: `${offer.name} (Copy)`,
        status: "inactive" as Offer["status"]
      };
      // delete properties that shouldn't be duplicated directly
      delete (duplicateData as any).id;
      delete (duplicateData as any).createdAt;
      delete (duplicateData as any).usageCount;
      
      await createOffer(duplicateData);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleOfferStatus = async (id: string, currentStatus: Offer["status"]) => {
    const nextStatus: Offer["status"] = currentStatus === "active" ? "inactive" : "active";
    await updateOffer(id, { status: nextStatus });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("key", "271837f4240842ef12577a95dbae3e88");

      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        setPopupForm(f => ({ ...f, image: data.data.url }));
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  /* ---------- Popup Campaign CRUD Handlers ---------- */
  const openAddPopup = () => {
    setPopupForm({ ...DEFAULT_POPUP_FORM });
    setPopupModalMode("add");
    setSelectedPopupId(null);
    setShowPopupModal(true);
  };

  const openEditPopup = (campaign: PopupCampaign) => {
    setPopupForm({
      title: campaign.title,
      description: campaign.description,
      image: campaign.image,
      ctaText: campaign.ctaText || "Get Offer",
      ctaType: campaign.ctaType,
      ctaLink: campaign.ctaLink || "",
      offerId: campaign.offerId || "",
      startDate: campaign.startDate || "",
      endDate: campaign.endDate || "",
      priority: campaign.priority,
      status: campaign.status
    });
    setSelectedPopupId(campaign.id);
    setPopupModalMode("edit");
    setShowPopupModal(true);
  };

  const handleSavePopup = async () => {
    if (!popupForm.title.trim() || !popupForm.image.trim()) return;
    setSaving(true);
    try {
      const dataToSave = {
        title: popupForm.title.trim(),
        description: popupForm.description.trim(),
        image: popupForm.image.trim(),
        ctaText: popupForm.ctaText.trim(),
        ctaType: popupForm.ctaType,
        ctaLink: popupForm.ctaLink.trim(),
        offerId: popupForm.offerId || undefined,
        startDate: popupForm.startDate,
        endDate: popupForm.endDate,
        priority: Number(popupForm.priority) || 0,
        status: popupForm.status
      };

      if (popupModalMode === "add") {
        await createPopupCampaign(dataToSave);
      } else if (popupModalMode === "edit" && selectedPopupId) {
        await updatePopupCampaign(selectedPopupId, dataToSave);
      }
      setShowPopupModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save popup campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePopup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    await deletePopupCampaign(id);
  };

  const togglePopupStatus = async (id: string, currentStatus: PopupCampaign["status"]) => {
    const nextStatus: PopupCampaign["status"] = currentStatus === "active" ? "inactive" : "active";
    await updatePopupCampaign(id, { status: nextStatus });
  };

  /* ---------- Analytics Data Computations ---------- */
  const analyticsKPIs = (() => {
    const totalViews = campaigns.reduce((sum, c) => sum + (c.views || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const avgCTR = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    
    // Revenue from promotion logs
    const totalDiscountGiven = logs.reduce((sum, l) => sum + (l.discountApplied || 0), 0);
    const totalSalesFromPromo = logs.length * 400; // estimated order average ticket of ₹400
    
    return {
      totalViews,
      totalClicks,
      avgCTR,
      totalDiscountGiven,
      ordersUsingPromo: logs.length,
      estimatedROI: totalDiscountGiven > 0 ? (totalSalesFromPromo / totalDiscountGiven).toFixed(1) : "0"
    };
  })();

  // Prepare chart data for most used offers
  const offersChartData = offers
    .filter(o => o.usageCount > 0)
    .map(o => ({
      name: o.name,
      uses: o.usageCount,
    }))
    .slice(0, 5);

  // Prepare daily log usage charts
  const dailyUsageData = (() => {
    const groups: Record<string, number> = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      groups[date] = (groups[date] || 0) + 1;
    });
    return Object.keys(groups).map(date => ({
      date,
      count: groups[date]
    })).reverse().slice(-7);
  })();

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Page Title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-brown-deep tracking-tight">Offers & Promotions</h1>
          <p className="text-muted-foreground mt-1">Manage marketing popup campaigns and real-time discounts.</p>
        </div>
        
        {/* Tab Selector */}
        <div className="flex bg-card border border-border/80 p-1.5 rounded-2xl shadow-sm self-start">
          <button
            onClick={() => setActiveTab("popups")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "popups" ? "bg-brown-gradient text-cream" : "text-muted-foreground hover:text-brown-deep"
            }`}
          >
            Popup Campaigns
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "collections" ? "bg-brown-gradient text-cream" : "text-muted-foreground hover:text-brown-deep"
            }`}
          >
            Smart Collections
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "analytics" ? "bg-brown-gradient text-cream" : "text-muted-foreground hover:text-brown-deep"
            }`}
          >
            Analytics Dashboard
          </button>
        </div>
      </div>

      {/* Main Tab content */}
      <div className="flex-1 overflow-y-auto pb-12">
       )}

        {/* TAB 2: POPUP CAMPAIGNS */}
        {activeTab === "popups" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-card rounded-2xl p-4 border border-border/60 shadow-sm">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-gold" />
                <span className="text-sm font-bold text-brown-deep">Active Image Popups: {campaigns.length}</span>
              </div>
              <button
                onClick={openAddPopup}
                className="flex items-center gap-2 bg-brown-gradient text-cream px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" /> Create Popup Campaign
              </button>
            </div>

            {loadingCampaigns ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/60 rounded-3xl">
                <Info className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="font-semibold text-lg text-brown-deep">No popup campaigns found</p>
                <p className="text-xs">Create image popup campaigns shown automatically on user scan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((camp) => {
                  const ctr = camp.views > 0 ? ((camp.clicks / camp.views) * 100).toFixed(1) : "0";
                  return (
                    <div key={camp.id} className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden flex flex-col justify-between">
                      {/* Image Preview */}
                      <div className="aspect-[9/16] h-64 w-full relative bg-muted overflow-hidden">
                        <img src={camp.image} alt={camp.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                        
                        {/* Status Overlay */}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider text-white ${
                            camp.status === "active" ? "bg-green-600" : "bg-red-500"
                          }`}>
                            {camp.status}
                          </span>
                          <span className="bg-black/50 text-white text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded backdrop-blur-sm">
                            Priority: {camp.priority}
                          </span>
                        </div>
                        
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-white font-extrabold text-lg line-clamp-1 leading-tight">{camp.title}</h3>
                          <p className="text-white/80 text-xs line-clamp-2 mt-1">{camp.description}</p>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="p-5 border-t border-border/40 space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-muted/30 p-2 rounded-xl border border-border/40">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Views</p>
                            <p className="font-extrabold text-sm text-brown-deep mt-0.5">{camp.views || 0}</p>
                          </div>
                          <div className="bg-muted/30 p-2 rounded-xl border border-border/40">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Clicks</p>
                            <p className="font-extrabold text-sm text-brown-deep mt-0.5">{camp.clicks || 0}</p>
                          </div>
                          <div className="bg-muted/30 p-2 rounded-xl border border-border/40">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">CTR</p>
                            <p className="font-extrabold text-sm text-gold mt-0.5">{ctr}%</p>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-between items-center text-xs">
                          <span className="text-muted-foreground font-semibold">
                            {camp.startDate} to {camp.endDate}
                          </span>
                          <span className="text-[10px] bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded uppercase font-bold">
                            CTA: {camp.ctaType}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-border/40">
                          <button
                            onClick={() => togglePopupStatus(camp.id, camp.status)}
                            className="flex-1 py-2 border border-border/80 hover:bg-gold/5 rounded-xl font-bold text-xs text-brown-deep transition-all cursor-pointer"
                          >
                            Toggle Status
                          </button>
                          <button
                            onClick={() => openEditPopup(camp)}
                            className="p-2 border border-border/80 hover:bg-gold/5 rounded-xl text-brown-deep transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePopup(camp.id)}
                            className="p-2 border border-border/80 hover:bg-red-50 rounded-xl text-red-500 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANALYTICS DASHBOARD */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 bg-gold/15 text-gold rounded-full flex items-center justify-center shrink-0">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Popup Views</p>
                  <h3 className="text-xl font-black text-brown-deep mt-0.5">{analyticsKPIs.totalViews}</h3>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 bg-gold/15 text-gold rounded-full flex items-center justify-center shrink-0">
                  <MousePointerClick className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Popup Clicks</p>
                  <h3 className="text-xl font-black text-brown-deep mt-0.5">{analyticsKPIs.totalClicks}</h3>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 bg-gold/15 text-gold rounded-full flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Conversion CTR</p>
                  <h3 className="text-xl font-black text-brown-deep mt-0.5">{analyticsKPIs.avgCTR.toFixed(1)}%</h3>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 bg-gold/15 text-gold rounded-full flex items-center justify-center shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Estimated ROI</p>
                  <h3 className="text-xl font-black text-gold mt-0.5">{analyticsKPIs.estimatedROI}x</h3>
                </div>
              </div>
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Promotion logs usage frequency */}
              <div className="bg-card rounded-3xl p-5 border border-border/60 shadow-sm">
                <h3 className="text-sm font-bold text-brown-deep mb-4 flex items-center gap-1.5"><Ticket className="h-4 w-4 text-gold" /> Applied Promotions Log (Last 7 Days)</h3>
                {dailyUsageData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-xs border border-dashed border-border/40 rounded-2xl">
                    No logs recorded in the last 7 days.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyUsageData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "#A0A0A0", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#A0A0A0", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#C89B3C" strokeWidth={3} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Offer Performance comparison */}
              <div className="bg-card rounded-3xl p-5 border border-border/60 shadow-sm">
                <h3 className="text-sm font-bold text-brown-deep mb-4 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-gold" /> Most Applied Automated Offers</h3>
                {offersChartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-xs border border-dashed border-border/40 rounded-2xl">
                    No active offers have been utilized yet.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={offersChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "#A0A0A0", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#A0A0A0", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="uses" fill="#C89B3C" radius={[4, 4, 0, 0]}>
                          {offersChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#C89B3C" : "#5C4033"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SMART COLLECTIONS MANAGER */}
        {activeTab === "collections" && (() => {
          // Define each collection: auto ones compute from menu, manual ones need curation
          type ColMeta = {
            id: string; emoji: string; title: string;
            mode: "auto" | "manual";
            autoLabel?: string;   // describes the auto rule
            autoFilter?: (p: { id: string; name: string; category: string; price?: number | null }) => boolean;
          };
          const COLLECTIONS: ColMeta[] = [
            {
              id: "under199", emoji: "💸", title: "Under ₹199", mode: "auto",
              autoLabel: "All dishes priced below ₹199",
              autoFilter: p => Number(p.price ?? 9999) < 199,
            },
            {
              id: "under299", emoji: "🍲", title: "Under ₹299", mode: "auto",
              autoLabel: "All dishes priced below ₹299",
              autoFilter: p => Number(p.price ?? 9999) < 299,
            },
            {
              id: "starters199", emoji: "🌶️", title: "Starters Under ₹199", mode: "auto",
              autoLabel: "Starter category items priced below ₹199",
              autoFilter: p => {
                const cat = p.category.toLowerCase();
                return (cat === "veg starters" || cat === "non veg starters" || cat === "south indian starters" || cat === "tandoori starters") && Number(p.price ?? 9999) < 199;
              },
            },
            {
              id: "biryani299", emoji: "🍗", title: "Biryanis Under ₹299", mode: "auto",
              autoLabel: "Biryani category items priced below ₹299",
              autoFilter: p => p.category.toLowerCase().includes("biryani") && Number(p.price ?? 9999) < 299,
            },
            { id: "bogo",  emoji: "🔥", title: "Buy 1 Get 1 Free", mode: "manual" },
            { id: "combo", emoji: "🍱", title: "Combo Deals",       mode: "manual" },
          ];

          return (
            <div className="space-y-5">
              {/* Info banner */}
              <div className="bg-card p-4 rounded-2xl border border-border/60 shadow-sm flex items-start gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <h2 className="font-bold text-brown-deep text-sm">Smart Collections Manager</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-green-600 font-bold">Auto-managed</span> collections update automatically based on your menu prices.{" "}
                    <span className="text-amber-600 font-bold">Manual</span> collections let you handpick exactly which dishes appear.
                  </p>
                </div>
              </div>

              {/* Auto Collections */}
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 px-1">
                  🤖 Auto-Managed (Price Based)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COLLECTIONS.filter(c => c.mode === "auto").map(col => {
                    const autoItems = menuProducts.filter(p => col.autoFilter!(p as any));
                    return (
                      <div key={col.id} className="bg-card rounded-2xl border border-green-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-green-50/60 border-b border-green-100">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{col.emoji}</span>
                            <div>
                              <h3 className="font-bold text-sm text-brown-deep leading-tight">{col.title}</h3>
                              <p className="text-[9px] text-green-700 font-semibold mt-0.5">{col.autoLabel}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-300 px-2 py-1 rounded-full whitespace-nowrap">
                            ✓ AUTO · {autoItems.length} items
                          </span>
                        </div>
                        <div className="max-h-36 overflow-y-auto divide-y divide-border/30">
                          {autoItems.length === 0 ? (
                            <div className="p-3 text-center text-xs text-muted-foreground">No matching items in menu yet</div>
                          ) : autoItems.map(p => (
                            <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
                              <span className="font-medium text-brown-deep truncate flex-1">{p.name}</span>
                              <span className="text-muted-foreground ml-2 shrink-0">₹{p.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manual Collections */}
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 px-1">
                  ✋ Manual Curation (You Pick the Dishes)
                </p>
                <div className="space-y-4">
                  {COLLECTIONS.filter(c => c.mode === "manual").map(col => {
                    const selectedIds: string[] = collectionDraft[col.id] || [];
                    const search = collectionSearch[col.id] || "";
                    const filteredItems = menuProducts.filter(p =>
                      p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.category.toLowerCase().includes(search.toLowerCase())
                    );
                    const selectedItems = menuProducts.filter(p => selectedIds.includes(p.id));

                    return (
                      <div key={col.id} className="bg-card rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-amber-50/60 border-b border-amber-100">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{col.emoji}</span>
                            <div>
                              <h3 className="font-bold text-sm text-brown-deep">{col.title}</h3>
                              <p className="text-[9px] text-amber-700 font-semibold">Manually curated — pick the dishes to show</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full">
                              {selectedIds.length} selected
                            </span>
                            <button
                              onClick={async () => {
                                setCollectionSaving(col.id);
                                try { await saveSmartCollection(col.id, selectedIds); }
                                finally { setCollectionSaving(null); }
                              }}
                              disabled={collectionSaving === col.id}
                              className="bg-brown-gradient text-cream px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {collectionSaving === col.id ? "Saving..." : "Save"}
                            </button>
                            {selectedIds.length > 0 && (
                              <button
                                onClick={async () => {
                                  setCollectionDraft(d => ({ ...d, [col.id]: [] }));
                                  await saveSmartCollection(col.id, []);
                                }}
                                className="text-[10px] font-bold text-red-500 border border-red-200 px-2 py-1 rounded-xl hover:bg-red-50 transition-colors"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Search + Checkboxes */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">All Dishes</label>
                            <input
                              type="text"
                              placeholder="Search by name or category..."
                              value={search}
                              onChange={e => setCollectionSearch(s => ({ ...s, [col.id]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:border-gold focus:outline-none"
                            />
                            <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border/40">
                              {filteredItems.map(p => {
                                const checked = selectedIds.includes(p.id);
                                return (
                                  <label key={p.id} className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-xs transition-colors ${checked ? "bg-amber-50/60" : "hover:bg-muted/40"}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={e => {
                                        setCollectionDraft(d => {
                                          const list = [...(d[col.id] || [])];
                                          if (e.target.checked) { if (!list.includes(p.id)) list.push(p.id); }
                                          else { const i = list.indexOf(p.id); if (i > -1) list.splice(i, 1); }
                                          return { ...d, [col.id]: list };
                                        });
                                      }}
                                      className="accent-amber-600 h-3.5 w-3.5 rounded"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <span className={`font-semibold block truncate ${checked ? "text-brown-deep" : "text-muted-foreground"}`}>{p.name}</span>
                                      <span className="text-[9px] text-muted-foreground/70">{p.category} · ₹{p.price}</span>
                                    </div>
                                    {checked && <span className="text-amber-600 text-[10px] font-black shrink-0">✓</span>}
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Selected Preview */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Selected ({selectedIds.length})</label>
                            {selectedItems.length === 0 ? (
                              <div className="min-h-[120px] border-2 border-dashed border-amber-200 rounded-xl flex items-center justify-center">
                                <p className="text-xs text-muted-foreground text-center px-4">No items picked yet.<br/>Check items from the left.</p>
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border/40">
                                {selectedItems.map(p => (
                                  <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5">
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-semibold text-brown-deep block truncate">{p.name}</span>
                                      <span className="text-[9px] text-muted-foreground/70">{p.category} · ₹{p.price}</span>
                                    </div>
                                    <button
                                      onClick={() => setCollectionDraft(d => {
                                        const list = (d[col.id] || []).filter(id => id !== p.id);
                                        return { ...d, [col.id]: list };
                                      })}
                                      className="p-1 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors shrink-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* MODAL 1: ADD / EDIT OFFER */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-3xl border border-gold/25 shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-brown-deep">
                {offerModalMode === "add" ? "Create Promotional Offer Rule" : "Edit Offer Rule"}
              </h2>
              <button onClick={() => setShowOfferModal(false)} className="p-1 rounded-full hover:bg-muted text-muted-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              
              {/* Quick Template Presets */}
              {offerModalMode === "add" && (
                <div className="bg-gold/5 border border-gold/25 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] tracking-wider font-extrabold text-gold uppercase block">⚡ Quick Offer Presets (Select to Autofill)</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      {
                        name: "Flat 10% Off",
                        desc: "Apply 10% discount on the entire order value.",
                        data: {
                          name: "Flat 10% Off",
                          description: "Get 10% discount on your bill value.",
                          type: "percentage",
                          targetType: "entire_order",
                          discountPercentage: "10",
                          discountValue: "",
                          minCartValue: "",
                          couponCode: "",
                          isStackable: true,
                          priority: 10
                        }
                      },
                      {
                        name: "Flat ₹100 Off (Min ₹500)",
                        desc: "Flat ₹100 off when ordering above ₹500.",
                        data: {
                          name: "Flat ₹100 Off",
                          description: "Flat ₹100 discount on bills above ₹500.",
                          type: "fixed",
                          targetType: "entire_order",
                          discountPercentage: "",
                          discountValue: "100",
                          minCartValue: "500",
                          couponCode: "",
                          isStackable: true,
                          priority: 20
                        }
                      },
                      {
                        name: "WELCOME100 Coupon",
                        desc: "Coupon code WELCOME100 for ₹100 discount.",
                        data: {
                          name: "WELCOME100 Coupon Offer",
                          description: "Use coupon WELCOME100 for flat ₹100 discount on orders above ₹399.",
                          type: "coupon",
                          targetType: "entire_order",
                          discountPercentage: "",
                          discountValue: "100",
                          minCartValue: "399",
                          couponCode: "WELCOME100",
                          isStackable: true,
                          priority: 30
                        }
                      },
                      {
                        name: "Buy 1 Get 1 (BOGO)",
                        desc: "Buy one item, get the same item free.",
                        data: {
                          name: "Buy 1 Get 1 Free (BOGO)",
                          description: "Add 2 of the same item to cart, pay for only 1.",
                          type: "bogo",
                          targetType: "products",
                          discountPercentage: "",
                          discountValue: "",
                          minCartValue: "",
                          couponCode: "",
                          buyQuantity: "1",
                          freeQuantity: "1",
                          isStackable: false,
                          priority: 40
                        }
                      },
                      {
                        name: "Weekend 15% Off",
                        desc: "Automated 15% discount active on Saturday/Sunday.",
                        data: {
                          name: "Weekend Special 15% Off",
                          description: "15% discount applied automatically on Saturdays and Sundays.",
                          type: "weekend",
                          targetType: "entire_order",
                          discountPercentage: "15",
                          discountValue: "",
                          minCartValue: "",
                          couponCode: "",
                          weekdays: ["Saturday", "Sunday"],
                          isStackable: true,
                          priority: 15
                        }
                      },
                      {
                        name: "Free Gift on ₹999+",
                        desc: "Add a free reward item for orders above ₹999.",
                        data: {
                          name: "Free Dessert on orders above ₹999",
                          description: "Get a free item when your bill crosses ₹999.",
                          type: "free_gift",
                          targetType: "entire_order",
                          discountPercentage: "",
                          discountValue: "",
                          minCartValue: "999",
                          couponCode: "",
                          isStackable: true,
                          priority: 25
                        }
                      }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setOfferForm(f => ({
                            ...DEFAULT_OFFER_FORM,
                            ...preset.data,
                            startDate: f.startDate,
                            endDate: f.endDate,
                          }));
                        }}
                        className="p-2.5 rounded-xl border border-gold/20 hover:border-gold bg-card hover:bg-gold/5 text-left transition-all cursor-pointer active:scale-95 flex flex-col justify-between"
                      >
                        <span className="text-[10px] font-bold text-brown-deep block leading-tight">{preset.name}</span>
                        <span className="text-[8px] text-muted-foreground mt-1 block leading-snug line-clamp-2">{preset.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 1: Name and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Offer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 15% Off Biryani"
                    value={offerForm.name}
                    onChange={e => setOfferForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Priority (Higher = Priority) *</label>
                  <input
                    type="number"
                    value={offerForm.priority}
                    onChange={e => setOfferForm(f => ({ ...f, priority: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Description */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Offer Description *</label>
                <textarea
                  placeholder="Describe details (visible to user, e.g. Buy any Starter, get a soft drink free)"
                  value={offerForm.description}
                  onChange={e => setOfferForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none h-16 resize-none"
                />
              </div>

              {/* Row 3: Offer Type, Stacking & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Offer Type *</label>
                  <select
                    value={offerForm.type}
                    onChange={e => setOfferForm(f => ({ ...f, type: e.target.value as Offer["type"] }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  >
                    {OFFER_TYPES.map(ot => <option key={ot.value} value={ot.value}>{ot.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Offer Stacking *</label>
                  <select
                    value={offerForm.isStackable ? "true" : "false"}
                    onChange={e => setOfferForm(f => ({ ...f, isStackable: e.target.value === "true" }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="true">Stackable (Can combine)</option>
                    <option value="false">Non-Stackable (Stops subsequent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Active Status *</label>
                  <select
                    value={offerForm.status}
                    onChange={e => setOfferForm(f => ({ ...f, status: e.target.value as Offer["status"] }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              {/* Targeting settings */}
              <div className="border border-border/60 bg-muted/20 p-4 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-brown-deep flex items-center gap-1.5"><Layers className="h-4 w-4" /> Rules Targeting & Scope</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Scope Target *</label>
                    <select
                      value={offerForm.targetType}
                      onChange={e => setOfferForm(f => ({ ...f, targetType: e.target.value as Offer["targetType"] }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                    >
                      <option value="entire_order">Entire Order (Cart Total)</option>
                      <option value="categories">Specific Categories</option>
                      <option value="products">Specific Products Only</option>
                    </select>
                  </div>
                  
                  {/* Scope Details depending on type */}
                  {offerForm.targetType === "categories" && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Target Categories</label>
                      <div className="max-h-24 overflow-y-auto border border-border bg-background p-2 rounded-xl text-xs space-y-1.5">
                        {CATEGORIES.map(cat => (
                          <label key={cat} className="flex items-center gap-2 cursor-pointer font-medium text-brown-deep">
                            <input
                              type="checkbox"
                              checked={offerForm.targetCategories.includes(cat)}
                              onChange={e => {
                                const list = [...offerForm.targetCategories];
                                if (e.target.checked) list.push(cat);
                                else {
                                  const idx = list.indexOf(cat);
                                  if (idx > -1) list.splice(idx, 1);
                                }
                                setOfferForm(f => ({ ...f, targetCategories: list }));
                              }}
                              className="rounded"
                            />
                            {cat}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {offerForm.targetType === "products" && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Target Products</label>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="Search product name..."
                          value={targetProductSearch}
                          onChange={e => setTargetProductSearch(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-gold focus:outline-none"
                        />
                        <div className="max-h-24 overflow-y-auto border border-border bg-background p-2 rounded-xl text-xs space-y-1.5">
                          {menuProducts
                            .filter(p => p.name.toLowerCase().includes(targetProductSearch.toLowerCase()))
                            .map(p => (
                              <label key={p.id} className="flex items-center gap-2 cursor-pointer font-medium text-brown-deep">
                                <input
                                  type="checkbox"
                                  checked={offerForm.targetProducts.includes(p.id)}
                                  onChange={e => {
                                    const list = [...offerForm.targetProducts];
                                    if (e.target.checked) list.push(p.id);
                                    else {
                                      const idx = list.indexOf(p.id);
                                      if (idx > -1) list.splice(idx, 1);
                                    }
                                    setOfferForm(f => ({ ...f, targetProducts: list }));
                                  }}
                                  className="rounded"
                                />
                                {p.name}
                              </label>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {offerForm.type === "coupon" && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Coupon Code (Uppercase) *</label>
                      <input
                        type="text"
                        placeholder="e.g. WELCOME50"
                        value={offerForm.couponCode}
                        onChange={e => setOfferForm(f => ({ ...f, couponCode: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none uppercase"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Conditions & Rewards block depends on selection */}
              <div className="border border-border/60 bg-muted/20 p-4 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-brown-deep flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Trigger Conditions & Rewards</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* A. Min Cart Value Condition */}
                  {["percentage", "fixed", "cart_value", "free_gift", "coupon"].includes(offerForm.type) && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Minimum Cart Value (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={offerForm.minCartValue}
                        onChange={e => setOfferForm(f => ({ ...f, minCartValue: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                  )}

                  {/* B. Discount Value / Percent Rewards */}
                  {["percentage", "cart_value", "happy_hours", "weekend", "coupon"].includes(offerForm.type) && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Discount Percentage (%)</label>
                      <input
                        type="number"
                        placeholder="e.g. 15"
                        value={offerForm.discountPercentage}
                        onChange={e => setOfferForm(f => ({ ...f, discountPercentage: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                  )}

                  {["fixed", "cart_value", "coupon"].includes(offerForm.type) && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Discount Value (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 100"
                        value={offerForm.discountValue}
                        onChange={e => setOfferForm(f => ({ ...f, discountValue: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                  )}

                  {/* C. BOGO rules */}
                  {["bogo", "buy_x_get_y"].includes(offerForm.type) && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 font-semibold">Buy Product *</label>
                        <SearchableProductSelect
                          value={offerForm.buyProductId}
                          onChange={val => setOfferForm(f => ({ ...f, buyProductId: val }))}
                          placeholder="— Select item —"
                          products={menuProducts}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 font-semibold">Free Reward Product</label>
                        <SearchableProductSelect
                          value={offerForm.freeProductId}
                          onChange={val => setOfferForm(f => ({ ...f, freeProductId: val }))}
                          placeholder="— Same as Buy Product —"
                          products={menuProducts}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Required Buy Qty</label>
                        <input
                          type="number"
                          value={offerForm.buyQuantity}
                          onChange={e => setOfferForm(f => ({ ...f, buyQuantity: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Free Qty Rewarded</label>
                        <input
                          type="number"
                          value={offerForm.freeQuantity}
                          onChange={e => setOfferForm(f => ({ ...f, freeQuantity: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* D. Category BOGO */}
                  {offerForm.type === "category_bogo" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Buy Category *</label>
                        <select
                          value={offerForm.buyCategoryId}
                          onChange={e => setOfferForm(f => ({ ...f, buyCategoryId: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                        >
                          <option value="">— Select Category —</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Free Category Reward *</label>
                        <select
                          value={offerForm.freeCategoryId}
                          onChange={e => setOfferForm(f => ({ ...f, freeCategoryId: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                        >
                          <option value="">— Select Category —</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {/* E. Bundle Pricing */}
                  {offerForm.type === "bundle" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Target Bundle Category *</label>
                        <select
                          value={offerForm.targetCategories?.[0] || ""}
                          onChange={e => setOfferForm(f => ({ ...f, targetCategories: [e.target.value] }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                        >
                          <option value="">— Select Category —</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Required Items Qty *</label>
                        <input
                          type="number"
                          placeholder="e.g. 2"
                          value={offerForm.requiredQuantity}
                          onChange={e => setOfferForm(f => ({ ...f, requiredQuantity: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Bundle Set Price (₹) *</label>
                        <input
                          type="number"
                          placeholder="e.g. 599"
                          value={offerForm.bundlePrice}
                          onChange={e => setOfferForm(f => ({ ...f, bundlePrice: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* F. Free Gift Offer */}
                  {offerForm.type === "free_gift" && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Free Gift Product *</label>
                      <select
                        value={offerForm.giftProductId}
                        onChange={e => setOfferForm(f => ({ ...f, giftProductId: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                      >
                        <option value="">— Select item —</option>
                        {menuProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="border border-border/60 bg-muted/20 p-4 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-brown-deep flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Offer Schedule & Validity</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={offerForm.startDate}
                      onChange={e => setOfferForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">End Date *</label>
                    <input
                      type="date"
                      value={offerForm.endDate}
                      onChange={e => setOfferForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  
                  {/* Happy Hours triggers */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Start Time (HH:MM)</label>
                    <input
                      type="time"
                      value={offerForm.startTime}
                      onChange={e => setOfferForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">End Time (HH:MM)</label>
                    <input
                      type="time"
                      value={offerForm.endTime}
                      onChange={e => setOfferForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Weekday checkboxes */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Weekdays Active (Leave blank for all)</label>
                  <div className="flex flex-wrap gap-3">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                      <label key={day} className="flex items-center gap-1.5 text-xs text-brown-deep font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={offerForm.weekdays.includes(day)}
                          onChange={e => {
                            const list = [...offerForm.weekdays];
                            if (e.target.checked) list.push(day);
                            else {
                              const idx = list.indexOf(day);
                              if (idx > -1) list.splice(idx, 1);
                            }
                            setOfferForm(f => ({ ...f, weekdays: list }));
                          }}
                          className="rounded"
                        />
                        {day.substring(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 pb-6 pt-4 flex gap-3 border-t border-border/50 sticky bottom-0 bg-card">
              <button
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-3 rounded-xl border border-border font-bold text-sm text-muted-foreground hover:bg-muted/30 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOffer}
                disabled={saving || !offerForm.name.trim()}
                className="flex-1 py-3 rounded-xl bg-brown-gradient text-cream font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving..." : offerModalMode === "add" ? "Create Offer" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT POPUP CAMPAIGN */}
      {showPopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-3xl border border-gold/25 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-brown-deep">
                {popupModalMode === "add" ? "Create Popup Campaign" : "Edit Popup Campaign"}
              </h2>
              <button onClick={() => setShowPopupModal(false)} className="p-1 rounded-full hover:bg-muted text-muted-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

             {/* Fields */}
             <div className="p-6 space-y-4">
              {/* Linked Smart Collection Dropdown */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 font-semibold">Link to Smart Collection (Optional)</label>
                <select
                  value={popupForm.ctaType === "offer_collection" ? popupForm.ctaLink : ""}
                  onChange={e => {
                    const colId = e.target.value;
                    if (colId) {
                      setPopupForm(f => ({
                        ...f,
                        ctaType: "offer_collection",
                        ctaLink: colId,
                      }));
                    } else {
                      setPopupForm(f => ({
                        ...f,
                        ctaType: "coupon",
                        ctaLink: "",
                      }));
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                >
                  <option value="">— Not Linked to a Collection —</option>
                  <option value="offers">💸 Special Offers (Discounts & Budget)</option>
                  <option value="bogo">🔥 Buy 1 Get 1 Free (BOGO)</option>
                  <option value="combo">🍱 Combo Deals</option>
                  <option value="under199">💸 Under ₹199</option>
                  <option value="under299">🍲 Under ₹299</option>
                  <option value="starters199">🌶️ Starters Under ₹199</option>
                  <option value="biryani299">🍗 Biryanis Under ₹299</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Linking to a smart collection will make the popup CTA open that collection on the menu page.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Campaign Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Weekend Biryani Feast!"
                  value={popupForm.title}
                  onChange={e => setPopupForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Campaign Description *</label>
                <textarea
                  placeholder="Describe details shown to customers in popup banner..."
                  value={popupForm.description}
                  onChange={e => setPopupForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 font-semibold">Popup Banner Image (9:16) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste image URL..."
                    value={popupForm.image}
                    onChange={e => setPopupForm(f => ({ ...f, image: e.target.value }))}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  />
                  <div className="relative shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed z-10"
                      id="popup-image-upload"
                    />
                    <label
                      htmlFor="popup-image-upload"
                      className={`h-full px-4 py-2.5 rounded-xl border border-dashed border-gold text-gold font-bold text-xs flex items-center justify-center cursor-pointer transition-all hover:bg-gold/5 ${
                        uploadingImage ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      {uploadingImage ? "Uploading..." : "Upload File"}
                    </label>
                  </div>
                </div>
                {popupForm.image && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-border/80 aspect-[9/16] h-32 self-start bg-muted shadow-sm">
                    <img src={popupForm.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1 font-normal">Directly upload from your device or paste a URL. Display is optimized for a 9:16 aspect ratio.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={popupForm.ctaText}
                    onChange={e => setPopupForm(f => ({ ...f, ctaText: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">CTA Navigation type</label>
                  <select
                    value={popupForm.ctaType}
                    onChange={e => setPopupForm(f => ({ ...f, ctaType: e.target.value as PopupCampaign["ctaType"] }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="coupon">Coupon Page (Checkout)</option>
                    <option value="category">Particular Category</option>
                    <option value="product">Particular Product</option>
                    <option value="offer_collection">Offer Collections</option>
                    <option value="external">External Website Link</option>
                  </select>
                </div>
              </div>

              {popupForm.ctaType !== "coupon" && popupForm.ctaType !== "offer_collection" && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">CTA Navigation Link Target *</label>
                  <input
                    type="text"
                    placeholder={
                      popupForm.ctaType === "category" ? "e.g. Biryani" :
                      popupForm.ctaType === "product" ? "e.g. Chicken Dum Biryani" :
                      "e.g. https://myrestaurant.com"
                    }
                    value={popupForm.ctaLink}
                    onChange={e => setPopupForm(f => ({ ...f, ctaLink: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  />
                </div>
              )}

              {popupForm.ctaType === "offer_collection" && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Smart Collection Target *</label>
                  <select
                    value={popupForm.ctaLink}
                    onChange={e => setPopupForm(f => ({ ...f, ctaLink: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="">— Select Collection —</option>
                    <option value="offers">💸 Special Offers (Discounts & Budget)</option>
                    <option value="bogo">🔥 Buy 1 Get 1 Free (BOGO)</option>
                    <option value="combo">🍱 Combo Deals</option>
                    <option value="under199">💸 Under ₹199</option>
                    <option value="under299">🍲 Under ₹299</option>
                    <option value="starters199">🌶️ Starters Under ₹199</option>
                    <option value="biryani299">🍗 Biryanis Under ₹299</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={popupForm.startDate}
                    onChange={e => setPopupForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">End Date *</label>
                  <input
                    type="date"
                    value={popupForm.endDate}
                    onChange={e => setPopupForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Priority</label>
                  <input
                    type="number"
                    value={popupForm.priority}
                    onChange={e => setPopupForm(f => ({ ...f, priority: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Status</label>
                  <select
                    value={popupForm.status}
                    onChange={e => setPopupForm(f => ({ ...f, status: e.target.value as PopupCampaign["status"] }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-4 flex gap-3 border-t border-border">
              <button
                onClick={() => setShowPopupModal(false)}
                className="flex-1 py-3 rounded-xl border border-border font-bold text-sm text-muted-foreground hover:bg-muted/30 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePopup}
                disabled={saving || !popupForm.title.trim() || !popupForm.image.trim()}
                className="flex-1 py-3 rounded-xl bg-brown-gradient text-cream font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving..." : popupModalMode === "add" ? "Create Popup" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
