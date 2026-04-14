
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Clock, ChevronLeft, ChevronRight, Ship, TrendingDown, Wrench, DollarSign, Calculator, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { evaluate, type EvalResult, type BoatType } from "@/lib/evaluateBoat";
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
  engine_hours?: number | null;
  cabins?: number | null;
  fuel_type?: string | null;
  source: string | null;
  scraped_at: string;
}

interface Marina {
  id: string;
  name: string;
  country: string;
  region: string | null;
  price_per_meter_year: number | null;
}

interface MaintenanceItem {
  category: string;
  item: string;
  costLow: number;
  costHigh: number;
  frequency: string;
  applicable: boolean;
}

function getMaintenanceBreakdown(lengthM: number, year: number | null, boatType: string, hullMaterial: string | null, engineHours: number | null): MaintenanceItem[] {
  const len = lengthM;
  const age = year ? new Date().getFullYear() - year : 15;
  const isSail = boatType === "sailboat";
  const items: MaintenanceItem[] = [];

  items.push({ category: "Hull", item: "Antifouling paint", costLow: len * 30, costHigh: len * 60, frequency: "Yearly", applicable: true });
  items.push({ category: "Hull", item: "Hull polishing & waxing", costLow: 200, costHigh: 600, frequency: "Yearly", applicable: true });
  items.push({ category: "Hull", item: "Anode replacement", costLow: 100, costHigh: 300, frequency: "Yearly", applicable: true });
  items.push({ category: "Hull", item: "Osmosis treatment", costLow: 1500, costHigh: 4000, frequency: "Every 10 years", applicable: hullMaterial === "fiberglass" || !hullMaterial });

  items.push({ category: "Engine", item: "Oil & filter change", costLow: 80, costHigh: 200, frequency: "Yearly", applicable: true });
  items.push({ category: "Engine", item: "Impeller replacement", costLow: 50, costHigh: 150, frequency: "Yearly", applicable: true });
  items.push({ category: "Engine", item: "Fuel filter & water separator", costLow: 40, costHigh: 100, frequency: "Yearly", applicable: true });
  items.push({ category: "Engine", item: "Belt replacement", costLow: 30, costHigh: 80, frequency: "Every 2 years", applicable: true });
  items.push({ category: "Engine", item: "Winterization", costLow: 150, costHigh: 400, frequency: "Yearly", applicable: true });
  items.push({ category: "Engine", item: "Major engine service", costLow: 800, costHigh: 2500, frequency: "Every 5 years", applicable: age > 10 || (engineHours || 0) > 2000 });

  if (isSail) {
    items.push({ category: "Sails & Rigging", item: "Sail inspection & repair", costLow: 200, costHigh: 800, frequency: "Yearly", applicable: true });
    items.push({ category: "Sails & Rigging", item: "Standing rigging inspection", costLow: 150, costHigh: 400, frequency: "Yearly", applicable: true });
    items.push({ category: "Sails & Rigging", item: "Running rigging replacement", costLow: 300, costHigh: 1000, frequency: "Every 5 years", applicable: age > 5 });
    items.push({ category: "Sails & Rigging", item: "Full rigging replacement", costLow: 3000, costHigh: 8000, frequency: "Every 10-15 years", applicable: age > 10 });
  }

  items.push({ category: "Electrical", item: "Battery replacement", costLow: 200, costHigh: 600, frequency: "Every 3-5 years", applicable: true });
  items.push({ category: "Electrical", item: "Electrical system check", costLow: 100, costHigh: 300, frequency: "Yearly", applicable: true });

  items.push({ category: "Safety", item: "Life raft service", costLow: 200, costHigh: 500, frequency: "Every 2-3 years", applicable: true });
  items.push({ category: "Safety", item: "Fire extinguisher service", costLow: 50, costHigh: 150, frequency: "Yearly", applicable: true });
  items.push({ category: "Safety", item: "Flare replacement", costLow: 80, costHigh: 200, frequency: "Every 3 years", applicable: true });

  items.push({ category: "Insurance & Admin", item: "Boat insurance", costLow: len * 40, costHigh: len * 80, frequency: "Yearly", applicable: true });
  items.push({ category: "Insurance & Admin", item: "Registration renewal", costLow: 50, costHigh: 200, frequency: "Yearly", applicable: true });

  items.push({ category: "Haulout", item: "Crane / travel lift", costLow: len * 15, costHigh: len * 30, frequency: "Yearly (for antifouling)", applicable: true });
  items.push({ category: "Haulout", item: "Hard stand storage (winter)", costLow: len * 10, costHigh: len * 25, frequency: "Yearly", applicable: true });

  return items;
}

interface BoatDetailModalProps {
  listing: CachedListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeAgo: (dateStr: string) => string;
}

export const BoatDetailModal = ({ listing, open, onOpenChange, timeAgo }: BoatDetailModalProps) => {
  const [imgIndex, setImgIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "evaluate" | "costs">("details");

  // Enriched listing data (merged with fetched data)
  const [enrichedListing, setEnrichedListing] = useState<CachedListing | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Evaluate state
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [engineCondition, setEngineCondition] = useState("good");
  const [hullCondition, setHullCondition] = useState("good");
  const [sailsCondition, setSailsCondition] = useState("average");

  // Costs state
  const [marinas, setMarinas] = useState<Marina[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedMarinaId, setSelectedMarinaId] = useState("");
  const [loadingMarinas, setLoadingMarinas] = useState(false);
  const [costResult, setCostResult] = useState<{
    marina: number;
    maintenanceItems: MaintenanceItem[];
    maintenanceLow: number;
    maintenanceHigh: number;
    totalLow: number;
    totalHigh: number;
  } | null>(null);

  // The effective listing (enriched if available, else original)
  const effective = enrichedListing || listing;

  // Reset state when listing changes
  useEffect(() => {
    setImgIndex(0);
    setActiveTab("details");
    setEvalResult(null);
    setCostResult(null);
    setEngineCondition("good");
    setHullCondition("good");
    setSailsCondition("average");
    setSelectedMarinaId("");
    setEnrichedListing(null);
    setFetchError(null);
  }, [listing?.id]);

  // Auto-fetch missing data when evaluate or costs tab needs it
  const needsFetch = (tab: "evaluate" | "costs") => {
    if (!effective) return false;
    if (tab === "evaluate") return !effective.price_eur || !effective.length_feet || !effective.year;
    if (tab === "costs") return !effective.length_feet;
    return false;
  };

  const fetchMissingData = async () => {
    if (!listing || isFetching) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-boat-listing", {
        body: { url: listing.url },
      });
      if (error || !data?.success) {
        setFetchError("Could not fetch listing details. Try again later.");
        return;
      }
      const d = data.data;
      setEnrichedListing({
        ...listing,
        price_eur: listing.price_eur ?? d.price_eur ?? null,
        year: listing.year ?? d.year ?? null,
        length_feet: listing.length_feet ?? d.length_feet ?? null,
        boat_type: listing.boat_type || d.boat_type || "sailboat",
        hull_material: listing.hull_material ?? d.hull_material ?? null,
        engine_hours: listing.engine_hours ?? d.engine_hours ?? null,
        engine_info: listing.engine_info ?? (d.engine_make ? `${d.engine_make} ${d.engine_model || ""} ${d.engine_hp ? d.engine_hp + "hp" : ""}`.trim() : null),
        cabins: listing.cabins ?? d.cabins ?? null,
        fuel_type: listing.fuel_type ?? d.engine_type ?? null,
        location: listing.location ?? d.location ?? null,
        description: listing.description ?? d.description_summary ?? null,
        image_url: listing.image_url ?? (d.images?.[0] || null),
        image_urls: listing.image_urls?.length ? listing.image_urls : (d.images || null),
      });
      // Set conditions from scraped data
      if (d.engine_condition) setEngineCondition(d.engine_condition);
      if (d.hull_condition) setHullCondition(d.hull_condition);
      if (d.sails_condition && d.sails_condition !== "none") setSailsCondition(d.sails_condition);
    } catch {
      setFetchError("Failed to fetch listing details.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if ((activeTab === "evaluate" || activeTab === "costs") && needsFetch(activeTab) && !isFetching && !enrichedListing && !fetchError) {
      fetchMissingData();
    }
  }, [activeTab]);

  // Load marinas when costs tab is activated
  useEffect(() => {
    if (activeTab === "costs" && marinas.length === 0) {
      setLoadingMarinas(true);
      supabase.from("marinas").select("id, name, country, region, price_per_meter_year").order("country").order("name")
        .then(({ data }) => {
          if (data) {
            setMarinas(data);
            setCountries([...new Set(data.map(m => m.country))].sort());
          }
          setLoadingMarinas(false);
        });
    }
  }, [activeTab]);

  if (!listing) return null;

  const images: string[] = [];
  if (effective!.image_urls?.length) images.push(...effective!.image_urls);
  else if (effective!.image_url) images.push(effective!.image_url);

  const handlePrev = () => setImgIndex(i => (i > 0 ? i - 1 : images.length - 1));
  const handleNext = () => setImgIndex(i => (i < images.length - 1 ? i + 1 : 0));

  const handleEvaluate = () => {
    if (!effective!.price_eur || !effective!.length_feet || !effective!.year) return;
    const result = evaluate({
      boatType: (effective!.boat_type || "sailboat") as BoatType,
      year: effective!.year,
      price: effective!.price_eur,
      lengthFt: effective!.length_feet,
      engine: engineCondition,
      hull: hullCondition,
      sails: effective!.boat_type === "powerboat" ? "none" : sailsCondition,
      engineHours: effective!.engine_hours || undefined,
      hullMaterial: effective!.hull_material || undefined,
    });
    setEvalResult(result);
  };

  const handleCalcCost = () => {
    if (!effective!.length_feet) return;
    const lengthM = effective!.length_feet * 0.3048;
    const selectedMarina = marinas.find(m => m.id === selectedMarinaId);
    const marinaCost = selectedMarina ? lengthM * (selectedMarina.price_per_meter_year || 0) : 0;
    const items = getMaintenanceBreakdown(lengthM, effective!.year, effective!.boat_type || "sailboat", effective!.hull_material, effective!.engine_hours || null);
    const applicable = items.filter(i => i.applicable);

    let maintenanceLow = 0, maintenanceHigh = 0;
    for (const item of applicable) {
      const match = item.frequency.match(/(\d+)/);
      const years = item.frequency === "Yearly" ? 1 : (match ? parseInt(match[1]) : 3);
      maintenanceLow += item.costLow / years;
      maintenanceHigh += item.costHigh / years;
    }

    setCostResult({
      marina: Math.round(marinaCost),
      maintenanceItems: applicable,
      maintenanceLow: Math.round(maintenanceLow),
      maintenanceHigh: Math.round(maintenanceHigh),
      totalLow: Math.round(marinaCost + maintenanceLow),
      totalHigh: Math.round(marinaCost + maintenanceHigh),
    });
  };

  const filteredMarinas = marinas.filter(m => !selectedCountry || m.country === selectedCountry);
  const scoreBarColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.75) return "bg-green-500";
    if (pct >= 0.45) return "bg-yellow-500";
    return "bg-red-500";
  };

  const categories = costResult ? [...new Set(costResult.maintenanceItems.map(i => i.category))] : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setImgIndex(0); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Image gallery */}
        {images.length > 0 ? (
          <div className="relative w-full aspect-video bg-muted">
            <img src={images[imgIndex]} alt={listing.title} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            {images.length > 1 && (
              <>
                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 hover:bg-background"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 hover:bg-background"><ChevronRight className="w-5 h-5" /></button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 text-xs px-2 py-0.5 rounded-full">{imgIndex + 1} / {images.length}</div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center"><Ship className="w-16 h-16 text-muted-foreground/30" /></div>
        )}

        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{effective!.title}</DialogTitle>
          </DialogHeader>

          {effective!.price_eur && <p className="text-2xl font-bold text-primary">€{Number(effective!.price_eur).toLocaleString()}</p>}

          {/* Specs */}
          <div className="flex flex-wrap gap-3">
            {effective!.year && <span className="text-sm bg-muted px-3 py-1 rounded-full">Year: {effective!.year}</span>}
            {effective!.length_feet && <span className="text-sm bg-muted px-3 py-1 rounded-full">{Number(effective!.length_feet)} ft</span>}
            {effective!.boat_type && <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{effective!.boat_type}</span>}
            {effective!.hull_material && <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{effective!.hull_material}</span>}
            {effective!.cabins && <span className="text-sm bg-muted px-3 py-1 rounded-full">{effective!.cabins} cabins</span>}
            {effective!.fuel_type && <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{effective!.fuel_type}</span>}
            {effective!.engine_hours && <span className="text-sm bg-muted px-3 py-1 rounded-full">{effective!.engine_hours}h engine</span>}
          </div>

          {effective!.location && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {effective!.location}</p>}
          {effective!.engine_info && <p className="text-sm text-muted-foreground">⚙️ {effective!.engine_info}</p>}
          {effective!.description && (
            <div><h3 className="text-sm font-semibold mb-1">Description</h3><p className="text-sm text-muted-foreground whitespace-pre-line">{effective!.description}</p></div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground/70 border-t pt-3">
            <span>{effective!.source}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(effective!.scraped_at)}</span>
          </div>

          {/* Tab buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              variant={activeTab === "evaluate" ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => { setActiveTab(activeTab === "evaluate" ? "details" : "evaluate"); }}
            >
              <TrendingDown className="w-4 h-4" /> Evaluate
            </Button>
            <Button
              variant={activeTab === "costs" ? "default" : "secondary"}
              className="gap-1.5"
              onClick={() => { setActiveTab(activeTab === "costs" ? "details" : "costs"); }}
            >
              <Calculator className="w-4 h-4" /> Costs
            </Button>
            <Button variant="outline" className="gap-1.5" asChild>
              <a href={effective!.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> View
              </a>
            </Button>
          </div>

          {/* ===== EVALUATE SECTION ===== */}
          {activeTab === "evaluate" && (
            <div className="space-y-4 animate-fade-in border-t pt-4">
              <h3 className="font-semibold text-primary">Quick Evaluation</h3>
              {isFetching ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Fetching listing details…</div>
              ) : fetchError && (!effective!.price_eur || !effective!.length_feet || !effective!.year) ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{fetchError}</p>
                  <Button variant="outline" size="sm" onClick={fetchMissingData}>Retry</Button>
                </div>
              ) : (!effective!.price_eur || !effective!.length_feet || !effective!.year) ? (
                <p className="text-sm text-muted-foreground">Missing price, length, or year — cannot evaluate this listing.</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Engine</Label>
                      <Select value={engineCondition} onValueChange={setEngineCondition}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="bad">Bad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Hull</Label>
                      <Select value={hullCondition} onValueChange={setHullCondition}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="osmosis">Osmosis</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {effective!.boat_type === "sailboat" && (
                      <div>
                        <Label className="text-xs">Sails</Label>
                        <Select value={sailsCondition} onValueChange={setSailsCondition}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="average">Average</SelectItem>
                            <SelectItem value="worn">Worn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <Button className="w-full" size="sm" onClick={handleEvaluate}>
                    <TrendingDown className="w-4 h-4 mr-1" /> Run Evaluation
                  </Button>
                </>
              )}

              {evalResult && (
                <div className="space-y-3 animate-fade-in">
                  <Card className="p-4 text-center">
                    <p className={`text-4xl font-bold ${evalResult.color}`}>{evalResult.score}</p>
                    <p className={`text-lg font-semibold ${evalResult.color}`}>{evalResult.verdict}</p>
                    <p className="text-xs text-muted-foreground mt-1">{evalResult.priceAssessment}</p>
                  </Card>

                  <div className="space-y-2">
                    {evalResult.categories.map((cat) => (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="font-medium">{cat.icon} {cat.name}</span>
                          <span className="text-muted-foreground">{cat.score}/{cat.maxScore}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${scoreBarColor(cat.score, cat.maxScore)}`}
                            style={{ width: `${(cat.score / cat.maxScore) * 100}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{cat.details}</p>
                      </div>
                    ))}
                  </div>

                  {evalResult.estimatedRepairCost > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                      <span className="text-sm font-medium flex items-center gap-1"><Wrench className="w-4 h-4" /> Est. Repairs</span>
                      <span className="font-bold text-destructive">€{evalResult.estimatedRepairCost.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold">Recommendations</h4>
                    {evalResult.recommendations.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== COSTS SECTION ===== */}
          {activeTab === "costs" && (
            <div className="space-y-4 animate-fade-in border-t pt-4">
              <h3 className="font-semibold text-primary">Annual Ownership Cost</h3>
              {!listing.length_feet ? (
                <p className="text-sm text-muted-foreground">Missing boat length — cannot calculate costs.</p>
              ) : (
                <>
                  {loadingMarinas ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading marinas…</div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Country</Label>
                        <Select value={selectedCountry} onValueChange={v => { setSelectedCountry(v); setSelectedMarinaId(""); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All countries" /></SelectTrigger>
                          <SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Marina</Label>
                        <Select value={selectedMarinaId} onValueChange={setSelectedMarinaId}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a marina" /></SelectTrigger>
                          <SelectContent>
                            {filteredMarinas.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name} {m.region ? `(${m.region})` : ""} — €{m.price_per_meter_year}/m/yr</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full" size="sm" onClick={handleCalcCost}>
                        <DollarSign className="w-4 h-4 mr-1" /> Calculate Annual Cost
                      </Button>
                    </div>
                  )}
                </>
              )}

              {costResult && (
                <div className="space-y-3 animate-fade-in">
                  <Card className="p-4">
                    <div className="space-y-2">
                      {costResult.marina > 0 && (
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Marina berth</span><span className="font-medium">€{costResult.marina.toLocaleString()}</span></div>
                      )}
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Maintenance (low)</span><span className="font-medium">€{costResult.maintenanceLow.toLocaleString()}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Maintenance (high)</span><span className="font-medium">€{costResult.maintenanceHigh.toLocaleString()}</span></div>
                      <div className="border-t pt-2 mt-1">
                        <div className="flex justify-between font-bold"><span>Total (low)</span><span className="text-green-600">€{costResult.totalLow.toLocaleString()}/yr</span></div>
                        <div className="flex justify-between font-bold mt-0.5"><span>Total (high)</span><span className="text-orange-500">€{costResult.totalHigh.toLocaleString()}/yr</span></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Monthly: €{Math.round(costResult.totalLow / 12).toLocaleString()} – €{Math.round(costResult.totalHigh / 12).toLocaleString()}</p>
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold">Cost Breakdown</h4>
                    {categories.map(cat => {
                      const catItems = costResult.maintenanceItems.filter(i => i.category === cat);
                      const catAvg = catItems.reduce((s, i) => s + (i.costLow + i.costHigh) / 2, 0);
                      const totalAvg = (costResult.totalLow + costResult.totalHigh) / 2 || 1;
                      const pct = (catAvg / totalAvg) * 100;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium">{cat}</span>
                            <span className="text-muted-foreground">€{Math.round(catAvg).toLocaleString()} ({Math.round(pct)}%)</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                    {costResult.marina > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-medium">Marina Berth</span>
                          <span className="text-muted-foreground">€{costResult.marina.toLocaleString()}</span>
                        </div>
                        <Progress value={(costResult.marina / ((costResult.totalLow + costResult.totalHigh) / 2 || 1)) * 100} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
