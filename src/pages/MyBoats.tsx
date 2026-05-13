import { useEffect, useMemo, useState } from "react";
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
import { deriveCanonicalCountryFromLocation } from "@scrapeShared/listingCountry";
import { BoatListingCard } from "@/components/BoatListingCard";
import {
  fetchDealInsightsForIds,
  placeholderInsightLoading,
  type DealInsight,
  type ListingDealPayload,
} from "@/lib/dealInsightsClient";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupportFirstVisitHint } from "@/hooks/useSupportFirstVisitHint";

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
  country?: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  engine_info: string | null;
  description: string | null;
  hull_material: string | null;
  engine_hours?: number | null;
  source: string | null;
  scraped_at: string;
}

/** When cached_listings has no row yet (or IDs were cleaned server-side), still show the snapshot from localStorage. */
function savedListingToCachedRow(sl: SavedListing): CachedListing {
  return {
    id: sl.id,
    title: sl.title,
    url: sl.url,
    boat_type: sl.boat_type,
    segment: null,
    price_eur: sl.price_eur,
    year: sl.year,
    length_feet: sl.length_feet,
    location: sl.location,
    country: sl.country ?? deriveCanonicalCountryFromLocation(sl.location) ?? undefined,
    image_url: sl.image_url,
    image_urls: sl.image_url ? [sl.image_url] : null,
    engine_info: null,
    description: null,
    hull_material: null,
    source: sl.source,
    scraped_at: sl.savedAt,
  };
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
  const { showHint: supportHint, acknowledge: acknowledgeSupportHint } = useSupportFirstVisitHint();
  const [boats, setBoats] = useState<SavedBoat[]>(getSavedBoats);
  const [listings, setListings] = useState<SavedListing[]>(getSavedListings);
  const [cachedListings, setCachedListings] = useState<CachedListing[]>([]);
  const [insightsMap, setInsightsMap] = useState<Record<string, ListingDealPayload>>({});
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<CachedListing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"details" | "evaluate" | "costs">("details");
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [locationLabel, setLocationLabel] = useState("");
  const savedCount = listings.length;

  const savedListingsForDisplay = useMemo(() => {
    const byId = new Map(cachedListings.map((l) => [l.id, l]));
    return listings.map((sl) => byId.get(sl.id) ?? savedListingToCachedRow(sl));
  }, [listings, cachedListings]);

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
        setInsightsMap({});
        return;
      }
      setInsightsLoading(true);
      try {
        const { data } = await supabase.from("cached_listings").select("*").in("id", ids);
        const rows = (data || []) as CachedListing[];
        setCachedListings(rows);
        try {
          const payloads = await fetchDealInsightsForIds(rows.map((r) => r.id));
          setInsightsMap(payloads);
        } catch (e) {
          console.error("my boats insights:", e);
          setInsightsMap({});
        }
      } finally {
        setInsightsLoading(false);
      }
    };
    void loadCachedListings();
  }, [listings]);

  const insightForSavedListing = (id: string): DealInsight => {
    const hit = insightsMap[id];
    if (hit) return hit.insight;
    if (insightsLoading) return placeholderInsightLoading();
    return {
      fairPrice: null,
      gapPct: null,
      confidence: "low",
      label: "No market data",
      shortReason: "Unable to score",
    };
  };

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
                <a
                  href="https://buymeacoffee.com/pirczigau"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("top-nav-cta", supportHint && "support-first-visit-hint")}
                  onClick={acknowledgeSupportHint}
                >
                  <Heart className="w-3.5 h-3.5" /> Support
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
              {insightsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedListingsForDisplay.map((listing) => (
                    <Card key={`sk-${listing.id}`} className="overflow-hidden">
                      <Skeleton className="h-40 w-full rounded-none" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedListingsForDisplay.map((listing) => {
                    const insight = insightForSavedListing(listing.id);
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
              )}
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
        prefetchedDeal={selectedListing ? insightsMap[selectedListing.id] ?? null : null}
      />
      <Footer />
    </div>
  );
};

export default MyBoats;
