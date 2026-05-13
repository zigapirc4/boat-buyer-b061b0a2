import { ArrowRight, Clock, ExternalLink, GitCompareArrows, Heart, MapPin, Ship } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatListingPlaceLine } from "@/lib/listingPlaceDisplay";

export interface BoatListingCardListing {
  id: string;
  title: string;
  url: string;
  boat_type: string | null;
  segment?: string | null;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  country?: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  hull_material: string | null;
  source: string | null;
  scraped_at: string;
}

interface BoatListingCardProps {
  listing: BoatListingCardListing;
  imageUrl: string | null;
  insightLabel: "Great deal" | "Fair" | "Overpriced" | "No market data";
  insightReason: string;
  isSaved: boolean;
  isCompared?: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
  onToggleCompare?: () => void;
  timeAgo: (dateStr: string) => string;
}

function formatSegmentLabel(segment: string): string {
  return segment
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function BoatListingCard({
  listing,
  imageUrl,
  insightLabel,
  insightReason,
  isSaved,
  isCompared = false,
  onOpen,
  onToggleSave,
  onToggleCompare,
  timeAgo,
}: BoatListingCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col cursor-pointer group premium-card" onClick={onOpen}>
      <div className="relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-40 object-cover transition-transform group-hover:scale-[1.02]"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-40 bg-muted flex items-center justify-center">
            <Ship className="w-12 h-12 text-muted-foreground/20" />
          </div>
        )}
        {listing.boat_type && (
          <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-full capitalize">
            {listing.boat_type}
          </span>
        )}
        {listing.segment && (
          <span className="absolute top-8 left-2 bg-background/80 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-full">
            {formatSegmentLabel(listing.segment)}
          </span>
        )}
        <span
          className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm ${
            insightLabel === "Great deal"
              ? "bg-success/90 text-white"
              : insightLabel === "Overpriced"
                ? "bg-destructive/90 text-white"
                : "bg-background/80 text-foreground"
          }`}
        >
          {insightLabel}
        </span>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="font-semibold text-sm truncate leading-tight">{listing.title}</p>
        {listing.price_eur && <p className="text-lg font-bold text-primary mt-0.5">€{Number(listing.price_eur).toLocaleString()}</p>}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {listing.year && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {listing.year}
            </span>
          )}
          {listing.length_feet && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {Number(listing.length_feet)}ft
            </span>
          )}
          {listing.hull_material && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">
              {listing.hull_material}
            </span>
          )}
        </div>
        {(() => {
          const place = formatListingPlaceLine(listing);
          if (!place) return null;
          return (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{place}</span>
            </p>
          );
        })()}
        <p className="text-[11px] text-muted-foreground mt-1">{insightReason}</p>
        <div className="flex items-center gap-2 mt-auto pt-1.5">
          <p className="text-[10px] text-muted-foreground/60 truncate">{listing.source}</p>
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
            <Clock className="w-2.5 h-2.5" /> {timeAgo(listing.scraped_at)}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1 mt-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1 h-7 rounded-lg px-2 min-w-0"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            <ArrowRight className="w-3 h-3" /> Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 h-7 rounded-lg px-2 min-w-0"
            onClick={(e) => e.stopPropagation()}
            asChild
          >
            <a href={listing.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" /> View
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs gap-1 h-7 w-7 rounded-lg p-0 shrink-0 ${isSaved ? "text-coral" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-coral" : ""}`} />
          </Button>
          {onToggleCompare && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCompared ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 rounded-lg p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCompare();
                    }}
                  >
                    <GitCompareArrows className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCompared ? "Remove from compare" : "Add to compare"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </Card>
  );
}
