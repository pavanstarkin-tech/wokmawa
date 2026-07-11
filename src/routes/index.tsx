import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Sparkles, Search, Plus, Minus, Leaf, Drumstick, PlayCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart, useMenu, useUpdates } from "@/lib/paakashala-store";
import { AppShell } from "@/components/paakashala/AppShell";
import { HeroCarousel } from "@/components/paakashala/HeroCarousel";
import { FeaturedCard } from "@/components/paakashala/FeaturedCard";
import { MiniCategoryCard } from "@/components/paakashala/MiniCategoryCard";
import { CATEGORIES, CATEGORY_IMAGE, MENU, FEATURED_IDS, type Category } from "@/lib/paakashala-menu";

export const Route = createFileRoute("/")({
  component: Index,
});

// Helper to convert standard YouTube links to embed links
const getEmbedUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("youtube.com/watch?v=")) return url.replace("watch?v=", "embed/");
  if (url.includes("youtu.be/")) return url.replace("youtu.be/", "youtube.com/embed/");
  if (url.includes("youtube.com/shorts/")) return url.replace("youtube.com/shorts/", "youtube.com/embed/");
  return url;
};

function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Aggressive Blob Caching
  useEffect(() => {
    let active = true;
    const loadVideo = async () => {
      try {
        const cache = await caches.open('video-cache-v1');
        const cached = await cache.match(src);
        if (cached) {
          const blob = await cached.blob();
          if (active) setObjectUrl(URL.createObjectURL(blob));
          return;
        }
        const response = await fetch(src);
        if (response.ok) {
          cache.put(src, response.clone());
          const blob = await response.blob();
          if (active) setObjectUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        console.error("Cache fetch failed, falling back to network url", err);
        if (active) setObjectUrl(src); // Fallback to raw url
      }
    };
    loadVideo();
    return () => { active = false; };
  }, [src]);

  // Autoplay Observer
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !objectUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Attempt to auto-play with sound
            video.muted = false;
            video.play().then(() => {
              setIsMuted(false);
            }).catch(() => {
              // Browser blocked unmuted autoplay, fallback to muted
              video.muted = true;
              video.play().then(() => {
                setIsMuted(true);
              }).catch(() => {}); // Catch all
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.7 } // Play when 70% visible
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [objectUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      // Direct user interaction guarantees audio will be allowed
      video.muted = false;
      setIsMuted(false);
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handlePlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setIsPlaying(true);
    
    // Pause and mute all other videos on the page
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
      if (v !== e.target) {
        v.muted = true;
        v.pause();
      }
    });
  };

  return (
    <div className="relative w-full h-full" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={objectUrl || ""}
        loop
        muted={isMuted}
        playsInline
        preload="auto"
        onPlay={handlePlay}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-cover cursor-pointer"
      />
      
      {/* Central Play Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none transition-opacity">
          <div className="h-14 w-14 rounded-full bg-cream/90 backdrop-blur-md flex items-center justify-center shadow-luxe">
            <PlayCircle className="h-8 w-8 text-brown-deep fill-brown-deep/20" />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, kicker, action }: { title: string; kicker?: string; action?: { to: "/menu"; label: string } }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div className="min-w-0">
        {kicker && <div className="text-[10px] tracking-[0.35em] uppercase text-gold">{kicker}</div>}
        <h2 className="mt-0.5 truncate text-xl font-semibold text-brown-deep">{title}</h2>
      </div>
      {action && (
        <Link to={action.to} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brown-deep hover:text-gold">
          {action.label} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(CATEGORIES[2]);
  const [typeFilter, setTypeFilter] = useState<"all" | "veg" | "non-veg">("all");

  const fullMenu = useMenu();
  const updates = useUpdates();

  const filteredMenu = typeFilter === "all" ? fullMenu : fullMenu.filter(m => m.type === typeFilter);

  const featured = FEATURED_IDS.map((id) => filteredMenu.find((m) => m.id === id)).filter(Boolean) as typeof fullMenu;
  const chefPicks = filteredMenu.filter((m) => ["Chicken Lollipop", "Paneer Butter Masala", "Mutton Ghee Roast", "Chilli Prawns", "Kalmi Kebab (Half)"].includes(m.name));
  const bestBiryani = filteredMenu.filter((m) => m.category === "Biryani").slice(0, 6);
  const andhra = filteredMenu.filter((m) => m.category === "South Indian Starters").slice(0, 6);

  return (
    <AppShell>
      <section className="animate-fade-up">
        <HeroCarousel />
      </section>

      {/* Latest Updates Section */}
      {updates.length > 0 && (
        <section className="mt-8 animate-fade-up">
          <Section kicker="From the Kitchen" title="Latest Updates" />
          <div className="-mx-[15px] overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <div className="flex gap-2.5 px-[15px] pb-4 w-max">
              {updates.map((update) => (
                <div key={update.id} className="w-[135px] shrink-0 bg-card rounded-3xl overflow-hidden shadow-luxe border border-border/60 snap-center">
                  <div className="h-[240px] w-full bg-black relative">
                    {update.videoUrl.includes("youtube") || update.videoUrl.includes("youtu.be") ? (
                      <iframe
                        src={getEmbedUrl(update.videoUrl)}
                        className="w-full h-full object-cover pointer-events-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <VideoPlayer src={update.videoUrl} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mt-8 animate-fade-up">
        <Section kicker="Curated for you" title="Browse the Menu" action={{ to: "/menu", label: "View all" }} />
      </section>

      <div className="relative z-10 -mx-4 px-4 pt-2 pb-3 mb-2">
        <div className="flex items-center gap-3">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                navigate({ to: "/menu", search: { q: searchQuery.trim() } });
              }
            }} className="relative w-[75%]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search biryani…" 
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-xs shadow-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-all"
              />
            </form>

            <div className="w-[25%] flex items-center justify-center gap-1.5 bg-card border border-border/80 px-2 py-2 rounded-xl shadow-sm">
              <span className={`text-[9px] font-bold transition-colors ${typeFilter === 'veg' ? 'text-green-700' : 'text-muted-foreground/50'}`}>VEG</span>
              
              <button 
                onClick={() => {
                  if (typeFilter === 'all') setTypeFilter('veg');
                  else if (typeFilter === 'veg') setTypeFilter('non-veg');
                  else setTypeFilter('all');
                }}
                className={`relative flex h-4 w-10 items-center rounded-full transition-colors ${
                  typeFilter === 'all' ? 'bg-muted-foreground/20' : typeFilter === 'veg' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                <div 
                  className={`absolute h-3.5 w-3.5 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                    typeFilter === 'all' 
                      ? 'translate-x-[13px] bg-muted-foreground' 
                      : typeFilter === 'veg' 
                      ? 'translate-x-[2px] bg-green-500' 
                      : 'translate-x-[24px] bg-red-500'
                  }`}
                >
                   <div className="h-1 w-1 rounded-full bg-white" />
                </div>
              </button>
              
              <span className={`text-[9px] font-bold transition-colors ${typeFilter === 'non-veg' ? 'text-red-700' : 'text-muted-foreground/50'}`}>NON-VEG</span>
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-20 -mx-4 bg-background/85 backdrop-blur-md border-b border-border/60 mb-6">
          <div className="overflow-x-auto no-scrollbar py-3">
            <div className="flex gap-4 px-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    const isOpening = activeCategory !== c;
                    setActiveCategory(isOpening ? c : null);
                    if (isOpening) {
                      setTimeout(() => {
                        const el = document.getElementById("dynamic-category-section");
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.scrollY - 100;
                          window.scrollTo({ top: y, behavior: "smooth" });
                        }
                      }, 50);
                    }
                  }}
                  className={`group relative flex w-[72px] shrink-0 flex-col items-center gap-2 transition active:scale-95 ${activeCategory === c ? 'scale-105' : ''}`}
                >
                  <div className={`h-[72px] w-[72px] overflow-hidden rounded-full shadow-luxe p-0.5 bg-card transition-colors ${activeCategory === c ? 'border-2 border-gold' : 'border border-gold/30'}`}>
                    <img src={CATEGORY_IMAGE[c]} alt={c} loading="lazy" className="h-full w-full rounded-full object-cover transition duration-500 group-hover:scale-110" />
                  </div>
                  <div className={`w-full text-center text-[10px] font-semibold leading-tight line-clamp-2 ${activeCategory === c ? 'text-gold' : 'text-brown-deep'}`}>
                    {c}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Category Products */}
        {activeCategory && (
          <div id="dynamic-category-section" className="mt-4 animate-fade-up bg-luxe-gradient -mx-4 px-4 py-4 border-y border-gold/20 shadow-inner">
            <div className="mb-3 flex items-end justify-between">
              <h3 className="text-sm font-semibold text-brown-deep">
                {activeCategory}
              </h3>
              <Link to="/menu" search={{ category: activeCategory }} className="text-[10px] font-semibold uppercase tracking-widest text-gold hover:underline">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-2">
                {filteredMenu.filter((m) => m.category === activeCategory).map((f) => (
                  <div key={f.id}>
                    <MiniCategoryCard item={f} />
                  </div>
                ))}
              </div>
          </div>
        )}

      <section className="mt-8 animate-fade-up">
        <Section kicker="Today's Highlights" title="Freshly Curated" action={{ to: "/menu", label: "See menu" }} />
        <div className="grid grid-cols-3 gap-2 mt-2">
          {featured.map((f) => <FeaturedCard key={f.id} item={f} />)}
        </div>
      </section>

      <section className="mt-8 animate-fade-up">
        <div 
          className="mt-8 rounded-3xl p-6 text-cream shadow-luxe relative overflow-hidden bg-brown-deep"
          style={{
            backgroundImage: "url('https://i.ibb.co/q3ykTymX/Chat-GPT-Image-Jul-10-2026-11-59-40-PM.png')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <Sparkles className="absolute right-[-10%] top-[-10%] h-48 w-48 opacity-10 mix-blend-overlay" />
          
          <div className="relative z-10">
            <div className="text-[9px] tracking-[0.3em] text-gold uppercase font-bold">Chef's Table</div>
            <h2 className="mt-1 text-lg font-bold leading-tight max-w-[200px]">
              A composed spread, <br />poured with care.
            </h2>
            <p className="mt-1.5 text-[10px] text-cream/90 leading-relaxed max-w-[240px]">
              From Andhra classics to Mughlai biryanis — every plate is finished at our heritage kitchen.
            </p>
            <Link to="/menu" className="mt-3.5 inline-flex bg-gold-gradient text-brown-deep px-4 py-2 rounded-xl text-[9px] uppercase font-bold tracking-widest shadow-sm hover:opacity-90 transition active:scale-95">
              Explore Signature Flavours
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 animate-fade-up">
        <Section kicker="Chef's Picks" title="House Favourites" />
        <div className="grid grid-cols-3 gap-2 mt-2">
          {chefPicks.map((f) => <FeaturedCard key={f.id} item={f} />)}
        </div>
      </section>

      <section className="mt-8 animate-fade-up">
        <Section kicker="Bestselling" title="Biryani Specials" action={{ to: "/menu", label: "All biryanis" }} />
        <div className="grid grid-cols-3 gap-2 mt-2">
          {bestBiryani.map((f) => <FeaturedCard key={f.id} item={f} />)}
        </div>
      </section>

      <section className="mt-8 mb-4 animate-fade-up">
        <Section kicker="Authentic Andhra" title="South Indian Starters" action={{ to: "/menu", label: "See more" }} />
        <div className="grid grid-cols-3 gap-2 mt-2">
          {andhra.map((f) => <FeaturedCard key={f.id} item={f} />)}
        </div>
      </section>
    </AppShell>
  );
}
