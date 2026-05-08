import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Ship,
  List,
  Loader2,
  ExternalLink,
  MapPin,
  ArrowRight,
  Clock,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  TrendingDown,
  DollarSign,
  Shield,
  Compass,
  Mail,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { getSavedBoats, saveListing, removeListing, isListingSaved } from "@/lib/boatStore";
import { supabase } from "@/integrations/supabase/client";
import { BoatDetailModal } from "@/components/BoatDetailModal";
import { BoatListingCard } from "@/components/BoatListingCard";
import { FeedbackButton } from "@/components/FeedbackButton";
import { evaluate, type BoatType } from "@/lib/evaluateBoat";
import { useToast } from "@/hooks/use-toast";
import { BUYER_GUIDES } from "@/lib/buyerGuides";
import {
  cachedListingUrlVariants,
  detectScrapeFreeTargetSite,
  normalizeListingUrl,
  supportedListingSitesHumanList,
} from "@scrapeShared/listingSites";
import { interpretScrapeFreeImportResponse } from "@/lib/scrapeFreeImportOutcome";

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
  source: string | null;
  scraped_at: string;
}

interface DealInsight {
  fairPrice: number | null;
  gapPct: number | null;
  confidence: "low" | "medium" | "high";
  label: "Great deal" | "Fair" | "Overpriced" | "No market data";
  shortReason: string;
}

const ARTICLES = [
  {
    icon: DollarSign,
    color: "bg-coral/15 text-coral",
    title: "True Cost of Boat Ownership",
    summary:
      "Marina fees, insurance, maintenance — the purchase price is just the beginning. Learn what to budget for your first year.",
    tag: "Costs",
    tagColor: "bg-coral/10 text-coral",
    body: "Owning a boat goes far beyond the sticker price. Here's a breakdown of what to expect in your first year:\n\n**Marina / Berth Fees** — Annual berth costs in the Adriatic range from €40–120 per meter per year depending on location. ACI marinas in Croatia are among the most popular, with prices varying by season and boat length.\n\n**Insurance** — Hull and liability insurance typically costs 1–2% of the boat's value per year. A €50,000 boat might cost €500–1,000/year to insure.\n\n**Maintenance** — Budget 5–10% of the boat's purchase price annually. This covers antifouling, engine service, rigging checks, and unexpected repairs.\n\n**Winterization** — Haul-out, storage, and spring launch can run €500–1,500 depending on boat size and yard location.\n\n**Fuel & Consumables** — Powerboats consume significantly more fuel. Sailboats are cheaper to run but still need diesel for the engine and electronics.\n\n**Registration & Taxes** — Varies by flag state. Slovenian registration is straightforward; Croatian waters require a vignette (sojourn tax).",
  },
  {
    icon: Shield,
    color: "bg-primary/15 text-primary",
    title: "Pre-Purchase Survey Guide",
    summary:
      "What a marine survey covers, when you need one, and how to read the report. Don't skip this step on boats over €15k.",
    tag: "Buying",
    tagColor: "bg-primary/10 text-primary",
    body: "A marine survey is your best protection when buying a used boat. Here's what you need to know:\n\n**When to Get One** — Always recommended for boats over €15,000 or older than 10 years. Banks and insurers often require one.\n\n**Types of Surveys:**\n- *Condition & Valuation (C&V)* — Full inspection of hull, deck, rigging, engine, and systems. Includes a fair market valuation.\n- *Hull-only* — Focuses on structural integrity, osmosis, and underwater fittings.\n- *Engine survey* — Specialist inspection of engines and drive systems.\n\n**What the Surveyor Checks** — Hull integrity, deck core condition, standing and running rigging, through-hulls, electrical systems, engine hours and compression, safety equipment, and documentation.\n\n**Reading the Report** — Focus on items marked 'requires immediate attention' vs 'recommended.' Use serious findings as negotiation leverage — a €2,000 repair issue can knock €3,000 off the price.\n\n**Cost** — Expect €10–15 per foot for a full survey. A 37-foot boat survey costs roughly €370–550 plus haul-out fees.",
  },
  {
    icon: Compass,
    color: "bg-accent/15 text-accent",
    title: "Best Cruising Grounds: Adriatic",
    summary:
      "From Slovenia to Montenegro — marina pricing, sailing conditions, and hidden anchorages along the Croatian coast.",
    tag: "Sailing",
    tagColor: "bg-accent/10 text-accent",
    body: "The Adriatic Sea offers some of Europe's best cruising, with over 1,200 islands and crystal-clear waters.\n\n**Slovenia** — A short coastline but excellent marinas in Portorož, Izola, and Koper. Great starting point with easy access to Italy and Croatia.\n\n**Croatia** — The crown jewel. Key areas include:\n- *Istria* — Close to Slovenia, charming towns like Rovinj and Pula. Less crowded than Dalmatia.\n- *Kvarner* — Islands of Cres, Lošinj, and Krk. Protected sailing with reliable winds.\n- *Dalmatia* — Split to Dubrovnik. Stunning islands (Hvar, Vis, Korčula, Mljet). More crowded July–August.\n\n**Montenegro** — Kotor Bay is a must-visit. Fewer marinas but growing infrastructure. Very affordable.\n\n**Wind & Weather** — The *Maestral* (NW afternoon breeze) is your friend. Watch out for the *Bura* (strong NE wind) in winter and the *Jugo* (SE sirocco) which brings rain.\n\n**Anchoring** — Free anchoring is common outside marine reserves. Always check local regulations — some bays now charge fees in peak season.",
  },
  {
    icon: BookOpen,
    color: "bg-ocean/15 text-ocean",
    title: "Sailboat vs Powerboat: Which Is Right?",
    summary:
      "Comparing running costs, maintenance needs, speed, and lifestyle for first-time buyers in the Mediterranean.",
    tag: "Guide",
    tagColor: "bg-ocean/10 text-ocean",
    body: "Choosing between sail and power is one of the biggest decisions for a first-time buyer. Here's an honest comparison:\n\n**Running Costs:**\n- *Sailboat* — Lower fuel costs (engine used mainly for maneuvering). Higher rigging maintenance.\n- *Powerboat* — Fuel is the biggest expense. A 35ft powerboat can burn 20–40L/hour at cruising speed vs 2–4L/hour for a sailboat under engine.\n\n**Purchase Price** — Sailboats generally offer more boat for the money. A well-maintained 35ft sailboat from the 2000s can be found for €40–80k. Equivalent powerboats start at €60–120k.\n\n**Maintenance:**\n- *Sailboat* — Sails (replace every 7–10 years, €3–8k), rigging (replace every 15–20 years, €5–15k), and standard hull/engine work.\n- *Powerboat* — More engine hours = more engine maintenance. Twin engines double the cost.\n\n**Lifestyle:**\n- *Sailboat* — Slower, quieter, more romantic. You work with the wind. Great for longer passages and overnight sailing.\n- *Powerboat* — Faster point-to-point travel. Better for day trips, fishing, and watersports. More spacious interiors at the same length.\n\n**Recommendation** — If you plan to cruise the Adriatic on weekends and holidays, a 30–38ft sailboat is hard to beat for value and experience. If speed and comfort for day trips matter more, look at displacement or semi-displacement powerboats for fuel efficiency.",
  },
];

const PER_PAGE = 24;

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [sortBy, setSortBy] = useState<
    "newest" | "best_deal" | "price_low" | "price_high" | "length_high" | "year_newest"
  >("newest");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [selectedListing, setSelectedListing] = useState<CachedListing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"details" | "evaluate" | "costs">("evaluate");
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [goodDealsOnly, setGoodDealsOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [typePromptOpen, setTypePromptOpen] = useState(false);
  const [pendingTypeListing, setPendingTypeListing] = useState<CachedListing | null>(null);
  const [pendingTypeToastDescription, setPendingTypeToastDescription] = useState<string>(
    "Listing is saved in BoatBuyer and automatically added to My Boats.",
  );
  const [selectedType, setSelectedType] = useState<"sailboat" | "powerboat" | "">("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const ids = new Set<string>(
      JSON.parse(localStorage.getItem("boatbuyer_saved_listings") || "[]").map((l: any) => l.id as string),
    );
    setSavedIds(ids);
  }, []);

  useEffect(() => {
    const shouldFocusImport = Boolean((location.state as { openImport?: boolean } | null)?.openImport);
    if (!shouldFocusImport) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => importInputRef.current?.focus(), 120);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const toggleSave = (listing: CachedListing) => {
    if (savedIds.has(listing.id)) {
      removeListing(listing.id);
      setSavedIds((prev) => {
        const n = new Set(prev);
        n.delete(listing.id);
        return n;
      });
    } else {
      saveListing({
        id: listing.id,
        title: listing.title,
        url: listing.url,
        boat_type: listing.boat_type,
        price_eur: listing.price_eur,
        year: listing.year,
        length_feet: listing.length_feet,
        location: listing.location,
        image_url: listing.image_url,
        source: listing.source,
      });
      setSavedIds((prev) => new Set(prev).add(listing.id));
    }
  };

  const COUNTRY_COORDS: Record<string, [number, number]> = {
    slovenia: [46.15, 14.99],
    croatia: [45.1, 15.2],
    italy: [41.87, 12.57],
    greece: [39.07, 21.82],
    france: [46.6, 1.89],
    spain: [40.46, -3.75],
    germany: [51.17, 10.45],
    denmark: [56.26, 9.5],
    sweden: [60.13, 18.64],
    finland: [61.92, 25.75],
    netherlands: [52.13, 5.29],
    uk: [55.38, -3.44],
    "united kingdom": [55.38, -3.44],
    turkey: [38.96, 35.24],
    montenegro: [42.71, 19.37],
    portugal: [39.4, -8.22],
    albania: [41.15, 20.17],
    austria: [47.52, 14.55],
    hungary: [47.16, 19.5],
    "czech republic": [49.82, 15.47],
    poland: [51.92, 19.15],
    norway: [60.47, 8.47],
    florida: [27.66, -81.52],
    california: [36.78, -119.42],
    texas: [31.97, -99.9],
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
      if (nearbyKeywords.some((k) => loc.includes(k))) bestDist = 20;
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
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
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
    const fetchListings = async () => {
      try {
        let query = supabase
          .from("cached_listings")
          .select("*")
          .not("price_eur", "is", null)
          .not("image_url", "is", null)
          .neq("image_url", "none")
          .order("scraped_at", { ascending: false })
          .limit(100000);
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
      } catch (e) {
        console.error("Failed to fetch listings:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchListings();
  }, [boatTypeFilter, sourceFilter, userCoords]);

  const [allSources, setAllSources] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  useEffect(() => {
    const fetchSources = async () => {
      const { data } = await supabase.from("cached_listings").select("source").limit(100000);
      if (data) {
        const s = [...new Set(data.map((d: any) => d.source).filter(Boolean))].sort() as string[];
        setAllSources(s);
      }
    };
    const fetchTotal = async () => {
      const { count } = await supabase.from("cached_listings").select("*", { count: "exact", head: true });
      if (typeof count === "number") setTotalCount(count);
    };
    fetchSources();
    fetchTotal();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [boatTypeFilter, sourceFilter, minPrice, maxPrice, minLength, maxLength, searchQuery, sortBy]);

  const displayListings = listings.filter((l) => {
    if (minPrice && l.price_eur !== null && l.price_eur < parseInt(minPrice)) return false;
    if (maxPrice && l.price_eur !== null && l.price_eur > parseInt(maxPrice)) return false;
    if (minLength && l.length_feet !== null && l.length_feet < parseInt(minLength)) return false;
    if (maxLength && l.length_feet !== null && l.length_feet > parseInt(maxLength)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const haystack =
        `${l.title} ${l.location || ""} ${l.engine_info || ""} ${l.description || ""} ${l.hull_material || ""} ${l.boat_type || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (goodDealsOnly) {
      const insight = getDealInsight(l, listings);
      if (!insight.gapPct || insight.gapPct < 12) return false;
    }
    return true;
  });

  const sortedListings = [...displayListings].sort((a, b) => {
    if (sortBy === "price_low") return (a.price_eur ?? Number.MAX_SAFE_INTEGER) - (b.price_eur ?? Number.MAX_SAFE_INTEGER);
    if (sortBy === "price_high") return (b.price_eur ?? 0) - (a.price_eur ?? 0);
    if (sortBy === "length_high") return (b.length_feet ?? 0) - (a.length_feet ?? 0);
    if (sortBy === "year_newest") return (b.year ?? 0) - (a.year ?? 0);
    if (sortBy === "best_deal") {
      const aGap = getDealInsight(a, listings).gapPct ?? -9999;
      const bGap = getDealInsight(b, listings).gapPct ?? -9999;
      return bGap - aGap;
    }
    return new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime();
  });

  const totalPages = Math.ceil(sortedListings.length / PER_PAGE);
  const paginatedListings = sortedListings.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleCardClick = (listing: CachedListing) => {
    setSelectedListing(listing);
    setModalInitialTab("evaluate");
    setModalOpen(true);
  };

  const handleNavigateToListing = async (url: string, initialTab: "details" | "evaluate" | "costs" = "details") => {
    let target = listings.find((l) => l.url === url || cachedListingUrlVariants(url).includes(l.url)) || null;
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSelectedListing(target);
    setModalInitialTab(initialTab);
    setModalOpen(true);
  };

  const handleImportBoat = async () => {
    if (!importUrl.trim()) return;
    const normalizedUrl = normalizeListingUrl(importUrl);
    setIsImporting(true);

    try {
      const finalizeImportedListing = (savedListing: CachedListing, toastDescription: string) => {
        saveListing({
          id: savedListing.id,
          title: savedListing.title,
          url: savedListing.url,
          boat_type: savedListing.boat_type,
          price_eur: savedListing.price_eur,
          year: savedListing.year,
          length_feet: savedListing.length_feet,
          location: savedListing.location,
          image_url: savedListing.image_url,
          source: savedListing.source,
        });
        setSavedIds((prev) => new Set(prev).add(savedListing.id));
        setListings((prev) => [savedListing, ...prev.filter((l) => l.id !== savedListing.id)]);
        setSelectedListing(savedListing);
        setModalInitialTab("evaluate");
        setModalOpen(true);
        setImportOpen(false);
        setImportUrl("");
        toast({
          title: "Boat imported",
          description: toastDescription,
        });
      };

      const requireBoatTypeBeforeSave = (savedListing: CachedListing, toastDescription: string) => {
        if (savedListing.boat_type) return false;
        setPendingTypeListing(savedListing);
        setPendingTypeToastDescription(toastDescription);
        setSelectedType("");
        setTypePromptOpen(true);
        setImportOpen(false);
        return true;
      };

      const getCachedByUrl = async (targetUrl: string) => {
        const { data } = await supabase
          .from("cached_listings")
          .select("*")
          .in("url", cachedListingUrlVariants(targetUrl))
          .limit(1)
          .maybeSingle();
        return data as CachedListing | null;
      };

      const { data: existing } = await supabase
        .from("cached_listings")
        .select("*")
        .in("url", cachedListingUrlVariants(normalizedUrl))
        .limit(1)
        .maybeSingle();

      if (existing) {
        const existingListing = existing as CachedListing;
        if (requireBoatTypeBeforeSave(existingListing, "Listing is saved in BoatBuyer and automatically added to My Boats.")) {
          return;
        }
        if (!isListingSaved(existingListing.id)) {
          saveListing({
            id: existingListing.id,
            title: existingListing.title,
            url: existingListing.url,
            boat_type: existingListing.boat_type,
            price_eur: existingListing.price_eur,
            year: existingListing.year,
            length_feet: existingListing.length_feet,
            location: existingListing.location,
            image_url: existingListing.image_url,
            source: existingListing.source,
          });
          setSavedIds((prev) => new Set(prev).add(existingListing.id));
        }

        setSelectedListing(existingListing);
        setModalInitialTab("evaluate");
        setModalOpen(true);
        setImportOpen(false);
        setImportUrl("");
        toast({
          title: "Listing already imported",
          description: "Boat details opened. Listing is available in My Boats.",
        });
        return;
      }

      const site = detectScrapeFreeTargetSite(normalizedUrl);
      if (!site) {
        toast({
          title: "Unsupported source",
          description: `Supported marketplaces: ${supportedListingSitesHumanList()}.`,
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("scrape-free", {
        body: { urls: [normalizedUrl] },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || `Import failed for ${site}`);
      }

      const interpretation = interpretScrapeFreeImportResponse(data, normalizedUrl);
      if (interpretation.outcome === "fail") {
        throw new Error(interpretation.message);
      }

      const pollCachedListing = async (): Promise<CachedListing | null> => {
        let savedRow: CachedListing | null = null;
        for (let i = 0; i < 36; i++) {
          savedRow = await getCachedByUrl(normalizedUrl);
          if (savedRow) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return savedRow;
      };

      let savedRow: CachedListing | null = null;
      if (interpretation.outcome === "use_existing_row") {
        savedRow = await pollCachedListing();
        if (!savedRow) {
          throw new Error(
            "This listing is already in the database, but it could not be loaded yet. Wait a few seconds and use Import again, or open it from the listings grid.",
          );
        }
      } else {
        savedRow = await pollCachedListing();
      }

      if (!savedRow) {
        throw new Error(
          "Import ran but the listing is still not visible in the database. The scrape may have failed silently — try again, or confirm you pasted the direct listing page URL (not search results).",
        );
      }

      const savedListing = savedRow as CachedListing;
      if (requireBoatTypeBeforeSave(savedListing, "Listing is saved in BoatBuyer and automatically added to My Boats.")) {
        return;
      }
      finalizeImportedListing(savedListing, "Listing is saved in BoatBuyer and automatically added to My Boats.");
    } catch (e) {
      console.error("Import failed:", e);
      toast({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Could not import this listing. Check URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmBoatType = async () => {
    if (!pendingTypeListing || !selectedType) return;
    const typedListing: CachedListing = { ...pendingTypeListing, boat_type: selectedType };
    await supabase.from("cached_listings").update({ boat_type: selectedType }).eq("id", pendingTypeListing.id);
    saveListing({
      id: typedListing.id,
      title: typedListing.title,
      url: typedListing.url,
      boat_type: typedListing.boat_type,
      price_eur: typedListing.price_eur,
      year: typedListing.year,
      length_feet: typedListing.length_feet,
      location: typedListing.location,
      image_url: typedListing.image_url,
      source: typedListing.source,
    });
    setSavedIds((prev) => new Set(prev).add(typedListing.id));
    setListings((prev) => [typedListing, ...prev.filter((l) => l.id !== typedListing.id)]);
    setSelectedListing(typedListing);
    setModalInitialTab("evaluate");
    setModalOpen(true);
    setTypePromptOpen(false);
    setPendingTypeListing(null);
    setSelectedType("");
    setImportUrl("");
    toast({
      title: "Boat imported",
      description: pendingTypeToastDescription,
    });
  };

  const getImageUrl = (listing: CachedListing) => {
    if (listing.image_url) return listing.image_url;
    if (listing.image_urls && listing.image_urls.length > 0) return listing.image_urls[0];
    return null;
  };

  function getDealInsight(listing: CachedListing, dataset: CachedListing[]): DealInsight {
    if (!listing.price_eur || !listing.length_feet || !listing.year || !listing.segment) {
      return {
        fairPrice: null,
        gapPct: null,
        confidence: "low",
        label: "No market data",
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
        fairPrice: null,
        gapPct: null,
        confidence: "low",
        label: "No market data",
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
      // Keep age as a risk signal, but avoid over-penalizing well-kept classic boats.
      if (age > 35) qualityScore -= 32;
      else if (age > 30) qualityScore -= 24;
      else if (age > 25) qualityScore -= 16;
      else if (age > 15) qualityScore -= 6;
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
    const confidence: DealInsight["confidence"] =
      comps.length >= 18 ? "high" : comps.length >= 10 ? "medium" : "low";

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

    if (gapPct >= 12 && qualityScore >= 60 && evalScore >= 65) {
      return {
        fairPrice,
        gapPct,
        confidence,
        label: "Great deal",
        shortReason: `~${Math.round(gapPct)}% below peers (quality-adjusted)`,
      };
    }
    if (gapPct <= -10) {
      return {
        fairPrice,
        gapPct,
        confidence,
        label: "Overpriced",
        shortReason: `~${Math.round(Math.abs(gapPct))}% above peers`,
      };
    }
    return {
      fairPrice,
      gapPct,
      confidence,
      label: "Fair",
      shortReason: "Near market median",
    };
  }

  const topDealsCandidates = listings
    .map((listing) => ({ listing, insight: getDealInsight(listing, listings) }))
    .filter(
      (x) =>
        x.insight.gapPct !== null &&
        (x.insight.gapPct || 0) >= 12 &&
        Math.abs(x.insight.gapPct || 0) <= 90,
    )
    .sort((a, b) => (b.insight.gapPct || 0) - (a.insight.gapPct || 0));

  const topDeals: typeof topDealsCandidates = [];
  const seenDealPercents = new Set<number>();
  const seenBoatTypes = new Set<string>();
  for (const candidate of topDealsCandidates) {
    const roundedGap = Math.round(candidate.insight.gapPct || 0);
    if (seenDealPercents.has(roundedGap)) continue;
    const candidateType = candidate.listing.boat_type || "unknown";
    if (topDeals.length < 2 && seenBoatTypes.has(candidateType)) continue;
    seenDealPercents.add(roundedGap);
    seenBoatTypes.add(candidateType);
    topDeals.push(candidate);
    if (topDeals.length >= 3) break;
  }

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else if (n.size < 4) {
        n.add(id);
      }
      return n;
    });
  };

  const compareListings = listings.filter((l) => compareIds.has(l.id));
  const selectedGuideArticle = BUYER_GUIDES.find((article) => article.id === selectedGuideId) || null;

  const scrollToListings = () => {
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Banner */}
      <div className="hero-header-bg text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
          <div className="sticky top-0 z-40 -mx-4 px-4 py-2 mb-4">
            <div className="flex items-center justify-start sm:justify-end gap-4 pl-2 sm:pl-0 overflow-x-auto whitespace-nowrap scrollbar-none">
                <Link to="/buyers-guides" className="top-nav-link">Buyer’s Guides</Link>
                <Link to="/my-story" className="top-nav-link">My Story</Link>
                <Link to="/my-boats" className="top-nav-link">My Boats {savedCount > 0 ? `(${savedCount})` : ""}</Link>
                <div className="shrink-0">
                  <FeedbackButton pagePath="/" />
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

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-end">
            <div className="max-w-2xl">
              <p className="text-4xl sm:text-5xl font-semibold leading-tight text-white">
                Smart decisions.
                <br />
                Better <span className="text-cyan-300">boat ownership.</span>
              </p>
              <p className="text-base sm:text-lg text-white/90 mt-3">
                Evaluate used boats, compare prices, and estimate annual ownership costs.
              </p>

              <div className="mt-5 flex flex-col sm:flex-row gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    ref={importInputRef}
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="Paste boat listing URL..."
                    className="w-full h-11 rounded-lg bg-white text-foreground border border-white/30 pl-9 pr-3 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && importUrl.trim() && !isImporting) {
                        void handleImportBoat();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleImportBoat}
                  disabled={isImporting || !importUrl.trim()}
                  className="h-11 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-5"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ship className="w-4 h-4 mr-1" />}
                  Import boat
                </Button>
              </div>
            </div>

            <div className="hidden md:flex" />
          </div>

          <div className="mt-4 max-w-2xl">
            <p className="text-xs text-white/70">
              We highly value your feedback - it directly helps us make BoatBuyer better.
            </p>
          </div>
        </div>
      </div>

      {/* Instant Value Preview */}
      <section id="top-deals" className="max-w-6xl mx-auto px-4 pt-6 w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Top Deals Right Now</h2>
          <Button variant="ghost" size="sm" className="text-xs" onClick={scrollToListings}>
            Browse all listings
          </Button>
        </div>
        {topDeals.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {topDeals.map(({ listing, insight }) => (
              <Card
                key={`deal-${listing.id}`}
                className="border-success/30 bg-success/5 cursor-pointer premium-card overflow-hidden"
                onClick={() => handleCardClick(listing)}
              >
                {getImageUrl(listing) ? (
                  <img
                    src={getImageUrl(listing)!}
                    alt={listing.title}
                    className="w-full h-28 object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-28 bg-muted flex items-center justify-center">
                    <Ship className="w-7 h-7 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs font-semibold text-success">{insight.label}</p>
                  <p className="text-sm font-semibold truncate mt-1">{listing.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insight.shortReason}</p>
                  <p className="text-xs mt-1">
                    Price: <span className="font-medium">€{Number(listing.price_eur).toLocaleString()}</span>
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">Building market signals as new listings arrive.</Card>
        )}
      </section>

      {/* Trust block */}
      <section className="max-w-6xl mx-auto px-4 pt-6 w-full">
        <Card className="p-4 sm:p-5 premium-surface">
          <h3 className="text-sm font-semibold text-primary mb-1">Why this score is trustworthy</h3>
          <div className="grid gap-3 sm:grid-cols-2 text-xs text-muted-foreground">
            <div>
              <p className="text-foreground font-semibold mb-1">Growing market coverage</p>
              <p>
                We continuously import new listings into our catalog, so the market baseline keeps getting richer and the score becomes
                more reliable over time.
              </p>
            </div>
            <div>
              <p className="text-foreground font-semibold mb-1">Comparable-based pricing</p>
              <p>
                Each boat is compared against same-type listings with similar year and length to build a fair range from real asking
                prices.
              </p>
            </div>
            <div>
              <p className="text-foreground font-semibold mb-1">Risk-adjusted quality</p>
              <p>
                The score is adjusted with risk signals such as age, engine and hull condition, missing critical fields, and known-issue
                indicators in listing text.
              </p>
            </div>
            <div>
              <p className="text-foreground font-semibold mb-1">Negotiation guardrails</p>
              <p>
                Valuation and risk are translated into practical outputs: confidence level, realistic target offer, and a clear walk-away
                ceiling.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* My Story CTA */}
      <section className="max-w-6xl mx-auto px-4 pt-5 w-full">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-coral" /> My Story
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">How this app started on a 1975 Vivacity 20.</p>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
              <Link to="/my-story">Read</Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* Articles Section */}
      <div className="max-w-6xl mx-auto px-4 py-8 w-full">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-coral" /> Buyer's Guides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from(new Map(BUYER_GUIDES.map((article) => [article.category, article])).values())
            .slice(0, 4)
            .map((article) => (
            <Card
              key={article.id}
              onClick={() => setSelectedGuideId(article.id)}
              className="p-4 group cursor-pointer border-transparent hover:border-primary/15 premium-card"
            >
              <div
                className={`w-9 h-9 rounded-lg ${article.color} flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}
              >
                <article.icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${article.tagColor}`}>
                {article.category}
              </span>
              <h3 className="text-sm font-semibold mt-2 leading-snug font-sans">{article.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{article.summary}</p>
              <span className="text-xs text-primary font-medium mt-2 inline-block group-hover:underline">
                Read more →
              </span>
            </Card>
            ))}
        </div>
      </div>

      {/* Listings Section */}
      <div id="listings" className="max-w-6xl mx-auto px-4 pb-8 w-full flex-1 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search boats… (e.g. Bavaria 37, Croatia, diesel)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-xl border bg-card pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </div>

        {/* Header + Filters */}
        <div className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
            ⛵ {locationLabel ? `Boats near ${locationLabel}` : "Latest Listings"}
            {totalCount !== null && (
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {totalCount.toLocaleString()} total
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
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="best_deal">Best deal first</SelectItem>
                <SelectItem value="price_low">Price: low to high</SelectItem>
                <SelectItem value="price_high">Price: high to low</SelectItem>
                <SelectItem value="length_high">Length: longest first</SelectItem>
                <SelectItem value="year_newest">Year: newest first</SelectItem>
              </SelectContent>
            </Select>
            {allSources.length > 1 && (
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {allSources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1 rounded-lg"
              onClick={() => setShowFilters((f) => !f)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              {(minPrice || maxPrice || minLength || maxLength) && (
                <span className="ml-1 w-2 h-2 rounded-full bg-coral" />
              )}
            </Button>
            <div className="flex items-center gap-2 rounded-lg border px-2 h-8 bg-card">
              <Switch checked={goodDealsOnly} onCheckedChange={setGoodDealsOnly} />
              <span className="text-xs text-muted-foreground">Good deals only</span>
            </div>
          </div>
        </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Price €</span>
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-24 h-8 rounded-lg border bg-background px-2 text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 h-8 rounded-lg border bg-background px-2 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Length ft</span>
              <input
                type="number"
                placeholder="Min"
                value={minLength}
                onChange={(e) => setMinLength(e.target.value)}
                className="w-20 h-8 rounded-lg border bg-background px-2 text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="number"
                placeholder="Max"
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
                className="w-20 h-8 rounded-lg border bg-background px-2 text-xs"
              />
            </div>
            {(minPrice || maxPrice || minLength || maxLength) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  setMinLength("");
                  setMaxLength("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={`skeleton-${i}`} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-7 w-full mt-2" />
                </div>
              </Card>
            ))}
          </div>
        ) : paginatedListings.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
              {paginatedListings.map((listing) => {
                const img = getImageUrl(listing);
                const insight = getDealInsight(listing, listings);
                return (
                  <BoatListingCard
                    key={listing.id}
                    listing={listing}
                    imageUrl={img}
                    insightLabel={insight.label}
                    insightReason={insight.shortReason}
                    isSaved={savedIds.has(listing.id)}
                    isCompared={compareIds.has(listing.id)}
                    onOpen={() => handleCardClick(listing)}
                    onToggleSave={() => toggleSave(listing)}
                    onToggleCompare={() => toggleCompare(listing.id)}
                    timeAgo={timeAgo}
                  />
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  disabled={page === 1}
                  onClick={() => {
                    setPage((p) => p - 1);
                    scrollToListings();
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg text-xs"
                      onClick={() => {
                        setPage(pageNum);
                        scrollToListings();
                      }}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  disabled={page === totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    scrollToListings();
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No listings found with current filters.</p>
            <div className="flex justify-center gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setGoodDealsOnly(false)}>
                Show all deals
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  setMinLength("");
                  setMaxLength("");
                  setSearchQuery("");
                }}
              >
                Clear filters
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Compare bar */}
      {compareIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <Card className="px-3 py-2 shadow-lg border-primary/20 bg-background/95 backdrop-blur premium-surface">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{compareIds.size}/4 selected</span>
              <Button size="sm" className="h-7 text-xs" disabled={compareIds.size < 2} onClick={() => setCompareOpen(true)}>
                Compare boats
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCompareIds(new Set())}>
                Clear
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={!!selectedGuideArticle} onOpenChange={(open) => !open && setSelectedGuideId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedGuideArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-10 h-10 rounded-lg ${selectedGuideArticle.color} flex items-center justify-center`}>
                    <selectedGuideArticle.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedGuideArticle.tagColor}`}>
                    {selectedGuideArticle.category}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold">{selectedGuideArticle.title}</DialogTitle>
                <DialogDescription>{selectedGuideArticle.summary}</DialogDescription>
              </DialogHeader>
              <div className="prose prose-sm max-w-none text-foreground mt-2">
                {selectedGuideArticle.body.split("\n\n").map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-muted-foreground mb-3"
                    dangerouslySetInnerHTML={{
                      __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>').replace(/\n/g, "<br />"),
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-5xl bg-gradient-to-b from-background to-muted/30 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Boat Comparison</DialogTitle>
            <DialogDescription className="text-sm">
              Compare your shortlist side-by-side before deciding.
            </DialogDescription>
          </DialogHeader>
          <Card className="p-3 border-primary/30 bg-gradient-to-r from-primary/10 via-ocean/10 to-accent/10 shadow-sm">
            <p className="text-xs font-semibold text-primary">Coming soon: AI deep comparison</p>
            <p className="text-xs text-foreground/80 mt-0.5">
              Realtime AI insights for side-by-side technical, pricing, and risk comparison are coming soon.
            </p>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {compareListings.map((b) => {
              const insight = getDealInsight(b, listings);
              const img = getImageUrl(b);
              return (
                <Card key={`cmp-${b.id}`} className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow bg-card/95">
                  <div className="aspect-video bg-muted">
                    {img ? (
                      <img
                        src={img}
                        alt={b.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Ship className="w-7 h-7 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                  <p className="text-sm font-semibold line-clamp-2">{b.title}</p>
                  <p className="text-base text-primary font-bold">€{Number(b.price_eur || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{b.year || "—"} · {b.length_feet || "—"}ft</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{b.location || "Unknown location"}</p>
                  <span
                    className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      insight.label === "Great deal"
                        ? "bg-success/15 text-success"
                        : insight.label === "Overpriced"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {insight.label}
                  </span>
                  <Button size="sm" variant="outline" className="h-8 text-xs mt-2 w-full rounded-lg" onClick={() => handleCardClick(b)}>
                    Open
                  </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import boat</DialogTitle>
            <DialogDescription>
              Paste listing URL. We will import it, store it in BoatBuyer, add it to My Boats, and open boat details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="url"
              placeholder="https://..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={isImporting}>
                Cancel
              </Button>
              <Button onClick={handleImportBoat} disabled={isImporting || !importUrl.trim()}>
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={typePromptOpen} onOpenChange={setTypePromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select boat type</DialogTitle>
            <DialogDescription>
              We could not detect the boat type automatically. Please choose it before we save this boat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as "sailboat" | "powerboat")}>
              <SelectTrigger>
                <SelectValue placeholder="Choose type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sailboat">Sailboat</SelectItem>
                <SelectItem value="powerboat">Powerboat</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTypePromptOpen(false);
                  setPendingTypeListing(null);
                  setSelectedType("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmBoatType} disabled={!selectedType}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-card/80 backdrop-blur-sm mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo-horizontal.png" alt="BoatBuyer" className="h-7 w-auto" />
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm font-medium">Žiga Pirc</p>
              <a
                href="mailto:pirc.ziga@gmail.com"
                className="text-xs text-primary hover:underline flex items-center gap-1 justify-center sm:justify-end mt-0.5"
              >
                <Mail className="w-3 h-3" /> pirc.ziga@gmail.com
              </a>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4 italic">
            Made by a boat owner, for boat owners ⛵
          </p>
          <div className="mt-4 flex justify-center">
            <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 rounded-full">
                <Heart className="w-3.5 h-3.5 text-coral" /> Support this project
              </Button>
            </a>
          </div>
          <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <p>© {new Date().getFullYear()} BoatBuyer. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/" state={{ openImport: true }} className="hover:text-primary transition-colors">
                Import boat
              </Link>
              <Link to="/my-boats" className="hover:text-primary transition-colors">
                My Boats
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <BoatDetailModal
        listing={selectedListing}
        open={modalOpen}
        onOpenChange={setModalOpen}
        timeAgo={timeAgo}
        initialTab={modalInitialTab}
        isSaved={selectedListing ? savedIds.has(selectedListing.id) : false}
        onToggleSave={toggleSave}
        onNavigateToListing={handleNavigateToListing}
      />
    </div>
  );
};

export default Index;
