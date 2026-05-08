import { useEffect, useState } from "react";
import { BookOpen, Heart, List, MapPin, Ship, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackButton } from "@/components/FeedbackButton";
import { getSavedBoats, deleteBoat, getSavedListings, removeListing, type SavedBoat, type SavedListing } from "@/lib/boatStore";
import { BoatDetailModal } from "@/components/BoatDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { cachedListingUrlVariants } from "@scrapeShared/listingSites";
import { BoatListingCard } from "@/components/BoatListingCard";
import { evaluate, type BoatType } from "@/lib/evaluateBoat";

const verdictColor = (v: string) => v === "Good Deal" ? "text-success" : v === "Fair Deal" ? "text-warning" : "text-destructive";

interface CachedListing {
  id: string;
  title: string;
  url: string;
  boat_type: string | null;
  segment?: string | null;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  engine_info: string | null;
  description: string | null;
  hull_material: string | null;
  engine_hours?: number | null;
  source: string | null;
  scraped_at: string;
}

const timeAgo = (dateStr: string) => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const MyBoats = () => {
  const [boats, setBoats] = useState<SavedBoat[]>(getSavedBoats);
  const [listings, setListings] = useState<SavedListing[]>(getSavedListings);
  const [cachedListings, setCachedListings] = useState<CachedListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<CachedListing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"details" | "evaluate" | "costs">("details");
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [locationLabel, setLocationLabel] = useState("");
  const savedCount = listings.length;

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`,
            );
            const data = await res.json();
            const city = data?.address?.city || data?.address?.town || data?.address?.state;
            const country = data?.address?.country;
            setLocationLabel(city || country || "");
          } catch {
            setLocationLabel("");
          }
        },
        () => {},
        { timeout: 5000 },
      );
    }
  }, []);

  useEffect(() => {
    const loadCachedListings = async () => {
      const ids = getSavedListings().map((l) => l.id);
      if (ids.length === 0) {
        setCachedListings([]);
        return;
      }
      const { data } = await supabase.from("cached_listings").select("*").in("id", ids);
      if (data) {
        setCachedListings(data as CachedListing[]);
      }
    };
    loadCachedListings();
  }, [listings]);

  const handleDelete = (id: string) => {
    deleteBoat(id);
    setBoats(getSavedBoats());
  };

  const handleRemoveListing = (id: string) => {
    removeListing(id);
    setListings(getSavedListings());
    setCachedListings((prev) => prev.filter((l) => l.id !== id));
  };

  const getImageUrl = (listing: CachedListing) => {
    if (listing.image_url) return listing.image_url;
    if (listing.image_urls && listing.image_urls.length > 0) return listing.image_urls[0];
    return null;
  };

  const getDealInsight = (listing: CachedListing, dataset: CachedListing[]) => {
    if (!listing.price_eur || !listing.length_feet || !listing.year || !listing.segment) {
      return {
        gapPct: null,
        label: "No market data" as const,
        shortReason: "Missing year/length/price/segment",
      };
    }

    const comps = dataset
      .filter(
        (c) =>
          c.id !== listing.id &&
          c.price_eur &&
          c.length_feet &&
          c.year &&
          c.segment &&
          c.boat_type === listing.boat_type &&
          c.segment === listing.segment &&
          Math.abs((c.year || 0) - listing.year!) <= 2 &&
          Math.abs((c.length_feet || 0) - listing.length_feet!) <= 3,
      )
      .slice(0, 60);

    if (comps.length < 4) {
      return {
        gapPct: null,
        label: "No market data" as const,
        shortReason: "Too few segment-matched comparables",
      };
    }

    const sorted = comps
      .map((c) => Number(c.price_eur))
      .sort((a, b) => a - b);
    const fairPrice = sorted[Math.floor(sorted.length / 2)];
    const rawGapPct = ((fairPrice - Number(listing.price_eur)) / Number(listing.price_eur)) * 100;
    let qualityScore = 100;
    const age = listing.year ? new Date().getFullYear() - listing.year : null;
    const desc = (listing.description || "").toLowerCase();
    const eng = (listing.engine_info || "").toLowerCase();

    if (age !== null) {
      if (age > 35) qualityScore -= 45;
      else if (age > 30) qualityScore -= 35;
      else if (age > 25) qualityScore -= 25;
      else if (age > 15) qualityScore -= 10;
    }
    if (listing.engine_info && /\b(problem|fault|needs|repair|non funzionante|issue)\b/i.test(eng)) qualityScore -= 25;
    if (listing.engine_info && /\bnew engine|rebuilt|overhauled\b/i.test(eng)) qualityScore += 8;
    if (listing.engine_hours && listing.engine_hours > 4500) qualityScore -= 25;
    else if (listing.engine_hours && listing.engine_hours > 3000) qualityScore -= 15;
    if (!listing.engine_hours) qualityScore -= 8;
    if (!listing.hull_material) qualityScore -= 10;
    if (/\b(osmosis|blister|damage|damaged|leak|not working|needs repair|project boat|collision|grounding)\b/i.test(desc)) {
      qualityScore -= 35;
    }
    if (!listing.description || listing.description.length < 80) qualityScore -= 8;
    if (!listing.description && !listing.engine_info) qualityScore -= 10;

    qualityScore = Math.max(25, Math.min(100, qualityScore));
    const qualityWeight = qualityScore / 100;
    const gapPct = rawGapPct * qualityWeight;
    const engineText = (listing.engine_info || "").toLowerCase();
    const descriptionText = (listing.description || "").toLowerCase();
    const inferredEngine =
      listing.engine_hours && listing.engine_hours > 4500
        ? "bad"
        : listing.engine_hours && listing.engine_hours > 3000
          ? "average"
          : /\b(problem|fault|needs|repair|issue|non funzionante)\b/i.test(engineText)
            ? "bad"
            : "good";
    const inferredHull = /\b(osmosis|blister)\b/i.test(descriptionText)
      ? "osmosis"
      : /\b(damage|damaged|collision|grounding|leak)\b/i.test(descriptionText)
        ? "damaged"
        : "good";
    const inferredSails = listing.boat_type === "powerboat" ? "none" : "average";
    const evalScore = evaluate({
      boatType: (listing.boat_type === "powerboat" ? "powerboat" : "sailboat") as BoatType,
      segment: listing.segment || null,
      year: listing.year,
      price: Number(listing.price_eur),
      lengthFt: Number(listing.length_feet),
      engine: inferredEngine,
      hull: inferredHull,
      sails: inferredSails,
      engineHours: listing.engine_hours ?? undefined,
      hullMaterial: listing.hull_material ?? undefined,
      comparables: comps.map((c) => ({
        price_eur: Number(c.price_eur),
        length_feet: Number(c.length_feet),
        year: c.year ?? null,
        title: c.title,
        url: c.url,
        image_url: c.image_url,
        location: c.location,
        engine_info: c.engine_info,
        description: c.description || undefined,
      })),
    }).score;

    if (gapPct >= 12 && qualityScore >= 60 && evalScore >= 65)
      return { gapPct, label: "Great deal" as const, shortReason: `~${Math.round(gapPct)}% below peers (quality-adjusted)` };
    if (gapPct <= -10)
      return { gapPct, label: "Overpriced" as const, shortReason: `~${Math.round(Math.abs(gapPct))}% above peers` };
    return { gapPct, label: "Fair" as const, shortReason: "Near market median" };
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const hasContent = boats.length > 0 || listings.length > 0;

  const handleNavigateToListing = async (url: string, initialTab: "details" | "evaluate" | "costs" = "details") => {
    let target =
      cachedListings.find((l) => l.url === url || cachedListingUrlVariants(url).includes(l.url)) || null;
    if (!target) {
      const { data } = await supabase
        .from("cached_listings")
        .select("*")
        .in("url", cachedListingUrlVariants(url))
        .limit(1)
        .maybeSingle();
      if (data) target = data as CachedListing;
    }
    if (!target) return;
    setSelectedListing(target);
    setModalInitialTab(initialTab);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="hero-header-bg text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
          <div className="sticky top-0 z-40 -mx-4 px-4 py-2 mb-4">
            <div className="flex items-center justify-start sm:justify-end gap-4 pl-2 sm:pl-0 overflow-x-auto whitespace-nowrap scrollbar-none">
                <Link to="/buyers-guides" className="top-nav-link">Buyer’s Guides</Link>
                <Link to="/my-story" className="top-nav-link">My Story</Link>
                <span className="top-nav-link-active">My Boats {savedCount > 0 ? `(${savedCount})` : ""}</span>
                <div className="shrink-0">
                  <FeedbackButton pagePath="/my-boats" />
                </div>
                <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer" className="top-nav-cta">
                  <Heart className="w-3.5 h-3.5" /> Donate
                </a>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <Link to="/" className="inline-flex items-center">
              <img src="/logo-horizontal.png" alt="BoatBuyer" className="h-12 sm:h-14 w-auto" />
            </Link>
            <div className="hidden sm:flex items-center gap-2 ml-auto">
              {locationLabel && (
                <span className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <MapPin className="w-3 h-3" /> {locationLabel}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 max-w-2xl">
            <p className="text-sm sm:text-base text-white/90">
              We analyze listings, compare market peers, and show what to negotiate before you call the seller.
            </p>
            <p className="text-xs text-white/70 mt-1">
              We highly value your feedback - it directly helps us make BoatBuyer better.
            </p>
          </div>
          <div className="mt-5" />
        </div>
      </div>
      <div className="flex-1 p-4 pb-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-primary mb-6">My Boats</h1>

      {!hasContent ? (
        <p className="text-muted-foreground text-center mt-12">No boats saved yet. Use the <Heart className="w-4 h-4 inline" /> button on listings to save them here.</p>
      ) : (
        <div className="space-y-6">
          {/* Saved Listings */}
          {listings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Saved Listings ({listings.length})</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {cachedListings.map((listing) => {
                  const insight = getDealInsight(listing, cachedListings);
                  return (
                    <BoatListingCard
                      key={listing.id}
                      listing={listing}
                      imageUrl={getImageUrl(listing)}
                      insightLabel={insight.label}
                      insightReason={insight.shortReason}
                      isSaved
                      isCompared={compareIds.has(listing.id)}
                      onOpen={() => {
                        setSelectedListing(listing);
                        setModalInitialTab("details");
                        setModalOpen(true);
                      }}
                      onToggleSave={() => handleRemoveListing(listing.id)}
                      onToggleCompare={() => toggleCompare(listing.id)}
                      timeAgo={timeAgo}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Evaluated Boats */}
          {boats.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Evaluated Boats ({boats.length})</h2>
              <div className="space-y-3">
                {boats.map((b) => (
                  <Card key={b.id} className="p-4 flex items-center justify-between animate-fade-in">
                    <div>
                      <p className="font-semibold">{b.model}</p>
                      <p className="text-sm text-muted-foreground">{b.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold font-display">{b.score}</p>
                        <p className={`text-xs font-semibold ${verdictColor(b.verdict)}`}>{b.verdict}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
      <BoatDetailModal
        listing={selectedListing}
        open={modalOpen}
        onOpenChange={setModalOpen}
        timeAgo={timeAgo}
        initialTab={modalInitialTab}
        onNavigateToListing={handleNavigateToListing}
      />
      <Footer />
    </div>
  );
};

export default MyBoats;
