import { Link, useLocation } from "react-router-dom";
import { Heart, MapPin, Home, Ship, Calculator, List, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FeedbackButton } from "@/components/FeedbackButton";

const NAV_ITEMS: Array<{ to: string; icon: any; label: string; state?: Record<string, unknown> }> = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/", icon: Ship, label: "Import", state: { openImport: true } },
  { to: "/cost", icon: Calculator, label: "Costs" },
  { to: "/my-boats", icon: List, label: "My Boats" },
];

export const Header = () => {
  const [locationLabel, setLocationLabel] = useState("");
  const location = useLocation();

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
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center">
            <img src="/logo-horizontal.png" alt="BoatBuyer" className="h-10 sm:h-11 w-auto" />
          </Link>
          <Link
            to="/my-story"
            className={cn(
              "sm:hidden ml-auto w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              location.pathname === "/my-story" ? "bg-white/30 text-white" : "bg-white/10 text-white/85 hover:bg-white/20",
            )}
            aria-label="My Story"
            title="My Story"
          >
            <BookOpen className="w-4 h-4" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            {locationLabel && (
              <span className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <MapPin className="w-3 h-3" /> {locationLabel}
              </span>
            )}
            <FeedbackButton />
            <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground font-semibold text-xs gap-1.5 rounded-full px-4">
                <Heart className="w-3.5 h-3.5" /> Donate
              </Button>
            </a>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-white/75">We highly value your feedback - it helps us improve BoatBuyer for everyone.</p>

        {/* Navigation */}
        <nav className="flex gap-1 mt-4">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                state={item.state}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/15 hover:text-white/90"
                )}
              >
                <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
