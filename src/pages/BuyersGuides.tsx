import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Anchor, BookOpen, Heart, List, MapPin, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Footer } from "@/components/Footer";
import { FeedbackButton } from "@/components/FeedbackButton";
import { BUYER_GUIDES } from "@/lib/buyerGuides";
import { getSavedBoats } from "@/lib/boatStore";

const BuyersGuides = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [locationLabel, setLocationLabel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const savedCount = getSavedBoats().length;

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
              <FeedbackButton pagePath="/buyers-guides" />
              <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground font-semibold text-xs gap-1.5 rounded-full px-4">
                  <Heart className="w-3.5 h-3.5" /> Donate
                </Button>
              </a>
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
                <p className="text-xs sm:text-sm font-semibold flex items-center gap-1 justify-center">
                  My Boats
                  {savedCount > 0 ? (
                    <span className="bg-white/25 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{savedCount}</span>
                  ) : null}
                </p>
                <p className="text-[10px] sm:text-xs text-white/60 mt-0.5">Your shortlist</p>
              </div>
            </Link>
            <Link to="/my-story" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center hover:bg-white/20 transition-all hover:-translate-y-0.5 border border-white/10">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">My Story</p>
                <p className="text-[10px] sm:text-xs text-white/60 mt-0.5">Why BoatBuyer exists</p>
              </div>
            </Link>
            <div className="group">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/25 flex items-center justify-center mx-auto mb-2">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">Buyer’s Guides</p>
                <p className="text-[10px] sm:text-xs text-white/70 mt-0.5">You are here</p>
              </div>
            </div>
          </div>
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
