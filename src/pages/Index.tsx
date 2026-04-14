import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Calculator, Ship, List, Loader2, ExternalLink, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSavedBoats } from "@/lib/boatStore";
import { supabase } from "@/integrations/supabase/client";

interface LatestListing {
  title: string;
  url: string;
  boat_type: string;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  image_url: string | null;
  engine_info: string | null;
  source: string;
}

const Index = () => {
  const savedCount = getSavedBoats().length;
  const navigate = useNavigate();
  const [listings, setListings] = useState<LatestListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-latest-listings", {
          body: { boat_type: "all" },
        });
        if (!error && data?.success && data.data) {
          setListings(data.data);
        }
      } catch (e) {
        console.error("Failed to fetch listings:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchListings();
  }, []);

  const handleCompare = (listing: LatestListing) => {
    // Navigate to evaluate page with the listing URL pre-filled
    navigate(`/evaluate?url=${encodeURIComponent(listing.url)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="text-center mb-12 animate-fade-in pt-8">
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

      {/* Latest Listings Section */}
      <div className="w-full max-w-2xl mt-16 animate-fade-in">
        <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
          🔥 Latest Listings
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Finding latest boats for sale…
          </div>
        ) : listings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing, i) => (
              <Card key={i} className="overflow-hidden hover:shadow-md transition-shadow">
                {listing.image_url && (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="w-full h-40 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="p-4">
                  <p className="font-semibold text-sm truncate">{listing.title}</p>
                  {listing.price_eur && (
                    <p className="text-lg font-bold text-accent mt-1">€{listing.price_eur.toLocaleString()}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {listing.year && <span className="text-xs text-muted-foreground">{listing.year}</span>}
                    {listing.length_feet && <span className="text-xs text-muted-foreground">{listing.length_feet}ft</span>}
                    {listing.boat_type && (
                      <span className="text-xs text-muted-foreground capitalize">{listing.boat_type}</span>
                    )}
                  </div>
                  {listing.location && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {listing.location}
                    </p>
                  )}
                  {listing.engine_info && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">⚙️ {listing.engine_info}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{listing.source}</p>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1"
                      onClick={() => handleCompare(listing)}
                    >
                      <ArrowRight className="w-3 h-3" /> Compare
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs gap-1"
                      asChild
                    >
                      <a href={listing.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" /> View Listing
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No listings found at the moment.</p>
        )}
      </div>
    </div>
  );
};

export default Index;
