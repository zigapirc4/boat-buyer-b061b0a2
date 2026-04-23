import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Anchor, BookOpen, Heart, List, MapPin, Ship } from "lucide-react";
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
      <div className="bg-gradient-to-br from-primary via-ocean to-sky text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Anchor className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-white">BoatBuyer</h1>
                <p className="text-white/75 text-sm">Smart boat purchase decisions</p>
              </div>
            </Link>
            <div className="hidden sm:flex items-center gap-2 ml-auto">
              {locationLabel && (
                <span className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <MapPin className="w-3 h-3" /> {locationLabel}
                </span>
              )}
              <FeedbackButton pagePath="/my-story" />
              <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer">
                <Button
                  size="sm"
                  className="bg-warning hover:bg-warning/90 text-warning-foreground font-semibold text-xs gap-1.5 rounded-full px-4"
                >
                  <Heart className="w-3.5 h-3.5" /> Donate
                </Button>
              </a>
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

          <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-6">
            <Link to="/" state={{ openImport: true }} className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center hover:bg-white/20 transition-all hover:-translate-y-0.5 border border-white/10">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110">
                  <Ship className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">Import boat</p>
                <p className="text-[10px] sm:text-xs text-white/60 mt-0.5">Evaluate + ownership cost</p>
              </div>
            </Link>
            <Link to="/my-boats" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center hover:bg-white/20 transition-all hover:-translate-y-0.5 border border-white/10">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110">
                  <List className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">My Boats</p>
                <p className="text-[10px] sm:text-xs text-white/60 mt-0.5">Your shortlist</p>
              </div>
            </Link>
            <div className="group">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/25 flex items-center justify-center mx-auto mb-2">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">My Story</p>
                <p className="text-[10px] sm:text-xs text-white/70 mt-0.5">You are here</p>
              </div>
            </div>
            <Link to="/buyers-guides" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center hover:bg-white/20 transition-all hover:-translate-y-0.5 border border-white/10">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">Buyer’s Guides</p>
                <p className="text-[10px] sm:text-xs text-white/60 mt-0.5">Expert playbooks</p>
              </div>
            </Link>
          </div>
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
