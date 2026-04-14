import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, LinkIcon, Loader2, ExternalLink, Search, Wrench, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { saveBoat } from "@/lib/boatStore";
import { evaluate, type EvalResult } from "@/lib/evaluateBoat";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SimilarBoat {
  title: string;
  url: string;
  description: string;
}

const EvaluateBoat = () => {
  const { toast } = useToast();
  const [listingUrl, setListingUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [length, setLength] = useState("");
  const [engine, setEngine] = useState("");
  const [hull, setHull] = useState("");
  const [sails, setSails] = useState("");
  const [result, setResult] = useState<EvalResult | null>(null);
  const [similarBoats, setSimilarBoats] = useState<SimilarBoat[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const canEvaluate = model && year && price && length && engine && hull && sails;

  const handleScrape = async () => {
    if (!listingUrl.trim()) return;
    setIsScraping(true);
    setResult(null);
    setSimilarBoats([]);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-boat-listing", {
        body: { url: listingUrl },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        const d = data.data;
        if (d.boat_model) setModel(d.boat_model);
        if (d.year) setYear(String(d.year));
        if (d.price_eur) setPrice(String(Math.round(d.price_eur)));
        if (d.length_feet) setLength(String(Math.round(d.length_feet)));
        if (d.engine_condition) setEngine(d.engine_condition);
        if (d.hull_condition) setHull(d.hull_condition);
        if (d.sails_condition) setSails(d.sails_condition);
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

  const handleEvaluate = async () => {
    if (!canEvaluate) return;
    const evalResult = evaluate(Number(year), Number(price), Number(length), engine, hull, sails);
    setResult(evalResult);
    setSimilarBoats([]);

    // Search for similar boats in the background
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-similar-boats", {
        body: { model, length_feet: Number(length), year: Number(year) },
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

  const scoreBarColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.8) return "bg-success";
    if (pct >= 0.5) return "bg-warning";
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

      {/* Form */}
      <div className="space-y-4">
        <div><Label>Boat Model</Label><Input placeholder="e.g. Bavaria 37" value={model} onChange={e => setModel(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Year</Label><Input type="number" placeholder="2005" value={year} onChange={e => setYear(e.target.value)} /></div>
          <div><Label>Price (EUR)</Label><Input type="number" placeholder="45000" value={price} onChange={e => setPrice(e.target.value)} /></div>
        </div>
        <div><Label>Length (feet)</Label><Input type="number" placeholder="37" value={length} onChange={e => setLength(e.target.value)} /></div>

        <div><Label>Engine Condition</Label>
          <Select value={engine} onValueChange={setEngine}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="good">Good</SelectItem><SelectItem value="average">متوسط</SelectItem><SelectItem value="bad">Bad</SelectItem></SelectContent></Select></div>

        <div><Label>Hull Condition</Label>
          <Select value={hull} onValueChange={setHull}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="good">Good</SelectItem><SelectItem value="osmosis">Osmosis</SelectItem><SelectItem value="damaged">Damaged</SelectItem></SelectContent></Select></div>

        <div><Label>Sails Condition</Label>
          <Select value={sails} onValueChange={setSails}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="average">Average</SelectItem><SelectItem value="worn">Worn</SelectItem></SelectContent></Select></div>

        <Button className="w-full h-12 text-base" disabled={!canEvaluate} onClick={handleEvaluate}>Evaluate Boat</Button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4 animate-fade-in">
          {/* Overall Score */}
          <Card className="p-6 text-center">
            <p className={`text-6xl font-bold font-display ${result.color}`}>{result.score}</p>
            <p className={`text-xl font-semibold mt-1 ${result.color}`}>{result.verdict}</p>
            <p className="text-sm text-muted-foreground mt-2">{result.priceAssessment}</p>
          </Card>

          {/* Category Breakdown */}
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

          {/* Estimated Repair Costs */}
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

          {/* Recommendations */}
          <Card className="p-5">
            <h3 className="font-semibold text-primary mb-3">💡 Recommendations</h3>
            <ul className="space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-accent mt-0.5">•</span>
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
                  <a
                    key={i}
                    href={boat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{boat.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{boat.description}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No similar boats found.</p>
            )}
          </Card>

          {/* Save Button */}
          <Button variant="outline" className="w-full gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save to My Boats
          </Button>
        </div>
      )}
    </div>
  );
};

export default EvaluateBoat;
