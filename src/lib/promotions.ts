import { useEffect, useState } from "react";
import { ref, onValue, set, push, remove, update, increment, get } from "firebase/database";
import { db } from "./firebase";

export interface OfferCondition {
  minCartValue?: number;
  buyProductId?: string;
  buyCategoryId?: string;
  buyQuantity?: number;
  freeProductId?: string;
  freeCategoryId?: string;
  freeQuantity?: number;
  requiredQuantity?: number;
  limit?: number; // limit per customer or order
}

export interface OfferReward {
  discountPercentage?: number;
  discountValue?: number;
  freeProductId?: string;
  freeQuantity?: number;
  bundlePrice?: number;
  mixMatchPrice?: number;
  giftProductId?: string;
}

export interface OfferSchedule {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  startTime?: string; // "16:00"
  endTime?: string; // "19:00"
  weekdays?: string[]; // ["Monday", "Tuesday", etc]
  timezone?: string;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  type: 
    | "percentage" 
    | "fixed" 
    | "cart_value" 
    | "bogo" 
    | "buy_x_get_y" 
    | "category_bogo" 
    | "bundle" 
    | "mix_and_match" 
    | "free_gift" 
    | "happy_hours" 
    | "weekend" 
    | "coupon";
  status: "active" | "inactive" | "scheduled" | "expired";
  priority: number; // Higher numbers take priority
  targetType: "entire_order" | "categories" | "products";
  targetCategories?: string[];
  targetProducts?: string[];
  conditions?: OfferCondition;
  rewards?: OfferReward;
  couponCode?: string;
  isStackable: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: number;
}

export interface PopupCampaign {
  id: string;
  image: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaType: "offer_collection" | "category" | "product" | "external" | "coupon";
  ctaLink?: string; // Link target or code
  offerId?: string; // Optional reference to a promotional offer
  startDate: string;
  endDate: string;
  priority: number;
  status: "active" | "inactive";
  views: number;
  clicks: number;
  createdAt: number;
}

export interface PromotionLog {
  id: string;
  orderId: string;
  userId: string;
  offerId: string;
  discountApplied: number;
  timestamp: number;
}

/* ---------- Firebase Offers API ---------- */

export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const offersRef = ref(db, "restaurant/offers");
    const unsub = onValue(offersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setOffers([]);
        setLoading(false);
        return;
      }
      
      const parsedOffers: Offer[] = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      // Sort by priority descending
      parsedOffers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      setOffers(parsedOffers);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { offers, loading };
}

export async function createOffer(offerData: Omit<Offer, "id" | "createdAt" | "usageCount">) {
  const offersRef = ref(db, "restaurant/offers");
  const newOfferRef = push(offersRef);
  const newOffer: Offer = {
    id: newOfferRef.key!,
    ...offerData,
    usageCount: 0,
    createdAt: Date.now(),
  };
  await set(newOfferRef, newOffer);
  return newOffer;
}

export async function updateOffer(id: string, offerData: Partial<Offer>) {
  const offerRef = ref(db, `restaurant/offers/${id}`);
  await update(offerRef, offerData);
}

export async function deleteOffer(id: string) {
  const offerRef = ref(db, `restaurant/offers/${id}`);
  await remove(offerRef);
}

/* ---------- Firebase Popup Campaigns API ---------- */

export function usePopupCampaigns() {
  const [campaigns, setCampaigns] = useState<PopupCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const campaignsRef = ref(db, "restaurant/popup_campaigns");
    const unsub = onValue(campaignsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setCampaigns([]);
        setLoading(false);
        return;
      }
      
      const parsedCampaigns: PopupCampaign[] = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      // Sort by priority descending
      parsedCampaigns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      setCampaigns(parsedCampaigns);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { campaigns, loading };
}

export async function createPopupCampaign(campaignData: Omit<PopupCampaign, "id" | "createdAt" | "views" | "clicks">) {
  const campaignsRef = ref(db, "restaurant/popup_campaigns");
  const newRef = push(campaignsRef);
  const newCampaign: PopupCampaign = {
    id: newRef.key!,
    ...campaignData,
    views: 0,
    clicks: 0,
    createdAt: Date.now(),
  };
  await set(newRef, newCampaign);
  return newCampaign;
}

export async function updatePopupCampaign(id: string, campaignData: Partial<PopupCampaign>) {
  const campaignRef = ref(db, `restaurant/popup_campaigns/${id}`);
  await update(campaignRef, campaignData);
}

export async function deletePopupCampaign(id: string) {
  const campaignRef = ref(db, `restaurant/popup_campaigns/${id}`);
  await remove(campaignRef);
}

export async function recordPopupView(id: string) {
  const campaignRef = ref(db, `restaurant/popup_campaigns/${id}`);
  await update(campaignRef, {
    views: increment(1),
  });
}

export async function recordPopupClick(id: string) {
  const campaignRef = ref(db, `restaurant/popup_campaigns/${id}`);
  await update(campaignRef, {
    clicks: increment(1),
  });
}

/* ---------- Firebase Promotion Logs API ---------- */

export async function logPromotionUsage(orderId: string, userId: string, offerId: string, discountApplied: number) {
  // Update usage counts on the offer itself
  const offerRef = ref(db, `restaurant/offers/${offerId}`);
  await update(offerRef, {
    usageCount: increment(1),
  });

  // Log in promotion logs
  const logsRef = ref(db, "restaurant/promotion_logs");
  const newLogRef = push(logsRef);
  await set(newLogRef, {
    id: newLogRef.key!,
    orderId,
    userId,
    offerId,
    discountApplied,
    timestamp: Date.now(),
  });
}

export function usePromotionLogs() {
  const [logs, setLogs] = useState<PromotionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsRef = ref(db, "restaurant/promotion_logs");
    const unsub = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setLogs([]);
        setLoading(false);
        return;
      }
      
      const parsedLogs: PromotionLog[] = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      // Sort newest first
      parsedLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(parsedLogs);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { logs, loading };
}

// ─── Smart Collections ────────────────────────────────────────────────────────

export function useSmartCollections(): Record<string, string[]> {
  const [data, setData] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const r = ref(db, "restaurant/smart_collections");
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) setData(snap.val());
      else setData({});
    });
    return () => unsub();
  }, []);
  return data;
}

export async function saveSmartCollection(collectionId: string, itemIds: string[]) {
  await set(ref(db, `restaurant/smart_collections/${collectionId}`), itemIds);
}
