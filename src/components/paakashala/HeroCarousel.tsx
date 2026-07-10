import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const SLIDES = [
  {
    title: "Slide 1",
    image: "https://i.ibb.co/bMBcFL4D/hero-1-clean.png",
  },
  {
    title: "Slide 2",
    image: "https://i.ibb.co/QvRqBRDW/hero-2-clean.png",
  },
  {
    title: "Slide 3",
    image: "https://i.ibb.co/bgpnR6Sk/hero-3-clean.png",
  },
  {
    title: "Slide 4",
    image: "https://i.ibb.co/PG3brMJv/hero-4-clean.png",
  },
  {
    title: "Slide 5",
    image: "https://i.ibb.co/Fqc9pcTK/hero-5-clean.png",
  },
];

export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    const t = setInterval(() => {
      api.scrollNext();
    }, 5000);
    return () => clearInterval(t);
  }, [api]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-gold/40 shadow-luxe">
      <Carousel
        setApi={setApi}
        opts={{
          loop: true,
        }}
        className="h-full w-full"
      >
        <CarouselContent className="h-full -ml-0">
          {SLIDES.map((s) => (
            <CarouselItem key={s.title} className="h-full pl-0">
              <img
                src={s.image}
                alt={s.title}
                className="h-full w-full object-contain"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="absolute top-4 right-4 z-10 flex gap-1.5">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Slide ${idx + 1}`}
            onClick={() => api?.scrollTo(idx)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: idx === current ? 22 : 8,
              background: idx === current ? "linear-gradient(90deg,#B8862A,#E4C579)" : "rgba(255,249,242,0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
