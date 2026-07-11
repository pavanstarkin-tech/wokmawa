import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useSettings } from "@/lib/paakashala-store";
import { Upload, CheckCircle2, AlertCircle, QrCode } from "lucide-react";
import jsQR from "jsqr";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const settings = useSettings();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploading(true);

    try {
      // 1. Decode QR Code locally using Canvas and jsQR
      const qrData = await decodeQR(file);
      if (!qrData) {
        throw new Error("Could not detect a valid QR code in this image. Please upload a clear BharatPe or UPI QR code.");
      }

      // Extract UPI ID from standard upi://pay?pa=... URL
      const urlParams = new URLSearchParams(qrData.split("?")[1] || "");
      const upiId = urlParams.get("pa");
      
      if (!upiId) {
        throw new Error("The QR code does not contain a valid UPI ID. Detected content: " + qrData);
      }

      // 2. Upload Image to ImgBB
      const formData = new FormData();
      formData.append("image", file);
      formData.append("key", "271837f4240842ef12577a95dbae3e88"); // ImgBB API Key

      const uploadRes = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error("Failed to upload image to storage server.");
      }

      const imageUrl = uploadData.data.url;

      // 3. Save to Firebase Settings
      const settingsRef = ref(db, "restaurant/settings");
      await update(settingsRef, {
        upiId: upiId,
        qrImage: imageUrl
      });

      setSuccess(`Successfully linked UPI ID: ${upiId}`);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const decodeQR = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas not supported");

        // Scale down to prevent massive memory usage, but keep enough detail for QR
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH * height) / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => reject("Failed to load image");
      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-brown-deep tracking-tight">Payment Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your UPI QR code to accept digital payments from customers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-brown-deep">BharatPe / UPI QR Code</h2>
            <QrCode className="h-5 w-5 text-gold" />
          </div>

          <div className="w-full max-w-sm mb-8 relative group">
            {settings.qrImage ? (
              <img src={settings.qrImage} alt="Store QR" className="w-full rounded-2xl border-4 border-white shadow-luxe" />
            ) : (
              <div className="w-full aspect-square rounded-2xl border-4 border-dashed border-border/60 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground">
                <QrCode className="h-12 w-12 mb-2 opacity-50" />
                <span className="text-sm font-medium">No QR Code Uploaded</span>
              </div>
            )}
            
            <label className={`absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer transition-opacity backdrop-blur-sm ${settings.qrImage ? 'opacity-0 group-hover:opacity-100' : ''}`}>
              <Upload className="h-8 w-8 mb-2" />
              <span className="font-bold">{uploading ? "Processing..." : (settings.qrImage ? "Update QR Code" : "Upload QR Code")}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="w-full space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">Extracted UPI ID</label>
              <div className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-bold text-brown-deep font-mono">
                {settings.upiId || "Not Configured"}
              </div>
            </div>
            
            {error && (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-medium">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="flex items-start gap-2 text-green-700 bg-green-50 p-3 rounded-xl text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm">
             <h3 className="font-bold text-brown-deep mb-2">How it works</h3>
             <ul className="text-sm text-muted-foreground space-y-3 list-disc pl-4">
               <li>Upload a clear screenshot or image of your BharatPe / Google Pay / PhonePe QR code.</li>
               <li>Our system will automatically scan the image and extract your secure UPI ID.</li>
               <li>When a customer clicks "Proceed to Checkout", they will be seamlessly redirected to their UPI app to pay this exact UPI ID.</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
