import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, LinkIcon, Loader2, ExternalLink, Search, Wrench, TrendingDown, MapPin, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { saveBoat } from "@/lib/boatStore";
import { evaluate, type EvalResult, type BoatType } from "@/lib/evaluateBoat";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [similarBoats, setSimilarBoats] = useState<SimilarBoat[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const canEvaluate = model && year && price && length && engine && hull && (boatType === "powerboat" || sails);

  // Auto-import from URL query param
  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setListingUrl(urlParam);
      // Trigger scrape automatically
      handleScrapeUrl(urlParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrapeUrl = async (url: string) => {
    if (!url.trim()) return;
    setIsScraping(true);
    setResult(null);
    setSimilarBoats([]);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-boat-listing", {
        body: { url },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        const d = data.data;
        if (d.boat_type) setBoatType(d.boat_type);
        if (d.boat_model) setModel(d.boat_model);
        if (d.year) setYear(String(d.year));
        if (d.price_eur) setPrice(String(Math.round(d.price_eur)));
        if (d.length_feet) setLength(String(Math.round(d.length_feet)));
        if (d.engine_condition) setEngine(d.engine_condition);
        if (d.hull_condition) setHull(d.hull_condition);
        if (d.sails_condition) setSails(d.sails_condition);
        if (d.engine_hours) setEngineHours(String(d.engine_hours));
        if (d.engine_year) setEngineYear(String(d.engine_year));

        setExtras({
          location: d.location,
          images: d.images,
          engineMake: d.engine_make,
          engineModel: d.engine_model,
          engineHp: d.engine_hp,
          engineType: d.engine_type,
          hullMaterial: d.hull_material,
          cabins: d.cabins,
          descriptionSummary: d.description_summary,
          equipmentHighlights: d.equipment_highlights,
          recentWork: d.recent_work,
          knownIssues: d.known_issues,
        });

        toast({ title: "Listing imported!", description: `Found: ${d.boat_model || "boat details"}` });
      } else {
        toast({ title: "Could not extract details", description: data?.error || "Try a different listing URL.", variant: "destructive" });
      }
    } catch (e) {
      console.error("Scrape error:", e);
      toast({ title: "Scraping failed", description: "Check the URL and try again.", variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  const handleScrape = () => handleScrapeUrl(listingUrl);

  const handleEvaluate = async () => {
    if (!canEvaluate) return;
    const evalResult = evaluate({
      boatType,
      year: Number(year),
      price: Number(price),
      lengthFt: Number(length),
      engine,
      hull,
      sails: boatType === "powerboat" ? "none" : sails,
      engineHours: engineHours ? Number(engineHours) : undefined,
      engineYear: engineYear ? Number(engineYear) : undefined,
      engineHp: extras.engineHp,
      hullMaterial: extras.hullMaterial,
      knownIssues: extras.knownIssues,
      recentWork: extras.recentWork,
    });
    setResult(evalResult);
    setSimilarBoats([]);

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-similar-boats", {
        body: { model, length_feet: Number(length), year: Number(year), boat_type: boatType },
      });
      if (!error && data?.success && data.data) {
        setSimilarBoats(data.data);
      }
    } catch (e) {
      console.error("Similar boats search error:", e);
    } finally {
      setIsSearching(false);
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
    handleScrapeUrl(boatUrl);
  };

  const scoreBarColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.75) return "bg-success";
    if (pct >= 0.45) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-2xl font-bold text-primary mb-6">Evaluate a Boat</h1>

      {/* URL Import */}
      <Card className="p-4 mb-6 border-dashed border-2">
        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
          <LinkIcon className="w-4 h-4" /> Import from listing URL
        </Label>
        <div className="flex gap-2">
          <Input placeholder="Paste boat listing URL…" value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} className="flex-1" />
          <Button onClick={handleScrape} disabled={isScraping || !listingUrl.trim()} size="sm">
            {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Works with most boat listing sites (Boat24, YachtWorld, etc.)</p>
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
        <Card className="p-3 mb-6 bg-muted/50">
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
      </div>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4 animate-fade-in">
          <Card className="p-6 text-center">
            <p className={`text-6xl font-bold font-display ${result.color}`}>{result.score}</p>
            <p className={`text-xl font-semibold mt-1 ${result.color}`}>{result.verdict}</p>
            <p className="text-sm text-muted-foreground mt-2">{result.priceAssessment}</p>
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

          {/* Similar Boats */}
          <Card className="p-5">
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" /> Similar Boats for Comparison
            </h3>
            {isSearching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching for similar boats…
              </div>
            ) : similarBoats.length > 0 ? (
              <div className="space-y-3">
                {similarBoats.map((boat, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-muted/50 overflow-hidden"
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
                        <p className="text-sm font-medium truncate">{boat.title}</p>
                        {boat.price_eur && (
                          <p className="text-sm font-bold text-accent mt-0.5">€{boat.price_eur.toLocaleString()}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {boat.year && <span className="text-xs text-muted-foreground">{boat.year}</span>}
                          {boat.length_feet && <span className="text-xs text-muted-foreground">{boat.length_feet}ft</span>}
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
                            onClick={() => handleCompareBoat(boat.url)}
                          >
                            <ArrowRight className="w-3 h-3" /> Compare
                          </Button>
                          <a href={boat.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
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
              <p className="text-sm text-muted-foreground">No similar boats found.</p>
            )}
          </Card>

          <Button variant="outline" className="w-full gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save to My Boats
          </Button>
        </div>
      )}
    </div>
  );
};

export default EvaluateBoat;
