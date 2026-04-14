
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator, ExternalLink, MapPin, Clock, ChevronLeft, ChevronRight, Ship } from "lucide-react";
import { useState } from "react";

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

interface BoatDetailModalProps {
  listing: CachedListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompare: (listing: CachedListing) => void;
  onOwnershipCost: (listing: CachedListing) => void;
  timeAgo: (dateStr: string) => string;
}

export const BoatDetailModal = ({ listing, open, onOpenChange, onCompare, onOwnershipCost, timeAgo }: BoatDetailModalProps) => {
  const [imgIndex, setImgIndex] = useState(0);

  if (!listing) return null;

  const images: string[] = [];
  if (listing.image_urls?.length) {
    images.push(...listing.image_urls);
  } else if (listing.image_url) {
    images.push(listing.image_url);
  }

  const handlePrev = () => setImgIndex(i => (i > 0 ? i - 1 : images.length - 1));
  const handleNext = () => setImgIndex(i => (i < images.length - 1 ? i + 1 : 0));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setImgIndex(0); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Image gallery */}
        {images.length > 0 ? (
          <div className="relative w-full aspect-video bg-muted">
            <img
              src={images[imgIndex]}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {images.length > 1 && (
              <>
                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 hover:bg-background">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 hover:bg-background">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 text-xs px-2 py-0.5 rounded-full">
                  {imgIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center">
            <Ship className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}

        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{listing.title}</DialogTitle>
          </DialogHeader>

          {/* Price */}
          {listing.price_eur && (
            <p className="text-2xl font-bold text-primary">€{Number(listing.price_eur).toLocaleString()}</p>
          )}

          {/* Key specs */}
          <div className="flex flex-wrap gap-3">
            {listing.year && (
              <span className="text-sm bg-muted px-3 py-1 rounded-full">Year: {listing.year}</span>
            )}
            {listing.length_feet && (
              <span className="text-sm bg-muted px-3 py-1 rounded-full">{Number(listing.length_feet)} ft</span>
            )}
            {listing.boat_type && (
              <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{listing.boat_type}</span>
            )}
            {listing.hull_material && (
              <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{listing.hull_material}</span>
            )}
            {listing.cabins && (
              <span className="text-sm bg-muted px-3 py-1 rounded-full">{listing.cabins} cabins</span>
            )}
            {listing.fuel_type && (
              <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{listing.fuel_type}</span>
            )}
            {listing.engine_hours && (
              <span className="text-sm bg-muted px-3 py-1 rounded-full">{listing.engine_hours}h engine</span>
            )}
          </div>

          {/* Location */}
          {listing.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> {listing.location}
            </p>
          )}

          {/* Engine info */}
          {listing.engine_info && (
            <p className="text-sm text-muted-foreground">⚙️ {listing.engine_info}</p>
          )}

          {/* Description */}
          {listing.description && (
            <div>
              <h3 className="text-sm font-semibold mb-1">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70 border-t pt-3">
            <span>{listing.source}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(listing.scraped_at)}</span>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              variant="default"
              className="gap-1.5"
              onClick={() => { onCompare(listing); onOpenChange(false); }}
            >
              <ArrowRight className="w-4 h-4" /> Compare
            </Button>
            <Button
              variant="secondary"
              className="gap-1.5"
              onClick={() => { onOwnershipCost(listing); onOpenChange(false); }}
            >
              <Calculator className="w-4 h-4" /> Costs
            </Button>
            <Button variant="outline" className="gap-1.5" asChild>
              <a href={listing.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> View
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
