import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackButton } from "@/components/FeedbackButton";
import { BookOpen, Heart, List, MapPin, Ship } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import myStoryImage from "@/assets/my-story-vivacity.jpg";
import myStoryWorkbenchImage from "@/assets/my-story-workbench.png";

const MyStory = () => {
  const [storyImageOpen, setStoryImageOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string>(myStoryImage);
  const [locationLabel, setLocationLabel] = useState("");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`,
            );
            const data = await res.json();
            const city = data?.address?.city || data?.address?.town || data?.address?.state;
            const country = data?.address?.country;
            setLocationLabel(city || country || "");
          } catch {
            setLocationLabel("");
          }
        },
        () => {},
        { timeout: 5000 },
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="hero-header-bg text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
          <div className="sticky top-0 z-40 -mx-4 px-4 py-2 mb-4">
            <div className="flex items-center justify-end gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
                <Link to="/buyers-guides" className="top-nav-link">Buyer’s Guides</Link>
                <span className="top-nav-link-active">My Story</span>
                <Link to="/my-boats" className="top-nav-link">My Boats</Link>
                <div className="shrink-0">
                  <FeedbackButton pagePath="/my-story" />
                </div>
                <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer" className="top-nav-cta">
                  <Heart className="w-3.5 h-3.5" /> Donate
                </a>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <Link to="/" className="inline-flex items-center">
              <img src="/logo-horizontal.png" alt="BoatBuyer" className="h-12 sm:h-14 w-auto" />
            </Link>
            <div className="hidden sm:flex items-center gap-2 ml-auto">
              {locationLabel && (
                <span className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <MapPin className="w-3 h-3" /> {locationLabel}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 max-w-2xl">
            <p className="text-sm sm:text-base text-white/90">
              The story behind BoatBuyer and the first boat that started everything.
            </p>
            <p className="text-xs text-white/70 mt-1">
              We highly value your feedback - it directly helps us make BoatBuyer better.
            </p>
          </div>

          <div className="mt-5" />
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-5 flex items-center gap-2">
          <Heart className="w-5 h-5 text-coral" /> My Story
        </h1>

        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="space-y-4 text-foreground/85 text-[15px] leading-relaxed flex-1 min-w-0">
            <p>
              That moment captured in this photo is where it all started — not with a perfect plan, but with curiosity
              and a pull toward the sea. We were standing on a Vivacity 20 from 1975 — a small British cruiser with a
              timeless, almost stubborn charm. Built in an era when boats were made to last and to be lived with, not
              just owned, she carries that old-school character in every line of her hull.
            </p>
            <p>
              Back then, I wasn't thinking about costs, marinas, or long-term value. I was thinking about what it
              feels like to be out there, away from routine, with a sense of complete freedom. That changed quite
              quickly. On our first serious trip, we learned in a rather unpleasant way that the engine had reached the
              end of its life — it failed at sea, and it became clear that a full replacement wasn't a choice, but a
              necessity.
            </p>
            <p>
              Later, I realized that owning a boat isn't just about the romance — it's also about decisions, costs, and
              a lot of unknowns. That experience made it very real, very fast. It's exactly why I started building this
              project. To make the journey from "I like this boat" to "I know this is a smart decision" much easier.
              This isn't just an app. It's something I wish I had the first time I stepped aboard that little Vivacity,
              full of character and quiet promises of the sea.
            </p>
            </div>
            <div className="shrink-0 w-44 sm:w-48 self-center sm:self-start space-y-3">
              <button
                type="button"
                onClick={() => {
                  setActiveImage(myStoryImage);
                  setStoryImageOpen(true);
                }}
                className="w-full rounded-lg overflow-hidden shadow-md border border-border/40 hover:shadow-lg transition-all cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="View full size photo"
              >
                <img
                  src={myStoryImage}
                  alt="Standing on a 1975 Vivacity 20 sailboat in a Croatian marina, raising the Croatian flag"
                  className="w-full h-36 object-cover block"
                  loading="lazy"
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveImage(myStoryWorkbenchImage);
                  setStoryImageOpen(true);
                }}
                className="w-full rounded-lg overflow-hidden shadow-md border border-border/40 hover:shadow-lg transition-all cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="View working on boat photo"
              >
                <img
                  src={myStoryWorkbenchImage}
                  alt="Working on BoatBuyer from the cockpit in a marina"
                  className="w-full h-28 object-cover block"
                  loading="lazy"
                />
              </button>
              <p className="text-[11px] text-muted-foreground italic">Two moments: where it started and where it is being built.</p>
            </div>
          </div>
        </Card>
      </main>

      <Dialog open={storyImageOpen} onOpenChange={setStoryImageOpen}>
        <DialogContent className="max-w-4xl p-2 sm:p-4 bg-background">
          <DialogHeader className="sr-only">
            <DialogTitle>My Story — Vivacity 20</DialogTitle>
            <DialogDescription>Full size photo of a 1975 Vivacity 20 sailboat</DialogDescription>
          </DialogHeader>
          <img
            src={activeImage}
            alt={
              activeImage === myStoryWorkbenchImage
                ? "Working on BoatBuyer from the cockpit in a marina"
                : "Standing on a 1975 Vivacity 20 sailboat in a Croatian marina, raising the Croatian flag"
            }
            className="w-full h-auto max-h-[85vh] object-contain rounded-md"
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default MyStory;
