import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  Ship,
  List,
  Loader2,
  ExternalLink,
  MapPin,
  ArrowRight,
  Clock,
  SlidersHorizontal,
  Calculator,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
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
import { getSavedBoats, saveListing, removeListing, isListingSaved } from "@/lib/boatStore";
import { supabase } from "@/integrations/supabase/client";
import { BoatDetailModal } from "@/components/BoatDetailModal";
import myStoryImage from "@/assets/my-story-vivacity.jpg";

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
  const [page, setPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState<(typeof ARTICLES)[number] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = new Set<string>(
      JSON.parse(localStorage.getItem("boatbuyer_saved_listings") || "[]").map((l: any) => l.id as string),
    );
    setSavedIds(ids);
  }, []);

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
  }, [boatTypeFilter, sourceFilter, minPrice, maxPrice, minLength, maxLength, searchQuery]);

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
    return true;
  });

  const totalPages = Math.ceil(displayListings.length / PER_PAGE);
  const paginatedListings = displayListings.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleCardClick = (listing: CachedListing) => {
    setSelectedListing(listing);
    setModalOpen(true);
  };

  const getImageUrl = (listing: CachedListing) => {
    if (listing.image_url) return listing.image_url;
    if (listing.image_urls && listing.image_urls.length > 0) return listing.image_urls[0];
    return null;
  };

  const scrollToListings = () => {
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  };

  const actionCards = [
    { to: "/evaluate", icon: Ship, label: "Evaluate", desc: "Rate any boat", gradient: "from-primary to-ocean" },
    { to: "/cost", icon: Calculator, label: "Costs", desc: "Annual ownership", gradient: "from-ocean to-sky" },
    {
      to: "/my-boats",
      icon: List,
      label: "My Boats",
      desc: savedCount > 0 ? `${savedCount} saved` : "Your shortlist",
      gradient: "from-coral to-warning",
      badge: savedCount,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-primary via-ocean to-sky text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Anchor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-white">BoatBuyer</h1>
              <p className="text-white/75 text-sm">Smart boat purchase decisions</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-auto">
              {locationLabel && (
                <span className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <MapPin className="w-3 h-3" /> {locationLabel}
                </span>
              )}
              <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer">
                <Button
                  size="sm"
                  className="bg-warning hover:bg-warning/90 text-warning-foreground font-semibold text-xs gap-1.5 rounded-full px-4"
                >
                  <Heart className="w-3.5 h-3.5" /> Donate
                </Button>
              </a>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
            {actionCards.map((card) => (
              <Link key={card.to} to={card.to} className="group">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center hover:bg-white/20 transition-all hover:-translate-y-0.5 border border-white/10">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110">
                    <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold flex items-center gap-1 justify-center">
                    {card.label}
                    {card.badge ? (
                      <span className="bg-white/25 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{card.badge}</span>
                    ) : null}
                  </p>
                  <p className="text-[10px] sm:text-xs text-white/60 mt-0.5">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* My Story Section */}
      <section className="max-w-6xl mx-auto px-4 py-10 w-full">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Heart className="w-5 h-5 text-coral" /> My Story
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4 text-foreground/85 text-[15px] leading-relaxed order-2 md:order-1">
            <p>
              That moment captured in this photo is where it all started — not with a perfect plan, but with curiosity
              and a pull toward the sea. We were standing on a Vivacity 20 from 1975 — a small British cruiser with a
              timeless, almost stubborn charm. Built in an era when boats were made to last and to be lived with, not
              just owned, she carries that old-school character in every line of her hull.
            </p>
            <p>
              Back then, I wasn't thinking about costs, marinas, or long-term value. I was thinking about what it feels
              like to be out there, away from routine, with a sense of complete freedom. That changed quite quickly. On
              our first serious trip, we learned in a rather unpleasant way that the engine had reached the end of its
              life — it failed at sea, and it became clear that a full replacement wasn't a choice, but a necessity.
            </p>
            <p>
              Later, I realized that owning a boat isn't just about the romance — it's also about decisions, costs, and
              a lot of unknowns. That experience made it very real, very fast. It's exactly why I started building this
              project. To make the journey from "I like this boat" to "I know this is a smart decision" much easier.
              This isn't just an app. It's something I wish I had the first time I stepped aboard that little Vivacity,
              full of character and quiet promises of the sea.
            </p>
          </div>
          <div className="order-1 md:order-2">
            <div className="rounded-xl overflow-hidden shadow-lg border border-border/40">
              <img
                src={myStoryImage}
                alt="Standing on a 1975 Vivacity 20 sailboat in a Croatian marina, raising the Croatian flag"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <div className="max-w-6xl mx-auto px-4 py-8 w-full">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-coral" /> Buyer's Guides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ARTICLES.map((article, i) => (
            <Card
              key={i}
              onClick={() => setSelectedArticle(article)}
              className="p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group cursor-pointer border-transparent hover:border-primary/15"
            >
              <div
                className={`w-9 h-9 rounded-lg ${article.color} flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}
              >
                <article.icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${article.tagColor}`}>
                {article.tag}
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

      {/* Article Modal */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-10 h-10 rounded-lg ${selectedArticle.color} flex items-center justify-center`}>
                    <selectedArticle.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedArticle.tagColor}`}>
                    {selectedArticle.tag}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold font-heading">{selectedArticle.title}</DialogTitle>
                <DialogDescription>{selectedArticle.summary}</DialogDescription>
              </DialogHeader>
              <div className="prose prose-sm max-w-none text-foreground mt-2">
                {selectedArticle.body.split("\n\n").map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-muted-foreground mb-3"
                    dangerouslySetInnerHTML={{
                      __html: paragraph
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                        .replace(/\n/g, "<br />"),
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-16">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading latest boats…
          </div>
        ) : paginatedListings.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
              {paginatedListings.map((listing) => {
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
                          className="w-full h-40 object-cover transition-transform group-hover:scale-[1.02]"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-40 bg-muted flex items-center justify-center">
                          <Ship className="w-12 h-12 text-muted-foreground/20" />
                        </div>
                      )}
                      {listing.boat_type && (
                        <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-full capitalize">
                          {listing.boat_type}
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="font-semibold text-sm truncate leading-tight">{listing.title}</p>
                      {listing.price_eur && (
                        <p className="text-lg font-bold text-primary mt-0.5">
                          €{Number(listing.price_eur).toLocaleString()}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {listing.year && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {listing.year}
                          </span>
                        )}
                        {listing.length_feet && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {Number(listing.length_feet)}ft
                          </span>
                        )}
                        {listing.hull_material && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">
                            {listing.hull_material}
                          </span>
                        )}
                      </div>
                      {listing.location && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{listing.location}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-auto pt-1.5">
                        <p className="text-[10px] text-muted-foreground/60 truncate">{listing.source}</p>
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
                          <Clock className="w-2.5 h-2.5" /> {timeAgo(listing.scraped_at)}
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs gap-1 h-7 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(listing);
                          }}
                        >
                          <ArrowRight className="w-3 h-3" /> Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs gap-1 h-7 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                          asChild
                        >
                          <a href={listing.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-xs gap-1 h-7 w-7 rounded-lg p-0 shrink-0 ${savedIds.has(listing.id) ? "text-coral" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(listing);
                          }}
                        >
                          <Heart className={`w-3.5 h-3.5 ${savedIds.has(listing.id) ? "fill-coral" : ""}`} />
                        </Button>
                      </div>
                    </div>
                  </Card>
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
          <p className="text-sm text-muted-foreground text-center py-8">
            No listings found. Try adjusting your filters.
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/80 backdrop-blur-sm mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-ocean flex items-center justify-center">
                <Anchor className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">BoatBuyer</p>
                <p className="text-xs text-muted-foreground">Smart boat purchase decisions</p>
              </div>
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
              <Link to="/evaluate" className="hover:text-primary transition-colors">
                Evaluate
              </Link>
              <Link to="/cost" className="hover:text-primary transition-colors">
                Costs
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
        isSaved={selectedListing ? savedIds.has(selectedListing.id) : false}
        onToggleSave={toggleSave}
      />
    </div>
  );
};

export default Index;
