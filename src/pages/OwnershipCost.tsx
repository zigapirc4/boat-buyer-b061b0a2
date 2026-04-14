import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const maintenanceCost = { light: 1000, medium: 2500, heavy: 5000 };

const OwnershipCost = () => {
  const [length, setLength] = useState("");
  const [marinaPrice, setMarinaPrice] = useState("");
  const [usage, setUsage] = useState("");
  const [result, setResult] = useState<{ marina: number; maintenance: number; total: number } | null>(null);

  const canCalc = length && marinaPrice && usage;

  const handleCalc = () => {
    if (!canCalc) return;
    const marina = Number(length) * Number(marinaPrice);
    const maintenance = maintenanceCost[usage as keyof typeof maintenanceCost];
    setResult({ marina, maintenance, total: marina + maintenance });
  };

  return (
    <div className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-primary mb-6">Ownership Cost Calculator</h1>

      <div className="space-y-4">
        <div><Label>Boat Length (meters)</Label><Input type="number" placeholder="11" value={length} onChange={e => setLength(e.target.value)} /></div>
        <div><Label>Marina Cost (EUR/meter/year)</Label><Input type="number" placeholder="120" value={marinaPrice} onChange={e => setMarinaPrice(e.target.value)} /></div>
        <div><Label>Usage Level</Label>
          <Select value={usage} onValueChange={setUsage}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="heavy">Heavy</SelectItem></SelectContent></Select></div>
        <Button className="w-full h-12 text-base" disabled={!canCalc} onClick={handleCalc}>Calculate</Button>
      </div>

      {result && (
        <Card className="mt-8 p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-primary mb-4">Yearly Cost Breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Marina</span><span className="font-medium">€{result.marina.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Maintenance</span><span className="font-medium">€{result.maintenance.toLocaleString()}</span></div>
            <div className="border-t pt-2 mt-2 flex justify-between text-base font-bold"><span>Total</span><span className="text-accent">€{result.total.toLocaleString()}</span></div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OwnershipCost;
