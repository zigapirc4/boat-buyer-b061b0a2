import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Heart, List, MapPin, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Footer } from "@/components/Footer";
import { FeedbackButton } from "@/components/FeedbackButton";
import { BUYER_GUIDES } from "@/lib/buyerGuides";
import { getSavedListings } from "@/lib/boatStore";
import { cn } from "@/lib/utils";
import { useSupportFirstVisitHint } from "@/hooks/useSupportFirstVisitHint";

const BuyersGuides = () => {
  const { showHint: supportHint, acknowledge: acknowledgeSupportHint } = useSupportFirstVisitHint();
  const location = useLocation();
  const navigate = useNavigate();
  const [locationLabel, setLocationLabel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const savedCount = getSavedListings().length;

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

  useEffect(() => {
    const fromState = (location.state as { openArticleId?: string } | null)?.openArticleId;
    const fromQuery = new URLSearchParams(location.search).get("article");
    const next = fromState || fromQuery;
    if (next) setSelectedId(next);
    if (fromState) navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location.pathname, location.search, location.state, navigate]);

  const categories = useMemo(
    () => Array.from(new Set(BUYER_GUIDES.map((a) => a.category))),
    [],
  );
  const selectedArticle = BUYER_GUIDES.find((a) => a.id === selectedId) || null;

  const openArticle = (id: string) => {
    setSelectedId(id);
    navigate(`/buyers-guides?article=${id}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="hero-header-bg text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
          <div className="sticky top-0 z-40 -mx-4 px-4 py-2 mb-4">
            <div className="flex items-center justify-start sm:justify-end gap-4 pl-2 sm:pl-0 overflow-x-auto whitespace-nowrap scrollbar-none">
                <span className="top-nav-link-active">Buyer’s Guides</span>
                <Link to="/my-story" className="top-nav-link">My Story</Link>
                <Link to="/my-boats" className="top-nav-link">My Boats {savedCount > 0 ? `(${savedCount})` : ""}</Link>
                <div className="shrink-0">
                  <FeedbackButton pagePath="/buyers-guides" />
                </div>
                <a
                  href="https://buymeacoffee.com/pirczigau"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("top-nav-cta", supportHint && "support-first-visit-hint")}
                  onClick={acknowledgeSupportHint}
                >
                  <Heart className="w-3.5 h-3.5" /> Support
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
              Practical buying playbooks, compliance notes, and cost frameworks for smarter boat decisions.
            </p>
            <p className="text-xs text-white/70 mt-1">
              We highly value your feedback - it directly helps us make BoatBuyer better.
            </p>
          </div>
          <div className="mt-5" />
        </div>
      </div>

      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        <h1 className="text-2xl font-bold mb-2">Buyer’s Guides</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Curated practical guides to help you buy smarter, negotiate better, and avoid expensive surprises.
        </p>

        <div className="space-y-8">
          {categories.map((cat) => {
            const items = BUYER_GUIDES.filter((a) => a.category === cat);
            return (
              <section key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat}</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                  {items.map((article) => (
                    <Card
                      key={article.id}
                      onClick={() => openArticle(article.id)}
                      className="p-4 group cursor-pointer border-transparent hover:border-primary/20 premium-card shrink-0 w-[280px] sm:w-[300px] snap-start"
                    >
                      <div className={`w-9 h-9 rounded-lg ${article.color} flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}>
                        <article.icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${article.tagColor}`}>
                        {article.category}
                      </span>
                      <h3 className="text-sm font-semibold mt-2 leading-snug">{article.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{article.summary}</p>
                      <span className="text-xs text-primary font-medium mt-2 inline-block group-hover:underline">
                        Read full guide →
                      </span>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-10 h-10 rounded-lg ${selectedArticle.color} flex items-center justify-center`}>
                    <selectedArticle.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedArticle.tagColor}`}>
                    {selectedArticle.category}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold">{selectedArticle.title}</DialogTitle>
                <DialogDescription>{selectedArticle.summary}</DialogDescription>
              </DialogHeader>
              <div className="prose prose-sm max-w-none text-foreground mt-2">
                {selectedArticle.body.split("\n\n").map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-muted-foreground mb-3"
                    dangerouslySetInnerHTML={{
                      __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>').replace(/\n/g, "<br />"),
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default BuyersGuides;
