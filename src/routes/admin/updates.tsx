import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ref, push, remove, serverTimestamp } from "firebase/database";
import { db } from "@/lib/firebase";
import { useUpdates } from "@/lib/paakashala-store";
import { PlaySquare, Trash2, Plus, Link as LinkIcon } from "lucide-react";

export const Route = createFileRoute("/admin/updates")({
  component: AdminUpdates,
});

function AdminUpdates() {
  const updates = useUpdates();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && !file) return;
    
    setLoading(true);
    try {
      let finalUrl = url.trim();

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "ml_default");
        
        const res = await fetch("https://api.cloudinary.com/v1_1/dqditfw6u/video/upload", {
          method: "POST",
          body: formData
        });
        
        if (!res.ok) {
          throw new Error("Failed to upload video to Cloudinary");
        }
        
        const data = await res.json();
        finalUrl = data.secure_url;
      }

      if (finalUrl) {
        const updatesRef = ref(db, "restaurant/updates");
        await push(updatesRef, {
          videoUrl: finalUrl,
          createdAt: serverTimestamp(),
        });
        setUrl("");
        setFile(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add video");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this video?")) return;
    await remove(ref(db, `restaurant/updates/${id}`));
  };

  // Convert standard YouTube links to embed links if necessary
  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "youtube.com/embed/");
    }
    if (url.includes("youtube.com/shorts/")) {
      return url.replace("youtube.com/shorts/", "youtube.com/embed/");
    }
    return url;
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-brown-deep tracking-tight">Latest Updates</h1>
        <p className="text-muted-foreground mt-1">Manage videos shown on the customer dashboard.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        {/* Add Form */}
        <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm h-fit">
          <div className="flex items-center gap-2 font-bold text-brown-deep mb-4">
            <Plus className="h-5 w-5" /> Add New Video
          </div>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">Direct Video URL (YouTube / MP4)</label>
              <div className="relative mb-3">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  placeholder="https://youtu.be/..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setFile(null);
                  }}
                  className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>

              <div className="flex items-center gap-4 my-4">
                <div className="h-px bg-border flex-1"></div>
                <span className="text-xs text-muted-foreground font-semibold">OR UPLOAD</span>
                <div className="h-px bg-border flex-1"></div>
              </div>

              <label className="block text-xs font-bold text-muted-foreground mb-1">Upload Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                    setUrl("");
                  }
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gold/20 file:text-brown-deep hover:file:bg-gold/30"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || (!url && !file)}
              className="w-full bg-brown-gradient text-cream py-3 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (file ? "Uploading to Cloudinary..." : "Adding...") : "Add to Updates"}
            </button>
          </form>
        </div>

        {/* Video List */}
        <div className="lg:col-span-2 overflow-y-auto pr-2 space-y-4 pb-12">
          {updates.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border/60 rounded-2xl">
              No videos added yet.
            </div>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm flex gap-4">
                <div className="w-48 h-28 shrink-0 bg-muted rounded-xl overflow-hidden relative">
                  {update.videoUrl.includes("youtube") || update.videoUrl.includes("youtu.be") ? (
                    <iframe
                      src={getEmbedUrl(update.videoUrl)}
                      className="w-full h-full object-cover"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video
                      src={`${update.videoUrl}#t=2`}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground break-all line-clamp-3">{update.videoUrl}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(update.id)}
                    className="self-start text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 mt-2"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
