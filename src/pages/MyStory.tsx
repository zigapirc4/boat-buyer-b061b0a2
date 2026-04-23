import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useState } from "react";
import myStoryImage from "@/assets/my-story-vivacity.jpg";
import myStoryWorkbenchImage from "@/assets/my-story-workbench.png";

const MyStory = () => {
  const [storyImageOpen, setStoryImageOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string>(myStoryImage);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-5 flex items-center gap-2">
          <Heart className="w-5 h-5 text-coral" /> My Story
        </h1>

        <Card className="p-4 sm:p-6 space-y-5">
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
              className="w-full h-auto object-cover block"
              loading="lazy"
            />
          </button>

          <div className="space-y-4 text-foreground/85 text-[15px] leading-relaxed">
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
                className="w-full h-auto object-cover block"
                loading="lazy"
              />
            </button>
            <p>
              Later, I realized that owning a boat isn't just about the romance — it's also about decisions, costs, and
              a lot of unknowns. That experience made it very real, very fast. It's exactly why I started building this
              project. To make the journey from "I like this boat" to "I know this is a smart decision" much easier.
              This isn't just an app. It's something I wish I had the first time I stepped aboard that little Vivacity,
              full of character and quiet promises of the sea.
            </p>
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
