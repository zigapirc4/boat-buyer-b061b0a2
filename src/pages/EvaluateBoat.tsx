import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Save, Loader2, ExternalLink, Search, Wrench, TrendingDown, MapPin, Info, ArrowRight, Copy, Ship } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BoatDetailModal } from "@/components/BoatDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isListingSaved, saveBoat, saveListing } from "@/lib/boatStore";
import type { EvalResult, BoatType } from "@/lib/evaluateBoat";
import { fetchDealInsightsForIds } from "@/lib/dealInsightsClient";
import {
  generateNegotiationScript,
  type NegotiationLanguage,
  type NegotiationTone,
} from "@/lib/negotiation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cachedListingUrlVariants, normalizeListingUrl } from "@scrapeShared/listingSites";

interface SimilarBoat {
  title: string;
  url: string;
  description: string;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  image_url: string | null;
  engine_info: string | null;
  boat_type?: string | null;
}

interface ComparableBoat {
  price_eur: number;
  length_feet: number;
  year?: number | null;
  title?: string;
  url?: string;
  location?: string | null;
  image_url?: string | null;
  engine_info?: string | null;
  description?: string;
  boat_type?: string | null;
}

interface ImportedExtras {
  location?: string;
  images?: string[];
  engineMake?: string;
  engineModel?: string;
  engineHp?: number;
  engineType?: string;
  hullMaterial?: string;
  cabins?: number;
  descriptionSummary?: string;
  equipmentHighlights?: string[];
  recentWork?: string[];
  knownIssues?: string[];
}

interface CachedListingForModal {
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
  engine_hours?: number | null;
  cabins?: number | null;
  fuel_type?: string | null;
  equipment?: string[] | null;
  source: string | null;
  scraped_at: string;
}

function recordMaybe(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Maps AI condition strings to EvaluateBoat engine/sails select values. */
function mapConditionToEngineSails(raw: unknown): string {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  if (!s || s === "unknown") return "";
  if (/\b(good|excellent|strong)\b/.test(s)) return "good";
  if (/\b(bad|poor|major|weak|serious)\b/.test(s)) return "bad";
  if (/\b(average|fair|moderate|mixed)\b/.test(s)) return "average";
  return "";
}

/** Maps AI hull wording to EvaluateBoat hull select values. */
function mapConditionToHull(raw: unknown): string {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  if (!s || s === "unknown") return "";
  if (s.includes("osmosis")) return "osmosis";
  if (/\b(damage|damaged|structural|poor|bad|significant)\b/.test(s)) return "damaged";
  if (/\b(good|average|fair|moderate|solid)\b/.test(s)) return "good";
  return "";
}

function strArr(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return out.length ? out : undefined;
}

function parseEngineHpFromSpecs(specs: Record<string, unknown>): number | undefined {
  const hp = specs.engine_hp ?? specs.engineHp;
  if (typeof hp === "number" && Number.isFinite(hp)) return hp;
  if (typeof hp === "string") {
    const n = parseInt(hp.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

const EvaluateBoat = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [listingUrl, setListingUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  const [boatType, setBoatType] = useState<BoatType>("sailboat");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [length, setLength] = useState("");
  const [engine, setEngine] = useState("");
  const [hull, setHull] = useState("");
  const [sails, setSails] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [engineYear, setEngineYear] = useState("");

  const [extras, setExtras] = useState<ImportedExtras>({});
  const [result, setResult] = useState<EvalResult | null>(null);
  const [comparablesUsed, setComparablesUsed] = useState<ComparableBoat[]>([]);
  const [similarBoats, setSimilarBoats] = useState<SimilarBoat[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSimilarBoat, setSelectedSimilarBoat] = useState<SimilarBoat | null>(null);
  const [isBoatCardOpen, setIsBoatCardOpen] = useState(false);
  const [isCombinedLoading, setIsCombinedLoading] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [detailListing, setDetailListing] = useState<CachedListingForModal | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [cachedListingId, setCachedListingId] = useState<string | null>(null);
  const [scriptLang, setScriptLang] = useState<NegotiationLanguage>("en");
  const [scriptTone, setScriptTone] = useState<NegotiationTone>("neutral");
  const [customOffer, setCustomOffer] = useState("");
  const [scriptOpen, setScriptOpen] = useState(false);

  const canEvaluate = model && year && price && length && engine && hull && (boatType === "powerboat" || sails);

  // Load boat fields from cached_listings when opened with ?url= (import happens on the home page).
  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      const canonical = normalizeListingUrl(urlParam);
      setListingUrl(canonical);
      loadListingFromCacheByUrl(canonical);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadListingFromCacheByUrl = async (url: string) => {
    if (!url.trim()) return;
    setIsScraping(true);
    setResult(null);
    setComparablesUsed([]);
    setSimilarBoats([]);
    setCachedListingId(null);

    try {
      const normalizedUrl = normalizeListingUrl(url);
      const { data: row, error } = await supabase
        .from("cached_listings")
        .select(
          "id, title, url, boat_type, brand, model, year, price_eur, length_feet, location, image_url, image_urls, engine_info, hull_material, engine_hours, cabins, fuel_type, description, equipment, specs_raw, source, scraped_at",
        )
        .in("url", cachedListingUrlVariants(normalizedUrl))
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!row) {
        toast({
          title: "Listing not saved yet",
          description: "Import this URL from the home page first — that runs the full scraper pipeline and saves the listing.",
          variant: "destructive",
        });
        return;
      }

      setCachedListingId(row.id);

      const specsRaw = recordMaybe(row.specs_raw) ?? {};
      const aiDetails = recordMaybe(specsRaw.ai_details);
      const condition = recordMaybe(aiDetails?.condition) ?? {};

      const bt: BoatType = row.boat_type === "powerboat" ? "powerboat" : "sailboat";
      setBoatType(bt);

      const brand = typeof row.brand === "string" ? row.brand.trim() : "";
      const modelStr = typeof row.model === "string" ? row.model.trim() : "";
      const displayModel = [brand, modelStr].filter(Boolean).join(" ").trim() || row.title || "";

      setModel(displayModel);
      if (row.year != null) setYear(String(row.year));
      else setYear("");
      if (row.price_eur != null) setPrice(String(Math.round(Number(row.price_eur))));
      else setPrice("");
      if (row.length_feet != null) setLength(String(Math.round(Number(row.length_feet))));
      else setLength("");
      if (row.engine_hours != null) setEngineHours(String(row.engine_hours));
      else setEngineHours("");

      const engineYearRaw = specsRaw.engine_year ?? aiDetails?.engine_year;
      if (typeof engineYearRaw === "number" && Number.isFinite(engineYearRaw)) {
        setEngineYear(String(Math.round(engineYearRaw)));
      } else if (typeof engineYearRaw === "string" && /^\d{4}$/.test(engineYearRaw.trim())) {
        setEngineYear(engineYearRaw.trim());
      } else {
        setEngineYear("");
      }

      setEngine(mapConditionToEngineSails(condition.engine));
      setHull(mapConditionToHull(condition.hull));
      if (bt === "sailboat") setSails(mapConditionToEngineSails(condition.sails));

      const hp = parseEngineHpFromSpecs(specsRaw);
      const equipFromRow =
        row.equipment && row.equipment.length > 0 ? row.equipment.filter((x): x is string => typeof x === "string") : undefined;

      setExtras({
        location: row.location || undefined,
        images:
          Array.isArray(row.image_urls) && row.image_urls.length > 0
            ? row.image_urls
            : row.image_url
              ? [row.image_url]
              : undefined,
        engineMake: typeof specsRaw.engine_make === "string" ? specsRaw.engine_make : undefined,
        engineModel: typeof specsRaw.engine_model === "string" ? specsRaw.engine_model : undefined,
        engineHp: hp,
        engineType: row.fuel_type || (typeof specsRaw.engine_type === "string" ? specsRaw.engine_type : undefined),
        hullMaterial: row.hull_material || undefined,
        cabins: row.cabins ?? undefined,
        descriptionSummary: row.description || undefined,
        equipmentHighlights: strArr(aiDetails?.equipment_highlights) ?? equipFromRow,
        recentWork: strArr(aiDetails?.recent_work),
        knownIssues: strArr(aiDetails?.known_issues),
      });

      if (!isListingSaved(row.id)) {
        saveListing({
          id: row.id,
          title: row.title,
          url: row.url,
          boat_type: row.boat_type,
          price_eur: row.price_eur,
          year: row.year,
          length_feet: row.length_feet,
          location: row.location,
          image_url: row.image_url,
          source: row.source,
        });
      }

      toast({
        title: "Listing loaded",
        description: "Data is read from the cached listing (same fields the scraper persists).",
      });
    } catch (e) {
      console.error("Load listing error:", e);
      toast({
        title: "Could not load listing",
        description: "Try again or re-import from the home page.",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleLoadCachedListing = () => loadListingFromCacheByUrl(listingUrl);

  const handleEvaluate = async () => {
    if (!canEvaluate) return;
    if (!cachedListingId) {
      toast({
        title: "Load a cached listing first",
        description: "Server-side scoring runs on imported listings. Paste the URL and tap Load (or open this page with ?url=).",
        variant: "destructive",
      });
      return;
    }
    setEvalProgress(15);
    setIsSearching(true);
    setIsCombinedLoading(true);
    try {
      const m = await fetchDealInsightsForIds([cachedListingId]);
      const p = m[cachedListingId];
      if (p?.evalResult) setResult(p.evalResult);
      else setResult(null);
      setComparablesUsed(
        (p?.comparables ?? []).slice(0, 8).map((c) => ({
          price_eur: c.price_eur,
          length_feet: c.length_feet,
          year: c.year,
          title: c.title,
          url: c.url,
          location: c.location,
          image_url: c.image_url,
          engine_info: c.engine_info,
          description: c.description ?? "",
          boat_type: c.boat_type,
        })),
      );
      setSimilarBoats([]);
      setEvalProgress(72);
      try {
        const { data, error } = await supabase.functions.invoke("search-similar-boats", {
          body: { model, length_feet: Number(length), year: Number(year), boat_type: boatType },
        });
        if (!error && data?.success && data.data) {
          setSimilarBoats(data.data);
        }
      } catch (e) {
        console.error("Similar boats search error:", e);
      }
    } catch (e) {
      console.error("Evaluation error:", e);
      toast({
        title: "Evaluation failed",
        description: "Please try again. If it persists, refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setIsCombinedLoading(false);
      setEvalProgress(100);
    }
  };

  const handleSave = () => {
    if (!result) return;
    saveBoat({ model, score: result.score, verdict: result.verdict });
    toast({ title: "Saved!", description: `${model} added to My Boats.` });
  };

  const handleCompareBoat = (boatUrl: string) => {
    setListingUrl(boatUrl);
    setResult(null);
    setSimilarBoats([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadListingFromCacheByUrl(boatUrl);
  };

  const handleOpenBoatCard = (boat: SimilarBoat) => {
    setSelectedSimilarBoat(boat);
    setIsBoatCardOpen(true);
  };

  const timeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const openEvaluateFromReference = async (url: string) => {
    const { data } = await supabase
      .from("cached_listings")
      .select("*")
      .in("url", cachedListingUrlVariants(url))
      .limit(1)
      .maybeSingle();
    if (!data) {
      toast({ title: "Boat not found", description: "Could not load boat details from cache.", variant: "destructive" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setDetailListing(data as CachedListingForModal);
    setDetailModalOpen(true);
    setIsBoatCardOpen(false);
  };

  const comparableAsSimilar = comparablesUsed
    .filter((c) => !!c.url)
    .map((c): SimilarBoat => ({
      title: c.title || "Comparable boat",
      url: c.url || "",
      description: c.description || "",
      price_eur: c.price_eur ?? null,
      year: c.year ?? null,
      length_feet: c.length_feet ?? null,
      location: c.location ?? null,
      image_url: c.image_url ?? null,
      engine_info: c.engine_info ?? null,
      boat_type: c.boat_type ?? null,
    }));

  const combinedBoats: Array<SimilarBoat & { sourceTag: "Comparable" | "Similar" }> = [
    ...comparableAsSimilar.map((b) => ({ ...b, sourceTag: "Comparable" as const })),
    ...similarBoats.map((b) => ({ ...b, sourceTag: "Similar" as const })),
  ];

  const scoreBarColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.75) return "bg-success";
    if (pct >= 0.45) return "bg-warning";
    return "bg-destructive";
  };

  const offerForScript = customOffer ? Number(customOffer) : result?.offerRange.realistic || 0;
  const script = result
    ? generateNegotiationScript({
        lang: scriptLang,
        tone: scriptTone,
        boatTitle: model || "boat",
        listingPrice: Number(price),
        fairLow: result.fairPriceLow,
        fairHigh: result.fairPriceHigh,
        offer: offerForScript,
        walkAwayPrice: result.walkAwayPrice,
        anchors: result.negotiationAnchors,
      })
    : null;

  useEffect(() => {
    if (!isCombinedLoading) return;
    const timer = setInterval(() => {
      setEvalProgress((prev) => (prev >= 92 ? prev : prev + 5));
    }, 300);
    return () => clearInterval(timer);
  }, [isCombinedLoading]);

  return (
    <div className="min-h-screen app-page-bg flex flex-col">
      <Header />
      <div className="flex-1 p-4 pb-8 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold text-primary mb-6">Evaluate a Boat</h1>

      {/* Load from cache (import runs on home) */}
      <Card className="p-4 mb-6 section-card border-dashed border-2">
        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
          <Ship className="w-4 h-4" /> Listing URL
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          To add a new boat, use <Link to="/" className="underline text-primary font-medium">Import</Link> on the home page — that runs the same scrape-and-save pipeline as the automated scraper. Here you only load data we already stored for this URL.
        </p>
        <div className="flex gap-2">
          <Input placeholder="Paste boat listing URL…" value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} className="flex-1" />
          <Button onClick={handleLoadCachedListing} disabled={isScraping || !listingUrl.trim()} size="sm">
            {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
          </Button>
        </div>
      </Card>

      {/* Imported Images */}
      {extras.images && extras.images.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {extras.images.slice(0, 5).map((img, i) => (
            <img key={i} src={img} alt={`Boat photo ${i + 1}`} className="h-24 w-36 object-cover rounded-lg shrink-0 border" />
          ))}
        </div>
      )}

      {/* Imported Summary */}
      {extras.descriptionSummary && (
        <Card className="p-3 mb-6 section-card bg-muted/50">
          <p className="text-sm text-muted-foreground flex gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            {extras.descriptionSummary}
          </p>
          {extras.location && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {extras.location}
            </p>
          )}
        </Card>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label>Boat Type</Label>
          <Select value={boatType} onValueChange={(v) => setBoatType(v as BoatType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sailboat">⛵ Sailboat</SelectItem>
              <SelectItem value="powerboat">🚤 Powerboat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div><Label>Boat Model</Label><Input placeholder="e.g. Bavaria 37 / Fairline Targa 43" value={model} onChange={e => setModel(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Year</Label><Input type="number" placeholder="2005" value={year} onChange={e => setYear(e.target.value)} /></div>
          <div><Label>Price (EUR)</Label><Input type="number" placeholder="45000" value={price} onChange={e => setPrice(e.target.value)} /></div>
        </div>
        <div><Label>Length (feet)</Label><Input type="number" placeholder="37" value={length} onChange={e => setLength(e.target.value)} /></div>

        <div className="grid grid-cols-2 gap-4">
          <div><Label>Engine Hours</Label><Input type="number" placeholder="1500" value={engineHours} onChange={e => setEngineHours(e.target.value)} /></div>
          <div><Label>Engine Year</Label><Input type="number" placeholder="2010" value={engineYear} onChange={e => setEngineYear(e.target.value)} /></div>
        </div>

        {(extras.engineMake || extras.engineHp) && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            🔧 {[extras.engineMake, extras.engineModel, extras.engineHp && `${extras.engineHp}HP`, extras.engineType].filter(Boolean).join(" · ")}
          </div>
        )}

        <div><Label>Engine Condition</Label>
          <Select value={engine} onValueChange={setEngine}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="good">Good</SelectItem><SelectItem value="average">Average</SelectItem><SelectItem value="bad">Bad</SelectItem></SelectContent></Select></div>

        <div><Label>Hull Condition</Label>
          <Select value={hull} onValueChange={setHull}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="good">Good</SelectItem><SelectItem value="osmosis">Osmosis</SelectItem><SelectItem value="damaged">Damaged</SelectItem></SelectContent></Select></div>

        {boatType === "sailboat" && (
          <div><Label>Sails Condition</Label>
            <Select value={sails} onValueChange={setSails}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="average">Average</SelectItem><SelectItem value="worn">Worn</SelectItem></SelectContent></Select></div>
        )}

        {extras.equipmentHighlights && extras.equipmentHighlights.length > 0 && (
          <div>
            <Label className="text-xs">Equipment</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {extras.equipmentHighlights.map((eq, i) => (
                <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{eq}</span>
              ))}
            </div>
          </div>
        )}

        {extras.knownIssues && extras.knownIssues.length > 0 && (
          <Card className="p-3 border-destructive/30 bg-destructive/5">
            <Label className="text-xs text-destructive">⚠️ Known Issues</Label>
            <ul className="mt-1 space-y-1">
              {extras.knownIssues.map((issue, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {issue}</li>
              ))}
            </ul>
          </Card>
        )}

        {extras.recentWork && extras.recentWork.length > 0 && (
          <Card className="p-3 border-success/30 bg-success/5">
            <Label className="text-xs text-success">✅ Recent Work</Label>
            <ul className="mt-1 space-y-1">
              {extras.recentWork.map((work, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {work}</li>
              ))}
            </ul>
          </Card>
        )}

        <Button className="w-full h-12 text-base" disabled={!canEvaluate} onClick={handleEvaluate}>Evaluate Boat</Button>
        {isCombinedLoading && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Running market + risk analysis…</p>
            <Progress value={evalProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4 animate-fade-in">
          <Card className="p-6 text-center premium-surface">
            <p className={`text-6xl font-bold font-display ${result.color}`}>{result.score}</p>
            <p className={`text-xl font-semibold mt-1 ${result.color}`}>{result.verdict}</p>
            <p className="text-sm text-muted-foreground mt-2">{result.priceAssessment}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Confidence: <span className="font-medium">{result.confidenceScore}/100</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{result.confidenceDetails}</p>
          </Card>

          <Card className="p-5 premium-surface">
            <h3 className="font-semibold text-primary mb-2">🎯 Negotiation Range</h3>
            <p className="text-sm text-muted-foreground">
              Fair range: <span className="font-medium text-foreground">€{result.fairPriceLow.toLocaleString()} - €{result.fairPriceHigh.toLocaleString()}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Target offer: <span className="font-medium text-primary">€{result.targetOffer.toLocaleString()}</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border p-2 bg-background">
                <p className="text-muted-foreground">Aggressive</p>
                <p className="font-semibold">€{result.offerRange.aggressive.toLocaleString()}</p>
              </div>
              <div className="rounded-md border p-2 bg-background">
                <p className="text-muted-foreground">Realistic</p>
                <p className="font-semibold">€{result.offerRange.realistic.toLocaleString()}</p>
              </div>
            </div>
            {result.negotiationAnchors.length > 0 && (
              <ul className="mt-3 space-y-1">
                {result.negotiationAnchors.map((a, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground">• {a}</li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-primary mb-3">✉️ Negotiation Script Generator</h3>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Generate a negotiation message from your current offer.</p>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setScriptOpen((v) => !v)}>
                {scriptOpen ? "Hide" : "Show"}
              </Button>
            </div>
            {scriptOpen && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Language</Label>
                    <Select value={scriptLang} onValueChange={(v) => setScriptLang(v as NegotiationLanguage)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sl">Slovenian</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                <Label className="text-xs">Tone</Label>
                <Select value={scriptTone} onValueChange={(v) => setScriptTone(v as NegotiationTone)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="firm">Firm</SelectItem>
                  </SelectContent>
                </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Offer amount override (optional)</Label>
                  <Input
                    type="number"
                    placeholder={String(result.offerRange.realistic)}
                    value={customOffer}
                    onChange={(e) => setCustomOffer(e.target.value)}
                  />
                </div>
                {script && (
                  <div className="space-y-2">
                    <div className="rounded-md border p-2 bg-background">
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="text-sm">{script.subject}</p>
                    </div>
                    <div className="rounded-md border p-2 bg-background">
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <pre className="text-xs whitespace-pre-wrap font-sans">{script.emailBody}</pre>
                    </div>
                    <div className="rounded-md border p-2 bg-background">
                      <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
                      <pre className="text-xs whitespace-pre-wrap font-sans">{script.whatsappText}</pre>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={async () => {
                          await navigator.clipboard.writeText(`${script.subject}\n\n${script.emailBody}`);
                          toast({ title: "Copied", description: "Email script copied to clipboard." });
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy Email
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={async () => {
                          await navigator.clipboard.writeText(script.whatsappText);
                          toast({ title: "Copied", description: "WhatsApp script copied to clipboard." });
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy WhatsApp
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5 premium-surface">
            <h3 className="font-semibold text-primary mb-3">📌 What Moved The Score</h3>
            <ul className="space-y-2">
              {result.scoreDrivers.map((d, i) => (
                <li key={i} className="text-sm flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className={d.type === "positive" ? "text-success font-medium" : "text-destructive font-medium"}>
                    {d.impact > 0 ? "+" : ""}{d.impact}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-primary mb-3">🧾 Data Quality</h3>
            <div className="space-y-2">
              {result.dataQuality.map((q) => (
                <div key={q.field} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{q.field}</p>
                    <p className="text-xs text-muted-foreground">{q.note}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      q.status === "available"
                        ? "bg-success/15 text-success"
                        : q.status === "inferred"
                          ? "bg-warning/15 text-warning"
                          : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Score Breakdown
            </h3>
            <div className="space-y-4">
              {result.categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{cat.icon} {cat.name}</span>
                    <span className="text-muted-foreground">{cat.score}/{cat.maxScore}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBarColor(cat.score, cat.maxScore)}`}
                      style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{cat.details}</p>
                </div>
              ))}
            </div>
          </Card>

          {result.estimatedRepairCost > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Estimated Repair Costs
              </h3>
              <p className="text-2xl font-bold text-destructive">€{result.estimatedRepairCost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                True cost: €{(Number(price) + result.estimatedRepairCost).toLocaleString()} (price + repairs)
              </p>
              {result.repairEstimateBreakdown.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {result.repairEstimateBreakdown.map((item, idx) => (
                    <div key={`${item.label}-${idx}`} className="rounded-md border bg-background p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-xs font-semibold">€{item.estimate.toLocaleString()}</p>
                      </div>
                      {item.note && <p className="text-[11px] text-muted-foreground mt-0.5">{item.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-semibold text-primary mb-3">💡 Recommendations</h3>
            <ul className="space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-accent mt-0.5 shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Comparables + Similar Boats */}
          <Card className="p-5">
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" /> Comparables + Similar Boats
            </h3>
            {isCombinedLoading || isSearching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading comparables and similar boats…
              </div>
            ) : combinedBoats.length > 0 ? (
              <div className="space-y-3">
                {combinedBoats.map((boat, i) => (
                  <div
                    key={`${boat.sourceTag}-${boat.url}-${i}`}
                    className="rounded-lg bg-muted/50 overflow-hidden cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleOpenBoatCard(boat)}
                  >
                    <div className="flex">
                      {boat.image_url && (
                        <img
                          src={boat.image_url}
                          alt={boat.title}
                          className="w-28 h-28 object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="p-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{boat.title}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {boat.sourceTag}
                          </span>
                        </div>
                        {boat.price_eur && (
                          <p className="text-sm font-bold text-accent mt-0.5">€{boat.price_eur.toLocaleString()}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {boat.year && <span className="text-xs text-muted-foreground">{boat.year}</span>}
                          {boat.length_feet && <span className="text-xs text-muted-foreground">{boat.length_feet}ft</span>}
                          {boat.boat_type && <span className="text-xs text-muted-foreground capitalize">{boat.boat_type}</span>}
                          {boat.location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" />{boat.location}
                            </span>
                          )}
                        </div>
                        {boat.engine_info && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">⚙️ {boat.engine_info}</p>
                        )}
                        {boat.description && !boat.engine_info && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{boat.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBoatCard(boat);
                            }}
                          >
                            <ArrowRight className="w-3 h-3" /> Open Card
                          </Button>
                          <a href={boat.url} target="_blank" rel="noopener noreferrer">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 px-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" /> View
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No comparables or similar boats found.</p>
            )}
          </Card>

          <Button variant="outline" className="w-full gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save to My Boats
          </Button>
        </div>
      )}
      <Dialog open={isBoatCardOpen} onOpenChange={setIsBoatCardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSimilarBoat?.title || "Boat details"}</DialogTitle>
          </DialogHeader>
          {selectedSimilarBoat && (
            <div className="space-y-3">
              {selectedSimilarBoat.image_url && (
                <img
                  src={selectedSimilarBoat.image_url}
                  alt={selectedSimilarBoat.title}
                  className="w-full h-52 object-cover rounded-md"
                />
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                {selectedSimilarBoat.price_eur && <span className="font-semibold text-primary">€{selectedSimilarBoat.price_eur.toLocaleString()}</span>}
                {selectedSimilarBoat.year && <span className="text-muted-foreground">{selectedSimilarBoat.year}</span>}
                {selectedSimilarBoat.length_feet && <span className="text-muted-foreground">{selectedSimilarBoat.length_feet}ft</span>}
                {selectedSimilarBoat.boat_type && <span className="text-muted-foreground capitalize">{selectedSimilarBoat.boat_type}</span>}
                {selectedSimilarBoat.location && <span className="text-muted-foreground">{selectedSimilarBoat.location}</span>}
              </div>
              {selectedSimilarBoat.engine_info && (
                <p className="text-sm text-muted-foreground">⚙️ {selectedSimilarBoat.engine_info}</p>
              )}
              {selectedSimilarBoat.description && (
                <p className="text-sm text-muted-foreground line-clamp-4">{selectedSimilarBoat.description}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEvaluateFromReference(selectedSimilarBoat.url)}
                >
                  Evaluate
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsBoatCardOpen(false);
                    handleCompareBoat(selectedSimilarBoat.url);
                  }}
                >
                  Compare this boat
                </Button>
                <a href={selectedSimilarBoat.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1">
                    <ExternalLink className="w-3 h-3" /> Open listing
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <BoatDetailModal
        listing={detailListing as any}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        timeAgo={timeAgo}
        initialTab="evaluate"
      />
      </div>
      <Footer />
    </div>
  );
};

export default EvaluateBoat;
