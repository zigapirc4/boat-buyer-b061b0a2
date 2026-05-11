import { Link } from "react-router-dom";
import { Heart, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { FeedbackButton } from "@/components/FeedbackButton";
import { cn } from "@/lib/utils";
import { useSupportFirstVisitHint } from "@/hooks/useSupportFirstVisitHint";

export const Header = () => {
  const [locationLabel, setLocationLabel] = useState("");
  const { showHint, acknowledge } = useSupportFirstVisitHint();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`);
            const data = await res.json();
            const city = data?.address?.city || data?.address?.town || data?.address?.state;
            const country = data?.address?.country;
            setLocationLabel(city || country || "");
          } catch { setLocationLabel(""); }
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  return (
    <div className="hero-header-bg text-primary-foreground">
      <div className="app-shell py-4 sm:py-6">
        <div className="sticky top-0 z-40 -mx-4 px-4 py-2 mb-4">
          <div className="flex items-center justify-start sm:justify-end gap-4 pl-2 sm:pl-0 overflow-x-auto whitespace-nowrap scrollbar-none">
            <Link to="/buyers-guides" className="top-nav-link">Buyer’s Guides</Link>
            <Link to="/my-story" className="top-nav-link">My Story</Link>
            <Link to="/my-boats" className="top-nav-link">My Boats</Link>
            <div className="shrink-0">
              <FeedbackButton />
            </div>
            <a
              href="https://buymeacoffee.com/pirczigau"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("top-nav-cta", showHint && "support-first-visit-hint")}
              onClick={acknowledge}
            >
              <Heart className="w-3.5 h-3.5" /> Support
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center">
            <img src="/logo-horizontal.png" alt="BoatBuyer" className="h-10 sm:h-11 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            {locationLabel && (
              <span className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <MapPin className="w-3 h-3" /> {locationLabel}
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-white/75">We highly value your feedback - it helps us improve BoatBuyer for everyone.</p>
      </div>
    </div>
  );
};
