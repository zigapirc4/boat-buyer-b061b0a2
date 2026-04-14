import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, ExternalLink, Heart, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSavedBoats, deleteBoat, getSavedListings, removeListing, type SavedBoat, type SavedListing } from "@/lib/boatStore";

const verdictColor = (v: string) => v === "Good Deal" ? "text-success" : v === "Fair Deal" ? "text-warning" : "text-destructive";

const MyBoats = () => {
  const [boats, setBoats] = useState<SavedBoat[]>(getSavedBoats);
  const [listings, setListings] = useState<SavedListing[]>(getSavedListings);

  const handleDelete = (id: string) => {
    deleteBoat(id);
    setBoats(getSavedBoats());
  };

  const handleRemoveListing = (id: string) => {
    removeListing(id);
    setListings(getSavedListings());
  };

  const hasContent = boats.length > 0 || listings.length > 0;

  return (
    <div className="min-h-screen p-4 pb-8 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-primary mb-6">My Boats</h1>

      {!hasContent ? (
        <p className="text-muted-foreground text-center mt-12">No boats saved yet. Use the <Heart className="w-4 h-4 inline" /> button on listings to save them here.</p>
      ) : (
        <div className="space-y-6">
          {/* Saved Listings */}
          {listings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Saved Listings ({listings.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {listings.map((l) => (
                  <Card key={l.id} className="overflow-hidden flex flex-col animate-fade-in">
                    {l.image_url && (
                      <img src={l.image_url} alt={l.title} className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="font-semibold text-sm line-clamp-2">{l.title}</p>
                      {l.price_eur && <p className="text-base font-bold text-primary mt-1">€{Number(l.price_eur).toLocaleString()}</p>}
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                        {l.year && <span>{l.year}</span>}
                        {l.length_feet && <span>{l.length_feet} ft</span>}
                        {l.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{l.location}</span>}
                      </div>
                      <div className="flex gap-1.5 mt-auto pt-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 h-7" asChild>
                          <a href={l.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-coral" onClick={() => handleRemoveListing(l.id)}>
                          <Trash2 className="w-3 h-3" /> Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Evaluated Boats */}
          {boats.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Evaluated Boats ({boats.length})</h2>
              <div className="space-y-3">
                {boats.map((b) => (
                  <Card key={b.id} className="p-4 flex items-center justify-between animate-fade-in">
                    <div>
                      <p className="font-semibold">{b.model}</p>
                      <p className="text-sm text-muted-foreground">{b.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold font-display">{b.score}</p>
                        <p className={`text-xs font-semibold ${verdictColor(b.verdict)}`}>{b.verdict}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyBoats;
