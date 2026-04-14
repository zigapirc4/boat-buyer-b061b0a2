
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Calculator, Ship, List, Loader2, ExternalLink, MapPin, ArrowRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSavedBoats } from "@/lib/boatStore";
import { supabase } from "@/integrations/supabase/client";

interface CachedListing {
  id: string;
  title: string;
  url: string;
  boat_type: string;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  engine_info: string | null;
  description: string | null;
  hull_material: string | null;
  source: string | null;
  scraped_at: string;
}

const Index = () => {
  const savedCount = getSavedBoats().length;
  const navigate = useNavigate();
  const [listings, setListings] = useState<CachedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boatTypeFilter, setBoatTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");

  // Detect user country via reverse geocoding
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`
            );
            const data = await res.json();
            const country = data?.address?.country || null;
            if (country) {
              setUserCountry(country);
              setLocationLabel(data?.address?.city || data?.address?.town || data?.address?.state || country);
            }
          } catch {
            // silently fail
          }
        },
        () => {}, // permission denied - that's fine
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        let query = supabase
          .from("cached_listings")
          .select("*")
          .order("scraped_at", { ascending: false })
          .limit(50);

        if (boatTypeFilter !== "all") {
          query = query.eq("boat_type", boatTypeFilter);
        }

        const { data, error } = await query;
        if (!error && data) {
          let filtered = data as CachedListing[];
          if (sourceFilter !== "all") {
            filtered = filtered.filter(l => l.source === sourceFilter);
          }

          // Sort: listings matching user's country first
          if (userCountry) {
            const countryLower = userCountry.toLowerCase();
            filtered.sort((a, b) => {
              const aMatch = a.location?.toLowerCase().includes(countryLower) ? 1 : 0;
              const bMatch = b.location?.toLowerCase().includes(countryLower) ? 1 : 0;
              return bMatch - aMatch;
            });
          }

          setListings(filtered);
        }
      } catch (e) {
        console.error("Failed to fetch listings:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchListings();
  }, [boatTypeFilter, userCountry]);

  const sources = [...new Set(listings.map(l => l.source).filter(Boolean))].sort();
  const displayListings = sourceFilter !== "all" ? listings.filter(l => l.source === sourceFilter) : listings;

  const handleCompare = (listing: CachedListing) => {
    navigate(`/evaluate?url=${encodeURIComponent(listing.url)}`);
  };

  const getImageUrl = (listing: CachedListing) => {
    if (listing.image_url) return listing.image_url;
    if (listing.image_urls && listing.image_urls.length > 0) return listing.image_urls[0];
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="text-center mb-12 animate-fade-in pt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-6">
          <Anchor className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-primary mb-2">BoatBuyer</h1>
        <p className="text-muted-foreground text-lg">Smart boat purchase decisions</p>
      </div>

      <div className="w-full max-w-sm space-y-4 animate-fade-in">
        <Button asChild className="w-full h-14 text-base gap-3" size="lg">
          <Link to="/evaluate"><Ship className="w-5 h-5" /> Evaluate a Boat</Link>
        </Button>
        <Button asChild variant="secondary" className="w-full h-14 text-base gap-3" size="lg">
          <Link to="/cost"><Calculator className="w-5 h-5" /> Calculate Ownership Cost</Link>
        </Button>
        <Button asChild variant="outline" className="w-full h-14 text-base gap-3" size="lg">
          <Link to="/my-boats">
            <List className="w-5 h-5" /> My Boats
            {savedCount > 0 && (
              <span className="ml-auto bg-accent text-accent-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                {savedCount}
              </span>
            )}
          </Link>
        </Button>
      </div>

      {/* Latest Listings Section */}
      <div className="w-full max-w-4xl mt-16 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            🔥 Latest Listings
          </h2>
          <div className="flex gap-2">
            <Select value={boatTypeFilter} onValueChange={setBoatTypeFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sailboat">Sailboats</SelectItem>
                <SelectItem value="powerboat">Powerboats</SelectItem>
              </SelectContent>
            </Select>
            {sources.length > 1 && (
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map(s => <SelectItem key={s!} value={s!}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading latest boats…
          </div>
        ) : displayListings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayListings.map((listing) => {
              const img = getImageUrl(listing);
              return (
                <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  {img && (
                    <img
                      src={img}
                      alt={listing.title}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="font-semibold text-sm truncate">{listing.title}</p>
                    {listing.price_eur && (
                      <p className="text-lg font-bold text-primary mt-1">€{Number(listing.price_eur).toLocaleString()}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {listing.year && <span className="text-xs text-muted-foreground">{listing.year}</span>}
                      {listing.length_feet && <span className="text-xs text-muted-foreground">{Number(listing.length_feet)}ft</span>}
                      {listing.boat_type && (
                        <span className="text-xs text-muted-foreground capitalize">{listing.boat_type}</span>
                      )}
                      {listing.hull_material && (
                        <span className="text-xs text-muted-foreground capitalize">{listing.hull_material}</span>
                      )}
                    </div>
                    {listing.location && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {listing.location}
                      </p>
                    )}
                    {listing.engine_info && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">⚙️ {listing.engine_info}</p>
                    )}
                    {listing.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{listing.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{listing.source}</p>

                    <div className="flex gap-2 mt-auto pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs gap-1"
                        onClick={() => handleCompare(listing)}
                      >
                        <ArrowRight className="w-3 h-3" /> Compare
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs gap-1"
                        asChild
                      >
                        <a href={listing.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No listings cached yet. They'll appear after the next daily scrape.</p>
        )}
      </div>
    </div>
  );
};

export default Index;
