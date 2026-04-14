import { Link } from "react-router-dom";
import { Anchor, Calculator, Ship, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSavedBoats } from "@/lib/boatStore";

const Index = () => {
  const savedCount = getSavedBoats().length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-6">
          <Anchor className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-primary mb-2">BoatBuyer</h1>
        <p className="text-muted-foreground text-lg">Smart sailboat purchase decisions</p>
      </div>

      <div className="w-full max-w-sm space-y-4 animate-fade-in">
        <Button asChild className="w-full h-14 text-base gap-3" size="lg">
          <Link to="/evaluate"><Ship className="w-5 h-5" /> Evaluate a Boat</Link>
        </Button>

        <Button asChild variant="secondary" className="w-full h-14 text-base gap-3" size="lg">
          <Link to="/cost"><Calculator className="w-5 h-5" /> Calculate Ownership Cost</Link>
        </Button>

        <Button asChild variant="outline" className="w-full h-14 text-base gap-3" size="lg">
          <Link to="/my-boats">
            <List className="w-5 h-5" /> My Boats
            {savedCount > 0 && (
              <span className="ml-auto bg-accent text-accent-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                {savedCount}
              </span>
            )}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
