import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { saveBoat } from "@/lib/boatStore";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EvalResult {
  score: number;
  verdict: string;
  color: string;
  penalties: string[];
}

function evaluate(year: number, price: number, engine: string, hull: string, sails: string): EvalResult {
  let score = 100;
  const penalties: string[] = [];
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age > 20) { score -= 20; penalties.push(`Boat is ${age} years old (−20)`); }
  if (engine === "bad") { score -= 30; penalties.push("Engine in bad condition (−30)"); }
  if (hull === "osmosis") { score -= 40; penalties.push("Hull has osmosis (−40)"); }
  if (hull === "damaged") { score -= 30; penalties.push("Hull is damaged (−30)"); }
  if (sails === "worn") { score -= 15; penalties.push("Sails are worn (−15)"); }
  if (price > 100000 && age > 20) { score -= 20; penalties.push("Price too high for age (−20)"); }

  score = Math.max(0, score);
  const verdict = score >= 80 ? "Good Deal" : score >= 50 ? "Fair Deal" : "Risky Purchase";
  const color = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  return { score, verdict, color, penalties };
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

  const canEvaluate = model && year && price && length && engine && hull && sails;

  const handleScrape = async () => {
    if (!listingUrl.trim()) return;
    setIsScraping(true);
    setResult(null);

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

  const handleEvaluate = () => {
    if (!canEvaluate) return;
    setResult(evaluate(Number(year), Number(price), engine, hull, sails));
  };

  const handleSave = () => {
    if (!result) return;
    saveBoat({ model, score: result.score, verdict: result.verdict });
    toast({ title: "Saved!", description: `${model} added to My Boats.` });
  };

  return (
    <div className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-2xl font-bold text-primary mb-6">Evaluate a Boat</h1>

      {/* URL Import Section */}
      <Card className="p-4 mb-6 border-dashed border-2">
        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
          <LinkIcon className="w-4 h-4" /> Import from listing URL
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Paste boat listing URL…"
            value={listingUrl}
            onChange={(e) => setListingUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleScrape} disabled={isScraping || !listingUrl.trim()} size="sm">
            {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Works with most boat listing sites (Boat24, YachtWorld, etc.)
        </p>
      </Card>

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

      {result && (
        <Card className="mt-8 p-6 text-center animate-fade-in">
          <p className={`text-6xl font-bold font-display ${result.color}`}>{result.score}</p>
          <p className={`text-xl font-semibold mt-2 ${result.color}`}>{result.verdict}</p>

          {result.penalties.length > 0 && (
            <ul className="mt-4 text-sm text-muted-foreground text-left space-y-1">
              {result.penalties.map((p, i) => <li key={i}>• {p}</li>)}
            </ul>
          )}

          <Button variant="outline" className="mt-6 gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save to My Boats
          </Button>
        </Card>
      )}
    </div>
  );
};

export default EvaluateBoat;
