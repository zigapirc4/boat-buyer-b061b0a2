
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Anchor, Ship, List, Loader2, ExternalLink, MapPin, ArrowRight, Clock, SlidersHorizontal, Calculator, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSavedBoats } from "@/lib/boatStore";
import { supabase } from "@/integrations/supabase/client";
import { BoatDetailModal } from "@/components/BoatDetailModal";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

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
  const [listings, setListings] = useState<CachedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boatTypeFilter, setBoatTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minLength, setMinLength] = useState<string>("");
  const [maxLength, setMaxLength] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [selectedListing, setSelectedListing] = useState<CachedListing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const COUNTRY_COORDS: Record<string, [number, number]> = {
    slovenia: [46.15, 14.99], croatia: [45.1, 15.2], italy: [41.87, 12.57],
    greece: [39.07, 21.82], france: [46.60, 1.89], spain: [40.46, -3.75],
    germany: [51.17, 10.45], denmark: [56.26, 9.50], sweden: [60.13, 18.64],
    finland: [61.92, 25.75], netherlands: [52.13, 5.29], uk: [55.38, -3.44],
    "united kingdom": [55.38, -3.44], turkey: [38.96, 35.24], montenegro: [42.71, 19.37],
    portugal: [39.40, -8.22], albania: [41.15, 20.17], austria: [47.52, 14.55],
    hungary: [47.16, 19.50], "czech republic": [49.82, 15.47], poland: [51.92, 19.15],
    norway: [60.47, 8.47], florida: [27.66, -81.52], california: [36.78, -119.42],
    texas: [31.97, -99.90],
  };

  function getLocationScore(location: string | null, userLat: number, userLon: number): number {
    if (!location) return 9999;
    const loc = location.toLowerCase();
    let bestDist = 9999;
    for (const [name, [lat, lon]] of Object.entries(COUNTRY_COORDS)) {
      if (loc.includes(name)) {
        const dist = Math.sqrt(Math.pow(userLat - lat, 2) + Math.pow(userLon - lon, 2));
        bestDist = Math.min(bestDist, dist);
      }
    }
    if (bestDist === 9999) {
      const nearbyKeywords = ["adriatic", "mediterranean", "baltic", "europe"];
      if (nearbyKeywords.some(k => loc.includes(k))) bestDist = 20;
    }
    return bestDist;
  }

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserCoords({ lat: latitude, lon: longitude });
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`);
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

  useEffect(() => {
    const fetchListings = async () => {
      try {
        let query = supabase
          .from("cached_listings")
          .select("*")
          .not("price_eur", "is", null)
          .not("image_url", "is", null)
          .neq("image_url", "none")
          .order("scraped_at", { ascending: false })
          .limit(10000);
        if (boatTypeFilter !== "all") query = query.eq("boat_type", boatTypeFilter);
        if (sourceFilter !== "all") query = query.eq("source", sourceFilter);
        const { data, error } = await query;
        if (!error && data) {
          let filtered = data as CachedListing[];
          if (userCoords) {
            filtered.sort((a, b) => {
              const aDist = getLocationScore(a.location, userCoords.lat, userCoords.lon);
              const bDist = getLocationScore(b.location, userCoords.lat, userCoords.lon);
              return aDist - bDist;
            });
          }
          setListings(filtered);
        }
      } catch (e) { console.error("Failed to fetch listings:", e); }
      finally { setIsLoading(false); }
    };
    fetchListings();
  }, [boatTypeFilter, sourceFilter, userCoords]);

  const [allSources, setAllSources] = useState<string[]>([]);
  useEffect(() => {
    const fetchSources = async () => {
      const { data } = await supabase.from("cached_listings").select("source");
      if (data) {
        const s = [...new Set(data.map((d: any) => d.source).filter(Boolean))].sort() as string[];
        setAllSources(s);
      }
    };
    fetchSources();
  }, []);

  const displayListings = listings.filter(l => {
    if (minPrice && l.price_eur !== null && l.price_eur < parseInt(minPrice)) return false;
    if (maxPrice && l.price_eur !== null && l.price_eur > parseInt(maxPrice)) return false;
    if (minLength && l.length_feet !== null && l.length_feet < parseInt(minLength)) return false;
    if (maxLength && l.length_feet !== null && l.length_feet > parseInt(maxLength)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const haystack = `${l.title} ${l.location || ""} ${l.engine_info || ""} ${l.description || ""} ${l.hull_material || ""} ${l.boat_type || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const handleCardClick = (listing: CachedListing) => {
    setSelectedListing(listing);
    setModalOpen(true);
  };

  const getImageUrl = (listing: CachedListing) => {
    if (listing.image_url) return listing.image_url;
    if (listing.image_urls && listing.image_urls.length > 0) return listing.image_urls[0];
    return null;
  };

  const actionCards = [
    { to: "/evaluate", icon: Ship, label: "Evaluate", desc: "Rate any boat", color: "bg-primary/10 text-primary" },
    { to: "/cost", icon: Calculator, label: "Costs", desc: "Annual ownership", color: "bg-accent/10 text-accent" },
    { to: "/my-boats", icon: List, label: "My Boats", desc: savedCount > 0 ? `${savedCount} saved` : "Your shortlist", color: "bg-success/10 text-success", badge: savedCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Hero */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary shrink-0">
            <Anchor className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-primary leading-tight">BoatBuyer</h1>
            <p className="text-sm text-muted-foreground">Smart boat purchase decisions</p>
          </div>
          {locationLabel && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <MapPin className="w-3 h-3" /> {locationLabel}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Action Cards Row */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          {actionCards.map((card) => (
            <Link key={card.to} to={card.to} className="group">
              <Card className="p-4 flex flex-col items-center text-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 border-transparent hover:border-primary/20">
                <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5 justify-center">
                    {card.label}
                    {card.badge ? (
                      <span className="bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{card.badge}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search boats… (e.g. Bavaria 37, Croatia, diesel)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-11 rounded-xl border bg-card pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              {locationLabel ? `Boats near ${locationLabel}` : "Latest Listings"}
              {!isLoading && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({displayListings.length.toLocaleString()})
                </span>
              )}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <Select value={boatTypeFilter} onValueChange={setBoatTypeFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sailboat">Sailboats</SelectItem>
                  <SelectItem value="powerboat">Powerboats</SelectItem>
                </SelectContent>
              </Select>
              {allSources.length > 1 && (
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {allSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1 rounded-lg"
                onClick={() => setShowFilters(f => !f)}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                {(minPrice || maxPrice || minLength || maxLength) && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 p-3 rounded-xl border bg-card shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Price €</span>
                <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-24 h-8 rounded-lg border bg-background px-2 text-xs" />
                <span className="text-xs text-muted-foreground">–</span>
                <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-24 h-8 rounded-lg border bg-background px-2 text-xs" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Length ft</span>
                <input type="number" placeholder="Min" value={minLength} onChange={e => setMinLength(e.target.value)} className="w-20 h-8 rounded-lg border bg-background px-2 text-xs" />
                <span className="text-xs text-muted-foreground">–</span>
                <input type="number" placeholder="Max" value={maxLength} onChange={e => setMaxLength(e.target.value)} className="w-20 h-8 rounded-lg border bg-background px-2 text-xs" />
              </div>
              {(minPrice || maxPrice || minLength || maxLength) && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setMinPrice(""); setMaxPrice(""); setMinLength(""); setMaxLength(""); }}>
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-16">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading latest boats…
          </div>
        ) : displayListings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
            {displayListings.map((listing) => {
              const img = getImageUrl(listing);
              return (
                <Card
                  key={listing.id}
                  className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col cursor-pointer group"
                  onClick={() => handleCardClick(listing)}
                >
                  <div className="relative">
                    {img ? (
                      <img
                        src={img}
                        alt={listing.title}
                        className="w-full h-44 object-cover transition-transform group-hover:scale-[1.02]"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-44 bg-muted flex items-center justify-center">
                        <Ship className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}
                    {listing.boat_type && (
                      <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-full capitalize">
                        {listing.boat_type}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col">
                    <p className="font-semibold text-sm truncate leading-tight">{listing.title}</p>
                    {listing.price_eur && (
                      <p className="text-lg font-bold text-primary mt-0.5">€{Number(listing.price_eur).toLocaleString()}</p>
                    )}
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                      {listing.year && <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{listing.year}</span>}
                      {listing.length_feet && <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{Number(listing.length_feet)}ft</span>}
                      {listing.hull_material && <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">{listing.hull_material}</span>}
                    </div>
                    {listing.location && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{listing.location}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <p className="text-[10px] text-muted-foreground/60 truncate">{listing.source}</p>
                      <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
                        <Clock className="w-2.5 h-2.5" /> {timeAgo(listing.scraped_at)}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 h-7 rounded-lg" onClick={(e) => { e.stopPropagation(); handleCardClick(listing); }}>
                        <ArrowRight className="w-3 h-3" /> Details
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1 h-7 rounded-lg" onClick={(e) => e.stopPropagation()} asChild>
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
          <p className="text-sm text-muted-foreground text-center py-8">No listings cached yet. They'll appear after the next daily scrape.</p>
        )}
      </div>

      <BoatDetailModal listing={selectedListing} open={modalOpen} onOpenChange={setModalOpen} timeAgo={timeAgo} />
    </div>
  );
};

export default Index;
