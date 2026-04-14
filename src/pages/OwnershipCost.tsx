
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, LinkIcon, Loader2, Anchor, MapPin, Wrench, DollarSign, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Marina {
  id: string;
  name: string;
  country: string;
  region: string | null;
  price_per_meter_year: number | null;
}

interface BoatInfo {
  name: string;
  year: number | null;
  lengthM: number | null;
  boatType: string;
  engineHours: number | null;
  engineAge: number | null;
  hullMaterial: string | null;
  hasInboard: boolean;
}

interface MaintenanceItem {
  category: string;
  item: string;
  costLow: number;
  costHigh: number;
  frequency: string;
  applicable: boolean;
}

function getMaintenanceBreakdown(boat: BoatInfo): MaintenanceItem[] {
  const len = boat.lengthM || 10;
  const age = boat.year ? new Date().getFullYear() - boat.year : 15;
  const isSail = boat.boatType === "sailboat";
  const items: MaintenanceItem[] = [];

  // Hull & bottom
  items.push({ category: "Hull", item: "Antifouling paint", costLow: len * 30, costHigh: len * 60, frequency: "Yearly", applicable: true });
  items.push({ category: "Hull", item: "Hull polishing & waxing", costLow: 200, costHigh: 600, frequency: "Yearly", applicable: true });
  items.push({ category: "Hull", item: "Anode replacement", costLow: 100, costHigh: 300, frequency: "Yearly", applicable: true });
  items.push({ category: "Hull", item: "Osmosis treatment", costLow: 1500, costHigh: 4000, frequency: "Every 10 years", applicable: boat.hullMaterial === "fiberglass" || !boat.hullMaterial });

  // Engine
  items.push({ category: "Engine", item: "Oil & filter change", costLow: 80, costHigh: 200, frequency: "Yearly", applicable: true });
  items.push({ category: "Engine", item: "Impeller replacement", costLow: 50, costHigh: 150, frequency: "Yearly", applicable: true });
  items.push({ category: "Engine", item: "Fuel filter & water separator", costLow: 40, costHigh: 100, frequency: "Yearly", applicable: true });
  items.push({ category: "Engine", item: "Belt replacement", costLow: 30, costHigh: 80, frequency: "Every 2 years", applicable: true });
  items.push({ category: "Engine", item: "Winterization", costLow: 150, costHigh: 400, frequency: "Yearly", applicable: true });
  items.push({ category: "Engine", item: "Major engine service", costLow: 800, costHigh: 2500, frequency: "Every 5 years", applicable: age > 10 || (boat.engineHours || 0) > 2000 });

  // Sails (sailboat only)
  if (isSail) {
    items.push({ category: "Sails & Rigging", item: "Sail inspection & repair", costLow: 200, costHigh: 800, frequency: "Yearly", applicable: true });
    items.push({ category: "Sails & Rigging", item: "Standing rigging inspection", costLow: 150, costHigh: 400, frequency: "Yearly", applicable: true });
    items.push({ category: "Sails & Rigging", item: "Running rigging replacement", costLow: 300, costHigh: 1000, frequency: "Every 5 years", applicable: age > 5 });
    items.push({ category: "Sails & Rigging", item: "Full rigging replacement", costLow: 3000, costHigh: 8000, frequency: "Every 10-15 years", applicable: age > 10 });
  }

  // Electrical
  items.push({ category: "Electrical", item: "Battery replacement", costLow: 200, costHigh: 600, frequency: "Every 3-5 years", applicable: true });
  items.push({ category: "Electrical", item: "Electrical system check", costLow: 100, costHigh: 300, frequency: "Yearly", applicable: true });

  // Safety
  items.push({ category: "Safety", item: "Life raft service", costLow: 200, costHigh: 500, frequency: "Every 2-3 years", applicable: true });
  items.push({ category: "Safety", item: "Fire extinguisher service", costLow: 50, costHigh: 150, frequency: "Yearly", applicable: true });
  items.push({ category: "Safety", item: "Flare replacement", costLow: 80, costHigh: 200, frequency: "Every 3 years", applicable: true });

  // Insurance & admin
  items.push({ category: "Insurance & Admin", item: "Boat insurance", costLow: len * 40, costHigh: len * 80, frequency: "Yearly", applicable: true });
  items.push({ category: "Insurance & Admin", item: "Registration renewal", costLow: 50, costHigh: 200, frequency: "Yearly", applicable: true });

  // Haulout
  items.push({ category: "Haulout", item: "Crane / travel lift", costLow: len * 15, costHigh: len * 30, frequency: "Yearly (for antifouling)", applicable: true });
  items.push({ category: "Haulout", item: "Hard stand storage (winter)", costLow: len * 10, costHigh: len * 25, frequency: "Yearly", applicable: true });

  return items;
}

const OwnershipCost = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Boat import
  const [listingUrl, setListingUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [boat, setBoat] = useState<BoatInfo | null>(null);

  // Marina
  const [marinas, setMarinas] = useState<Marina[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedMarinaId, setSelectedMarinaId] = useState("");
  const [loadingMarinas, setLoadingMarinas] = useState(true);

  // Result
  const [result, setResult] = useState<{
    marina: number;
    maintenanceItems: MaintenanceItem[];
    maintenanceLow: number;
    maintenanceHigh: number;
    totalLow: number;
    totalHigh: number;
    haulout: number;
    insurance: number;
  } | null>(null);

  // Load marinas
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("marinas").select("id, name, country, region, price_per_meter_year").order("country").order("name");
      if (data) {
        setMarinas(data);
        const c = [...new Set(data.map(m => m.country))].sort();
        setCountries(c);
      }
      setLoadingMarinas(false);
    };
    load();
  }, []);

  // Auto-import from URL param
  useEffect(() => {
    const url = searchParams.get("url");
    if (url) {
      setListingUrl(url);
      handleImport(url);
    }
  }, []);

  const handleImport = async (url?: string) => {
    const targetUrl = url || listingUrl;
    if (!targetUrl) return;
    setIsScraping(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-boat-listing", { body: { url: targetUrl } });
      if (error) throw error;
      if (!data?.success || !data.data) throw new Error(data?.error || "Could not extract boat details");
      const d = data.data;
      setBoat({
        name: d.boat_model || d.title || "Unknown Boat",
        year: d.year || null,
        lengthM: d.length_feet ? d.length_feet * 0.3048 : null,
        boatType: d.boat_type || "sailboat",
        engineHours: d.engine_hours || null,
        engineAge: d.engine_year ? new Date().getFullYear() - d.engine_year : null,
        hullMaterial: d.hull_material || null,
        hasInboard: true,
      });
      toast({ title: "Boat imported", description: d.boat_model || d.title });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  const filteredMarinas = marinas.filter(m => !selectedCountry || m.country === selectedCountry);
  const selectedMarina = marinas.find(m => m.id === selectedMarinaId);

  const handleCalc = () => {
    if (!boat || !selectedMarina || !boat.lengthM) {
      toast({ title: "Missing info", description: "Import a boat and select a marina", variant: "destructive" });
      return;
    }

    const marinaCost = boat.lengthM * (selectedMarina.price_per_meter_year || 0);
    const items = getMaintenanceBreakdown(boat);
    const applicableItems = items.filter(i => i.applicable);

    const yearlyItems = applicableItems.filter(i => i.frequency === "Yearly");
    const periodicItems = applicableItems.filter(i => i.frequency !== "Yearly");

    let maintenanceLow = 0;
    let maintenanceHigh = 0;

    for (const item of yearlyItems) {
      maintenanceLow += item.costLow;
      maintenanceHigh += item.costHigh;
    }

    for (const item of periodicItems) {
      const match = item.frequency.match(/(\d+)/);
      const years = match ? parseInt(match[1]) : 3;
      maintenanceLow += item.costLow / years;
      maintenanceHigh += item.costHigh / years;
    }

    maintenanceLow = Math.round(maintenanceLow);
    maintenanceHigh = Math.round(maintenanceHigh);

    const haulout = applicableItems.filter(i => i.category === "Haulout").reduce((s, i) => s + (i.costLow + i.costHigh) / 2, 0);
    const insurance = applicableItems.filter(i => i.category === "Insurance & Admin").reduce((s, i) => s + (i.costLow + i.costHigh) / 2, 0);

    setResult({
      marina: Math.round(marinaCost),
      maintenanceItems: applicableItems,
      maintenanceLow,
      maintenanceHigh,
      totalLow: Math.round(marinaCost + maintenanceLow),
      totalHigh: Math.round(marinaCost + maintenanceHigh),
      haulout: Math.round(haulout),
      insurance: Math.round(insurance),
    });
  };

  const categories = result ? [...new Set(result.maintenanceItems.map(i => i.category))] : [];

  return (
    <div className="min-h-screen p-4 pb-8 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-primary mb-2">Ownership Cost Calculator</h1>
      <p className="text-muted-foreground text-sm mb-6">Paste a listing link and select a marina to get a full annual cost breakdown.</p>

      {/* Step 1: Import boat */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Ship className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Step 1: Import Boat</h2>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Paste boat listing URL..."
            value={listingUrl}
            onChange={e => setListingUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => handleImport()} disabled={isScraping || !listingUrl}>
            {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
            Import
          </Button>
        </div>
        {boat && (
          <div className="mt-3 p-3 rounded-md bg-muted/50 text-sm space-y-1">
            <div className="font-medium text-foreground">{boat.name}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {boat.year && <span>Year: {boat.year}</span>}
              {boat.lengthM && <span>Length: {boat.lengthM.toFixed(1)}m</span>}
              <span className="capitalize">{boat.boatType}</span>
              {boat.hullMaterial && <span>Hull: {boat.hullMaterial}</span>}
              {boat.engineHours && <span>Engine: {boat.engineHours}h</span>}
            </div>
          </div>
        )}
      </Card>

      {/* Step 2: Select marina */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Step 2: Select Marina</h2>
        </div>
        {loadingMarinas ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading marinas...</div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Select value={selectedCountry} onValueChange={v => { setSelectedCountry(v); setSelectedMarinaId(""); }}>
                <SelectTrigger><SelectValue placeholder="All countries" /></SelectTrigger>
                <SelectContent>
                  {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Marina</Label>
              <Select value={selectedMarinaId} onValueChange={setSelectedMarinaId}>
                <SelectTrigger><SelectValue placeholder="Select a marina" /></SelectTrigger>
                <SelectContent>
                  {filteredMarinas.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.region ? `(${m.region})` : ""} — €{m.price_per_meter_year}/m/yr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMarina && (
              <div className="text-xs text-muted-foreground">
                {selectedMarina.name}, {selectedMarina.country} — €{selectedMarina.price_per_meter_year}/meter/year
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Calculate */}
      <Button className="w-full h-12 text-base mb-6" disabled={!boat || !selectedMarinaId} onClick={handleCalc}>
        <DollarSign className="w-5 h-5 mr-2" /> Calculate Annual Cost
      </Button>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-primary mb-4">Annual Cost Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Marina berth</span><span className="font-medium">€{result.marina.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Maintenance (low est.)</span><span className="font-medium">€{result.maintenanceLow.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Maintenance (high est.)</span><span className="font-medium">€{result.maintenanceHigh.toLocaleString()}</span></div>
              <div className="border-t pt-3 mt-2">
                <div className="flex justify-between text-base font-bold"><span>Total (low)</span><span className="text-green-600">€{result.totalLow.toLocaleString()}/yr</span></div>
                <div className="flex justify-between text-base font-bold mt-1"><span>Total (high)</span><span className="text-orange-500">€{result.totalHigh.toLocaleString()}/yr</span></div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Monthly: €{Math.round(result.totalLow / 12).toLocaleString()} – €{Math.round(result.totalHigh / 12).toLocaleString()}
              </div>
            </div>
          </Card>

          {/* Cost breakdown chart */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-primary mb-4">Cost Breakdown by Category</h2>
            <div className="space-y-3">
              {categories.map(cat => {
                const catItems = result.maintenanceItems.filter(i => i.category === cat);
                const catAvg = catItems.reduce((s, i) => s + (i.costLow + i.costHigh) / 2, 0);
                const totalAvg = (result.totalLow + result.totalHigh) / 2;
                const pct = totalAvg > 0 ? (catAvg / totalAvg) * 100 : 0;

                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted-foreground">€{Math.round(catAvg).toLocaleString()} ({Math.round(pct)}%)</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Marina Berth</span>
                  <span className="text-muted-foreground">€{result.marina.toLocaleString()} ({Math.round((result.marina / ((result.totalLow + result.totalHigh) / 2)) * 100)}%)</span>
                </div>
                <Progress value={(result.marina / ((result.totalLow + result.totalHigh) / 2)) * 100} className="h-2" />
              </div>
            </div>
          </Card>

          {/* Detailed items */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-primary mb-4">Detailed Maintenance Items</h2>
            <div className="space-y-4">
              {categories.map(cat => (
                <div key={cat}>
                  <h3 className="font-semibold text-sm text-primary mb-2 flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> {cat}
                  </h3>
                  <div className="space-y-1">
                    {result.maintenanceItems.filter(i => i.category === cat).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                        <div>
                          <span className="text-foreground">{item.item}</span>
                          <span className="text-xs text-muted-foreground ml-2">({item.frequency})</span>
                        </div>
                        <span className="text-muted-foreground whitespace-nowrap">€{item.costLow.toLocaleString()} – €{item.costHigh.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OwnershipCost;
