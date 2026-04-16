import { Link } from "react-router-dom";
import { Anchor, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export const Header = () => {
  const [locationLabel, setLocationLabel] = useState("");

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
    <div className="bg-gradient-to-br from-primary via-ocean to-sky text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-white">BoatBuyer</h1>
              <p className="text-white/75 text-xs">Smart boat purchase decisions</p>
            </div>
          </Link>
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            {locationLabel && (
              <span className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <MapPin className="w-3 h-3" /> {locationLabel}
              </span>
            )}
            <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground font-semibold text-xs gap-1.5 rounded-full px-4">
                <Heart className="w-3.5 h-3.5" /> Donate
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
