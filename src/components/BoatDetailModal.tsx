
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Clock, ChevronLeft, ChevronRight, Ship, TrendingDown, Wrench, DollarSign, Calculator, Loader2, Search, Heart, Copy, ChevronsUpDown, Check } from "lucide-react";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { evaluate, type EvalResult, type BoatType } from "@/lib/evaluateBoat";
import { fetchComparables } from "@/lib/fetchComparables";
import { supabase } from "@/integrations/supabase/client";
import {
  generateNegotiationScript,
  type NegotiationLanguage,
  type NegotiationTone,
} from "@/lib/negotiation";

interface CachedListing {
  id: string;
  title: string;
  url: string;
  boat_type: string;
  segment?: string | null;
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
  equipment?: string[] | null;
  source: string | null;
  scraped_at: string;
  specs_raw?: any;
}

interface SimilarBoat {
  title: string;
  url: string;
  price_eur: number | null;
  year: number | null;
  length_feet: number | null;
  location: string | null;
  image_url: string | null;
  engine_info?: string | null;
  description?: string | null;
  boat_type?: string | null;
}

interface Marina {
  id: string;
  name: string;
  country: string;
  region: string | null;
  price_per_meter_year: number | null;
}

interface MaintenanceItem {
  category: string;
  item: string;
  costLow: number;
  costHigh: number;
  frequency: string;
  applicable: boolean;
  rationale?: string;
  optionsHint?: string;
}

// Infer engine condition from available data
function inferEngineCondition(engineHours: number | null | undefined, year: number | null, engineInfo: string | null): string {
  const age = year ? new Date().getFullYear() - year : null;
  const hours = engineHours || 0;
  
  // Check engine info text for clues
  const info = (engineInfo || "").toLowerCase();
  if (info.includes("new engine") || info.includes("rebuilt") || info.includes("overhauled")) return "good";
  if (info.includes("needs") || info.includes("problem") || info.includes("issue")) return "bad";
  
  if (hours > 5000 || (age && age > 25)) return "bad";
  if (hours > 2000 || (age && age > 15)) return "average";
  return "good";
}

// Infer hull condition from available data
function inferHullCondition(hullMaterial: string | null, year: number | null, description: string | null): string {
  const desc = (description || "").toLowerCase();
  if (desc.includes("osmosis") || desc.includes("blistering")) return "osmosis";
  if (desc.includes("hull damage") || desc.includes("collision") || desc.includes("grounding")) return "damaged";
  return "good";
}

// Infer sails condition from available data
function inferSailsCondition(year: number | null, description: string | null): string {
  const desc = (description || "").toLowerCase();
  if (desc.includes("new sail") || desc.includes("new genoa") || desc.includes("new main")) return "new";
  if (desc.includes("worn sail") || desc.includes("old sail") || desc.includes("needs sail")) return "worn";
  const age = year ? new Date().getFullYear() - year : 15;
  if (age <= 5) return "new";
  if (age <= 15) return "average";
  return "worn";
}

function getMaintenanceBreakdown(lengthM: number, year: number | null, boatType: string, hullMaterial: string | null, engineHours: number | null): MaintenanceItem[] {
  const len = lengthM;
  const age = year ? new Date().getFullYear() - year : 15;
  const isSail = boatType === "sailboat";
  const items: MaintenanceItem[] = [];
  const sizeClass = len < 8 ? "small" : len < 12 ? "medium" : "large";

  items.push({
    category: "Hull",
    item: "Antifouling paint",
    costLow: len * 30,
    costHigh: len * 60,
    frequency: "Yearly",
    applicable: true,
    rationale: `Prevents marine growth that increases drag and fuel burn. Cost scales with hull surface (${sizeClass} boat: ${len.toFixed(1)}m).`,
    optionsHint: "DIY roll-on systems are cheaper; yard application is faster and usually more durable.",
  });
  items.push({
    category: "Hull",
    item: "Hull polishing & waxing",
    costLow: 200,
    costHigh: 600,
    frequency: "Yearly",
    applicable: true,
    rationale: "Protects gelcoat/paint from UV and oxidation; keeps resale condition stronger over time.",
    optionsHint: "Basic annual polish is enough for many boats; premium compounds raise cost but last longer.",
  });
  items.push({
    category: "Hull",
    item: "Anode replacement",
    costLow: 100,
    costHigh: 300,
    frequency: "Yearly",
    applicable: true,
    rationale: "Sacrificial anodes reduce galvanic corrosion on underwater metals.",
    optionsHint: "Saltwater marinas and shore-power exposure usually increase replacement frequency.",
  });
  items.push({
    category: "Hull",
    item: "Osmosis treatment",
    costLow: 1500,
    costHigh: 4000,
    frequency: "Every 10 years",
    applicable: hullMaterial === "fiberglass" || !hullMaterial,
    rationale: `Relevant mostly for fiberglass hulls, especially as boats age (${age} years old).`,
    optionsHint: "Localized treatment is cheaper; full peel/epoxy barrier is costly but comprehensive.",
  });

  items.push({
    category: "Engine",
    item: "Oil & filter change",
    costLow: 80,
    costHigh: 200,
    frequency: "Yearly",
    applicable: true,
    rationale: "Core preventive maintenance that protects bearings and extends engine life.",
    optionsHint: "Single-engine setups are cheaper than twin engines; premium oil/filter brands increase cost.",
  });
  items.push({
    category: "Engine",
    item: "Impeller replacement",
    costLow: 50,
    costHigh: 150,
    frequency: "Yearly",
    applicable: true,
    rationale: "Critical cooling component; failure can overheat and damage the engine quickly.",
    optionsHint: "Annual proactive replacement is usually cheaper than emergency repair.",
  });
  items.push({
    category: "Engine",
    item: "Fuel filter & water separator",
    costLow: 40,
    costHigh: 100,
    frequency: "Yearly",
    applicable: true,
    rationale: "Keeps injectors and fuel system protected from contamination and water.",
    optionsHint: "Frequent tank refills from mixed-quality sources may require more frequent changes.",
  });
  items.push({
    category: "Engine",
    item: "Belt replacement",
    costLow: 30,
    costHigh: 80,
    frequency: "Every 2 years",
    applicable: true,
    rationale: "Aged belts increase risk of charging/cooling failures.",
    optionsHint: "Part-only replacement is cheap; full tensioner/pulley service raises cost.",
  });
  items.push({
    category: "Engine",
    item: "Winterization",
    costLow: 150,
    costHigh: 400,
    frequency: "Yearly",
    applicable: true,
    rationale: "Prevents freeze/corrosion damage during lay-up periods.",
    optionsHint: "DIY can reduce cost if done correctly; yard service lowers execution risk.",
  });
  items.push({
    category: "Engine",
    item: "Major engine service",
    costLow: 800,
    costHigh: 2500,
    frequency: "Every 5 years",
    applicable: age > 10 || (engineHours || 0) > 2000,
    rationale: `Triggered by age/hours profile (${age} years${engineHours ? `, ${engineHours}h` : ""}). Older/high-hour engines need deeper preventive work.`,
    optionsHint: "Scope ranges from injector/turbo checks to major overhaul depending on diagnostics.",
  });

  if (isSail) {
    items.push({
      category: "Sails & Rigging",
      item: "Sail inspection & repair",
      costLow: 200,
      costHigh: 800,
      frequency: "Yearly",
      applicable: true,
      rationale: "Sailcloth, stitching and UV strips degrade with use and sun exposure.",
      optionsHint: "Patch/repair is cheaper; full recut or replacement is significantly more expensive.",
    });
    items.push({
      category: "Sails & Rigging",
      item: "Standing rigging inspection",
      costLow: 150,
      costHigh: 400,
      frequency: "Yearly",
      applicable: true,
      rationale: "Wire terminals and fittings are critical safety points on sailboats.",
      optionsHint: "Inspection cost is low compared to mast/rig failure risk.",
    });
    items.push({
      category: "Sails & Rigging",
      item: "Running rigging replacement",
      costLow: 300,
      costHigh: 1000,
      frequency: "Every 5 years",
      applicable: age > 5,
      rationale: `Lines age with UV/load cycles; older boats typically need partial replacement (${age} years).`,
      optionsHint: "Performance lines cost more; cruising-grade ropes are a practical middle ground.",
    });
    items.push({
      category: "Sails & Rigging",
      item: "Full rigging replacement",
      costLow: 3000,
      costHigh: 8000,
      frequency: "Every 10-15 years",
      applicable: age > 10,
      rationale: `Long-term safety replacement for aging rigs (${age} years).`,
      optionsHint: "Partial replacement is cheaper short-term; full replacement gives stronger reliability.",
    });
  }

  items.push({
    category: "Electrical",
    item: "Battery replacement",
    costLow: 200,
    costHigh: 600,
    frequency: "Every 3-5 years",
    applicable: true,
    rationale: "Battery capacity fades with cycles and calendar age; weak batteries create reliability issues.",
    optionsHint: "Lead-acid is cheaper; AGM/LiFePO4 options cost more but improve performance/lifetime.",
  });
  items.push({
    category: "Electrical",
    item: "Electrical system check",
    costLow: 100,
    costHigh: 300,
    frequency: "Yearly",
    applicable: true,
    rationale: "Detects corrosion, loose terminals, and charging faults before failures at sea.",
    optionsHint: "Basic visual check is cheap; load testing and thermal diagnostics cost more.",
  });

  items.push({
    category: "Safety",
    item: "Life raft service",
    costLow: 200,
    costHigh: 500,
    frequency: "Every 2-3 years",
    applicable: true,
    rationale: "Mandatory/strongly recommended safety readiness for offshore and longer passages.",
    optionsHint: "Service interval and raft size drive cost differences.",
  });
  items.push({
    category: "Safety",
    item: "Fire extinguisher service",
    costLow: 50,
    costHigh: 150,
    frequency: "Yearly",
    applicable: true,
    rationale: "Required for safety compliance and emergency preparedness.",
    optionsHint: "Refill/service is cheaper than replacing multiple units.",
  });
  items.push({
    category: "Safety",
    item: "Flare replacement",
    costLow: 80,
    costHigh: 200,
    frequency: "Every 3 years",
    applicable: true,
    rationale: "Pyrotechnics expire and must be replaced to stay compliant and usable.",
    optionsHint: "Bundle packs lower unit cost vs single replacements.",
  });

  items.push({
    category: "Insurance & Admin",
    item: "Boat insurance",
    costLow: len * 40,
    costHigh: len * 80,
    frequency: "Yearly",
    applicable: true,
    rationale: `Insurance scales with vessel value, size (${len.toFixed(1)}m), type (${boatType}) and cruising zone.`,
    optionsHint: "Higher deductibles reduce premium; broader coverage and wider cruising areas increase premium.",
  });
  items.push({
    category: "Insurance & Admin",
    item: "Registration renewal",
    costLow: 50,
    costHigh: 200,
    frequency: "Yearly",
    applicable: true,
    rationale: "Administrative renewal and compliance fees required by flag/state rules.",
    optionsHint: "Fees vary by jurisdiction and vessel class.",
  });

  items.push({
    category: "Haulout",
    item: "Crane / travel lift",
    costLow: len * 15,
    costHigh: len * 30,
    frequency: "Yearly (for antifouling)",
    applicable: true,
    rationale: `Lift/launch handling cost scales with vessel size and yard equipment class (${sizeClass}).`,
    optionsHint: "Busy premium yards and larger travel lifts usually cost more.",
  });
  items.push({
    category: "Haulout",
    item: "Hard stand storage (winter)",
    costLow: len * 10,
    costHigh: len * 25,
    frequency: "Yearly",
    applicable: true,
    rationale: "Off-water storage reduces winter wear and simplifies seasonal maintenance.",
    optionsHint: "Indoor storage is pricier; outdoor stands are cheaper but with more weather exposure.",
  });

  return items;
}

interface BoatDetailModalProps {
  listing: CachedListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeAgo: (dateStr: string) => string;
  isSaved?: boolean;
  onToggleSave?: (listing: CachedListing) => void;
  initialTab?: "details" | "evaluate" | "costs";
  onNavigateToListing?: (url: string, initialTab?: "details" | "evaluate" | "costs") => void;
}

function formatSegmentLabel(segment: string): string {
  return segment
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export const BoatDetailModal = ({
  listing,
  open,
  onOpenChange,
  timeAgo,
  isSaved,
  onToggleSave,
  initialTab = "details",
  onNavigateToListing,
}: BoatDetailModalProps) => {
  const DESCRIPTION_PREVIEW_LENGTH = 420;
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "evaluate" | "costs">(initialTab);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const descriptionToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const descriptionAnchorRef = useRef<{ prevButtonTop: number; prevScrollTop: number } | null>(null);

  // Enriched listing data (merged with fetched data)
  const [enrichedListing, setEnrichedListing] = useState<CachedListing | null>(null);
  const [enrichedExtras, setEnrichedExtras] = useState<{
    engineCondition?: string;
    hullCondition?: string;
    sailsCondition?: string;
    knownIssues?: string[];
    recentWork?: string[];
    equipmentHighlights?: string[];
    descriptionSummary?: string;
    aiDetails?: any;
  }>({});
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Similar boats state
  const [similarBoats, setSimilarBoats] = useState<SimilarBoat[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [comparablesUsed, setComparablesUsed] = useState<SimilarBoat[]>([]);
  const [selectedRefBoat, setSelectedRefBoat] = useState<SimilarBoat | null>(null);
  const [refBoatOpen, setRefBoatOpen] = useState(false);

  // Evaluate state
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [scriptLang, setScriptLang] = useState<NegotiationLanguage>("en");
  const [scriptTone, setScriptTone] = useState<NegotiationTone>("neutral");
  const [customOffer, setCustomOffer] = useState("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);

  // Costs state
  const [marinas, setMarinas] = useState<Marina[]>([]);
  const [selectedMarinaId, setSelectedMarinaId] = useState("");
  const [marinaSelectOpen, setMarinaSelectOpen] = useState(false);
  const [marinaSectionOpen, setMarinaSectionOpen] = useState(false);
  const [marinaMode, setMarinaMode] = useState<"selected" | "manual">("selected");
  const [manualMarinaCost, setManualMarinaCost] = useState("");
  const [loadingMarinas, setLoadingMarinas] = useState(false);
  const [costResult, setCostResult] = useState<{
    marina: number;
    maintenanceItems: MaintenanceItem[];
    maintenanceLow: number;
    maintenanceHigh: number;
    totalLow: number;
    totalHigh: number;
  } | null>(null);

  // The effective listing (enriched if available, else original)
  const effective = enrichedListing || listing;

  useEffect(() => {
    const ai = effective?.specs_raw?.ai_details;
    if (!ai) return;
    setEnrichedExtras((prev) => ({
      ...prev,
      aiDetails: ai,
      engineCondition: prev.engineCondition || ai?.condition?.engine,
      hullCondition: prev.hullCondition || ai?.condition?.hull,
      sailsCondition: prev.sailsCondition || ai?.condition?.sails,
      knownIssues: prev.knownIssues || ai?.known_issues,
      recentWork: prev.recentWork || ai?.recent_work,
      equipmentHighlights: prev.equipmentHighlights || ai?.equipment_highlights,
    }));
  }, [effective?.id, effective?.specs_raw]);

  // Reset state when listing changes
  useEffect(() => {
    setImgIndex(0);
    setActiveTab(initialTab);
    setEvalResult(null);
    setIsEvaluating(false);
    setEvalProgress(0);
    setEvalError(null);
    setScriptLang("en");
    setScriptTone("neutral");
    setCustomOffer("");
    setCopyStatus(null);
    setScriptOpen(false);
    setCostResult(null);
    setSelectedMarinaId("");
    setMarinaSelectOpen(false);
    setMarinaSectionOpen(false);
    setMarinaMode("selected");
    setManualMarinaCost("");
    setEnrichedListing(null);
    setEnrichedExtras({});
    setFetchError(null);
    setSimilarBoats([]);
    setComparablesUsed([]);
    setSelectedRefBoat(null);
    setRefBoatOpen(false);
    setDescriptionExpanded(false);
    descriptionAnchorRef.current = null;
  }, [listing?.id, initialTab]);

  useLayoutEffect(() => {
    if (!descriptionAnchorRef.current) return;
    const button = descriptionToggleButtonRef.current;
    const scrollContainer = button?.closest('[role="dialog"]') as HTMLElement | null;
    if (!button || !scrollContainer) {
      descriptionAnchorRef.current = null;
      return;
    }
    const { prevButtonTop, prevScrollTop } = descriptionAnchorRef.current;
    const nextButtonTop = button.getBoundingClientRect().top;
    const delta = nextButtonTop - prevButtonTop;
    const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    const targetScrollTop = Math.min(Math.max(prevScrollTop + delta, 0), maxScrollTop);
    scrollContainer.scrollTop = targetScrollTop;
    descriptionAnchorRef.current = null;
  }, [descriptionExpanded]);

  // Always reset modal scroll when opened so mobile starts at the top.
  useEffect(() => {
    if (!open) return;
    const resetScroll = () => {
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop = 0;
      }
    };
    resetScroll();
    requestAnimationFrame(resetScroll);
  }, [open, listing?.id]);

  // Fetch similar boats when modal opens for a listing
  useEffect(() => {
    if (!open || !listing) return;
    let cancelled = false;
    const run = async () => {
      setLoadingSimilar(true);
      try {
        const { data, error } = await supabase.functions.invoke("search-similar-boats", {
          body: {
            model: listing.title,
            length_feet: listing.length_feet,
            year: listing.year,
            boat_type: listing.boat_type || "sailboat",
          },
        });
        if (cancelled) return;
        if (!error && data?.success && Array.isArray(data.data)) {
          // Exclude the current listing itself
          const filtered = (data.data as SimilarBoat[]).filter((b) => b.url !== listing.url).slice(0, 6);
          setSimilarBoats(filtered);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingSimilar(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, listing?.id]);

  // Load market comparables independently from AI evaluation path so they are
  // visible in Boat details even when ai_details is already present.
  useEffect(() => {
    if (!open || !listing) return;
    if (!listing.year || !listing.length_feet) return;
    let cancelled = false;
    const run = async () => {
      try {
        const comparables = await Promise.race([
          fetchComparables(
            listing.boat_type || "sailboat",
            listing.year!,
            listing.length_feet!,
            listing.title || "",
          ).catch(() => []),
          new Promise<[]>(resolve => setTimeout(() => resolve([]), 1800)),
        ]);
        if (cancelled) return;
        setComparablesUsed(
          comparables
            .filter((c) => !!c.url && c.url !== listing.url)
            .slice(0, 8)
            .map((c) => ({
              title: c.title || "Comparable boat",
              url: c.url || "",
              price_eur: c.price_eur ?? null,
              year: c.year ?? null,
              length_feet: c.length_feet ?? null,
              location: c.location ?? null,
              image_url: c.image_url ?? null,
              engine_info: c.engine_info ?? null,
              description: c.description || null,
              boat_type: c.boat_type ?? null,
            })),
        );
      } catch {
        /* ignore */
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [open, listing?.id, listing?.year, listing?.length_feet, listing?.boat_type, listing?.title, listing?.url]);

  const needsFetch = (tab: "evaluate" | "costs") => {
    if (!effective) return false;
    if (tab === "evaluate") return !effective.price_eur || !effective.length_feet || !effective.year;
    if (tab === "costs") return !effective.length_feet;
    return false;
  };

  const fetchMissingData = async () => {
    if (!listing || isFetching) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-boat-listing", {
        body: { url: listing.url },
      });
      if (error || !data?.success) {
        setFetchError("Could not fetch listing details. Try again later.");
        return;
      }
      const d = data.data;
      const core = d?.core || {};
      const specs = d?.specs || {};
      const raw = d?.raw || {};
      setEnrichedListing({
        ...listing,
        price_eur: listing.price_eur ?? core.price_eur ?? null,
        year: listing.year ?? core.year ?? null,
        length_feet: listing.length_feet ?? (core.length_m ? Number(core.length_m) * 3.28084 : null),
        boat_type: listing.boat_type || specs.boat_type || "sailboat",
        segment: listing.segment ?? specs.segment ?? null,
        hull_material: listing.hull_material ?? specs.hull_material ?? null,
        engine_hours: listing.engine_hours ?? specs.engine_hours ?? null,
        engine_info: listing.engine_info ?? specs.engine_info ?? null,
        cabins: listing.cabins ?? specs.cabins ?? null,
        fuel_type: listing.fuel_type ?? specs.fuel_type ?? null,
        location: listing.location ?? core.location ?? null,
        description: listing.description ?? raw.description ?? null,
        image_url: listing.image_url ?? (Array.isArray(specs.image_urls) ? specs.image_urls[0] : null),
        image_urls: listing.image_urls?.length ? listing.image_urls : (Array.isArray(specs.image_urls) ? specs.image_urls : null),
        specs_raw: listing.specs_raw ?? { ai_details: specs.ai_details ?? null },
      });
      setEnrichedExtras({
        engineCondition: specs?.ai_details?.condition?.engine,
        hullCondition: specs?.ai_details?.condition?.hull,
        sailsCondition: specs?.ai_details?.condition?.sails,
        knownIssues: specs?.ai_details?.known_issues,
        recentWork: specs?.ai_details?.recent_work,
        equipmentHighlights: specs?.ai_details?.equipment_highlights,
        descriptionSummary: raw.description,
        aiDetails: specs?.ai_details,
      });
    } catch {
      setFetchError("Failed to fetch listing details.");
    } finally {
      setIsFetching(false);
    }
  };

  // Auto-fetch when needed
  useEffect(() => {
    if ((activeTab === "evaluate" || activeTab === "costs") && needsFetch(activeTab) && !isFetching && !enrichedListing && !fetchError) {
      fetchMissingData();
    }
  }, [activeTab]);

  // Auto-evaluate when evaluate tab is opened and data is available
  useEffect(() => {
    if (
      activeTab === "evaluate" &&
      effective &&
      effective.price_eur &&
      effective.length_feet &&
      effective.year &&
      !evalResult &&
      !isFetching &&
      !isEvaluating
    ) {
      runEvaluation();
    }
  }, [activeTab, effective, isFetching, isEvaluating, evalResult]);

  useEffect(() => {
    if (!isEvaluating) return;
    setEvalProgress(12);
    const timer = setInterval(() => {
      setEvalProgress((prev) => (prev >= 92 ? prev : prev + 8));
    }, 280);
    return () => clearInterval(timer);
  }, [isEvaluating]);

  // Load marinas when costs tab is activated
  useEffect(() => {
    if (activeTab === "costs" && marinas.length === 0) {
      setLoadingMarinas(true);
      supabase.from("marinas").select("id, name, country, region, price_per_meter_year").order("name")
        .then(({ data }) => {
          if (data) {
            setMarinas(data);
          }
          setLoadingMarinas(false);
        });
    }
  }, [activeTab]);

  const handleCalcCost = () => {
    if (!effective?.length_feet) return;
    const lengthM = effective.length_feet * 0.3048;
    const selectedMarina = marinas.find(m => m.id === selectedMarinaId);
    const manualCost = Number.parseFloat(manualMarinaCost);
    const marinaCost =
      marinaMode === "manual"
        ? Number.isFinite(manualCost) && manualCost >= 0
          ? manualCost
          : 0
        : selectedMarina
          ? lengthM * (selectedMarina.price_per_meter_year || 0)
          : 0;
    const items = getMaintenanceBreakdown(lengthM, effective.year, effective.boat_type || "sailboat", effective.hull_material, effective.engine_hours || null);
    const applicable = items.filter(i => i.applicable);

    let maintenanceLow = 0, maintenanceHigh = 0;
    for (const item of applicable) {
      const match = item.frequency.match(/(\d+)/);
      const years = item.frequency === "Yearly" ? 1 : (match ? parseInt(match[1]) : 3);
      maintenanceLow += item.costLow / years;
      maintenanceHigh += item.costHigh / years;
    }

    setCostResult({
      marina: Math.round(marinaCost),
      maintenanceItems: applicable,
      maintenanceLow: Math.round(maintenanceLow),
      maintenanceHigh: Math.round(maintenanceHigh),
      totalLow: Math.round(marinaCost + maintenanceLow),
      totalHigh: Math.round(marinaCost + maintenanceHigh),
    });
  };

  useEffect(() => {
    if (activeTab !== "costs") return;
    if (!effective?.length_feet || isFetching) return;
    handleCalcCost();
  }, [activeTab, effective?.length_feet, effective?.year, effective?.boat_type, effective?.hull_material, effective?.engine_hours, selectedMarinaId, marinaMode, manualMarinaCost, marinas.length, isFetching]);

  if (!listing) return null;

  const images: string[] = [];
  if (effective!.image_urls?.length) images.push(...effective!.image_urls);
  else if (effective!.image_url) images.push(effective!.image_url);

  const handlePrev = () => setImgIndex(i => (i > 0 ? i - 1 : images.length - 1));
  const handleNext = () => setImgIndex(i => (i < images.length - 1 ? i + 1 : 0));

  const runEvaluation = async () => {
    if (!effective!.price_eur || !effective!.length_feet || !effective!.year) return;
    setIsEvaluating(true);
    setEvalProgress(15);
    setEvalError(null);
    
    const ai = enrichedExtras.aiDetails || effective?.specs_raw?.ai_details;
    if (ai) {
      const normalizeConfidence = (raw: unknown): number => {
        const n = Number(raw ?? 50);
        if (!Number.isFinite(n)) return 50;
        // Older cached AI payloads sometimes use 0..1 confidence.
        if (n >= 0 && n <= 1) return Math.round(n * 100);
        return Math.max(0, Math.min(100, Math.round(n)));
      };
      const normalizeCategory = (rawScore: unknown, rawMax: unknown): { score: number; maxScore: number } => {
        const score = Number(rawScore ?? 0);
        const maxScore = Number(rawMax ?? 10);
        const safeScore = Number.isFinite(score) ? score : 0;
        const safeMax = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 10;
        // If max is 100 but score looks like 0..10 scale, expand score.
        if (safeMax >= 100 && safeScore >= 0 && safeScore <= 10) {
          return { score: Math.round(safeScore * 10), maxScore: safeMax };
        }
        return { score: safeScore, maxScore: safeMax };
      };
      const mapped: EvalResult = {
        score: Number(ai.score || 50),
        verdict: String(ai.verdict || "Fair Deal"),
        color:
          Number(ai.score || 50) >= 65 ? "text-success" : Number(ai.score || 50) >= 50 ? "text-warning" : "text-destructive",
        categories: Array.isArray(ai.categories)
          ? ai.categories.map((c: any) => ({
              ...(normalizeCategory(c.score, c.max_score)),
              name: String(c.name || "Category"),
              details: String(c.details || ""),
              icon: String(c.icon || "•"),
            }))
          : [],
        recommendations: Array.isArray(ai.recommendations) ? ai.recommendations : [],
        priceAssessment: String(ai.price_assessment || ""),
        estimatedRepairCost: Number(ai.estimated_repair_cost || 0),
        confidenceScore: normalizeConfidence(ai.confidence_score),
        confidenceDetails: "Generated by AI during listing sync",
        fairPriceLow: Number(ai.fair_price_low || 0),
        fairPriceHigh: Number(ai.fair_price_high || 0),
        targetOffer: Number(ai.target_offer || 0),
        scoreDrivers: [],
        dataQuality: [],
        offerRange: {
          aggressive: Number(ai.offer_range?.aggressive || 0),
          realistic: Number(ai.offer_range?.realistic || 0),
          safe: Number(ai.offer_range?.safe || 0),
        },
        walkAwayPrice: Number(ai.walk_away_price || 0),
        negotiationAnchors: Array.isArray(ai.negotiation_anchors) ? ai.negotiation_anchors : [],
        repairEstimateBreakdown: Array.isArray(ai.repair_breakdown)
          ? ai.repair_breakdown.map((r: any) => ({
              label: String(r.label || "Repair item"),
              estimate: Number(r.estimate || 0),
              note: r.note ? String(r.note) : undefined,
            }))
          : [],
      };
      setEvalResult(mapped);
      setEvalProgress(100);
      setIsEvaluating(false);
      return;
    }

    // Fallback (for listings that predate AI sync output)
    const engine = inferEngineCondition(effective!.engine_hours, effective!.year, effective!.engine_info);
    const hull = inferHullCondition(effective!.hull_material, effective!.year, effective!.description);
    const sails = effective!.boat_type === "powerboat" ? "none" : inferSailsCondition(effective!.year, effective!.description);
    try {
      const comparables = await Promise.race([
        fetchComparables(
          effective!.boat_type || "sailboat",
          effective!.year,
          effective!.length_feet,
          effective!.title || "",
        ).catch(() => []),
        new Promise<[]>(resolve => setTimeout(() => resolve([]), 1800)),
      ]);
      setComparablesUsed(
        comparables
          .filter((c) => !!c.url)
          .slice(0, 8)
          .map((c) => ({
            title: c.title || "Comparable boat",
            url: c.url || "",
            price_eur: c.price_eur ?? null,
            year: c.year ?? null,
            length_feet: c.length_feet ?? null,
            location: c.location ?? null,
            image_url: c.image_url ?? null,
            engine_info: c.engine_info ?? null,
            description: c.description || null,
            boat_type: c.boat_type ?? null,
          })),
      );

      const result = evaluate({
        boatType: (effective!.boat_type || "sailboat") as BoatType,
        segment: effective?.segment || effective?.specs_raw?.ai_details?.segment || null,
        year: effective!.year,
        price: effective!.price_eur,
        lengthFt: effective!.length_feet,
        engine,
        hull,
        sails,
        engineHours: effective!.engine_hours || undefined,
        hullMaterial: effective!.hull_material || undefined,
        knownIssues: enrichedExtras.knownIssues,
        recentWork: enrichedExtras.recentWork,
        comparables,
      });
      setEvalResult(result);
      setEvalProgress(100);
    } catch (e) {
      console.error("Modal evaluation error:", e);
      setEvalError("Evaluation failed. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const filteredMarinas = marinas;
  const selectedMarina = marinas.find((m) => m.id === selectedMarinaId) || null;
  const scoreBarColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.75) return "bg-success";
    if (pct >= 0.45) return "bg-warning";
    return "bg-destructive";
  };

  const costCategories = costResult ? [...new Set(costResult.maintenanceItems.map(i => i.category))] : [];
  const mergedReferenceBoats: Array<SimilarBoat & { sourceTag: "Comparable" | "Similar" }> = [
    ...comparablesUsed.map((b) => ({ ...b, sourceTag: "Comparable" as const })),
    ...similarBoats.map((b) => ({ ...b, sourceTag: "Similar" as const })),
  ];
  const listingPrice = Number(effective?.price_eur || 0);
  const offerForScript = customOffer ? Number(customOffer) : evalResult?.offerRange.realistic || 0;
  const script = evalResult
    ? generateNegotiationScript({
        lang: scriptLang,
        tone: scriptTone,
        boatTitle: effective?.title || "boat",
        listingPrice,
        fairLow: evalResult.fairPriceLow,
        fairHigh: evalResult.fairPriceHigh,
        offer: offerForScript,
        walkAwayPrice: evalResult.walkAwayPrice,
        anchors: evalResult.negotiationAnchors,
      })
    : null;
  const descriptionText = effective?.description || "";
  const isDescriptionLong = descriptionText.length > DESCRIPTION_PREVIEW_LENGTH;
  const descriptionPreview = isDescriptionLong
    ? `${descriptionText.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
    : descriptionText;
  const aiRecentWork = Array.isArray(enrichedExtras.aiDetails?.recent_work)
    ? enrichedExtras.aiDetails.recent_work
    : Array.isArray(effective?.specs_raw?.ai_details?.recent_work)
      ? effective.specs_raw.ai_details.recent_work
      : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setImgIndex(0); }}>
      <DialogContent ref={modalScrollRef} className="max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] sm:max-h-none sm:top-[1rem] sm:bottom-[1rem] sm:translate-y-0 overflow-y-auto p-0 [&>button]:top-3 [&>button]:right-3 [&>button]:inline-flex [&>button]:items-center [&>button]:justify-center [&>button]:h-9 [&>button]:w-9 [&>button]:rounded-full [&>button]:border [&>button]:border-border/70 [&>button]:bg-background/95 [&>button]:text-foreground [&>button]:opacity-100 [&>button]:shadow-md [&>button]:backdrop-blur-sm [&>button]:transition-colors [&>button]:hover:bg-background sm:[&>button]:h-8 sm:[&>button]:w-8">
        {/* Image gallery */}
        {images.length > 0 ? (
          <div className="relative w-full aspect-video bg-muted">
            <img src={images[imgIndex]} alt={listing.title} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            {images.length > 1 && (
              <>
                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 hover:bg-background"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 hover:bg-background"><ChevronRight className="w-5 h-5" /></button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 text-xs px-2 py-0.5 rounded-full">{imgIndex + 1} / {images.length}</div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center"><Ship className="w-16 h-16 text-muted-foreground/30" /></div>
        )}

        <div className="p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="text-xl">{effective!.title}</DialogTitle>
              {onToggleSave && listing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`shrink-0 gap-1.5 ${isSaved ? 'text-coral' : ''}`}
                  onClick={() => onToggleSave(listing)}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-coral' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              )}
            </div>
          </DialogHeader>

          {effective!.price_eur && <p className="text-2xl font-bold text-primary">€{Number(effective!.price_eur).toLocaleString()}</p>}

          {/* Specs */}
          <div className="flex flex-wrap gap-3">
            {effective!.year && <span className="text-sm bg-muted px-3 py-1 rounded-full">Year: {effective!.year}</span>}
            {effective!.length_feet && <span className="text-sm bg-muted px-3 py-1 rounded-full">{Number(effective!.length_feet)} ft</span>}
            {effective!.boat_type && <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{effective!.boat_type}</span>}
            {effective!.segment && <span className="text-sm bg-muted px-3 py-1 rounded-full">{formatSegmentLabel(effective!.segment)}</span>}
            {effective!.hull_material && <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{effective!.hull_material}</span>}
            {effective!.cabins && <span className="text-sm bg-muted px-3 py-1 rounded-full">{effective!.cabins} cabins</span>}
            {effective!.fuel_type && <span className="text-sm bg-muted px-3 py-1 rounded-full capitalize">{effective!.fuel_type}</span>}
            {effective!.engine_hours && <span className="text-sm bg-muted px-3 py-1 rounded-full">{effective!.engine_hours}h engine</span>}
          </div>

          {effective!.location && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {effective!.location}</p>}
          {effective!.engine_info && <p className="text-sm text-muted-foreground">⚙️ {effective!.engine_info}</p>}
          {effective!.description && (
            <div>
              <h3 className="text-sm font-semibold mb-1">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {descriptionExpanded ? descriptionText : descriptionPreview}
              </p>
              {isDescriptionLong && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs text-primary"
                  ref={descriptionToggleButtonRef}
                  onClick={(e) => {
                    const scrollContainer = e.currentTarget.closest('[role="dialog"]') as HTMLElement | null;
                    descriptionAnchorRef.current = {
                      prevButtonTop: e.currentTarget.getBoundingClientRect().top,
                      prevScrollTop: scrollContainer?.scrollTop ?? 0,
                    };
                    setDescriptionExpanded((prev) => !prev);
                  }}
                >
                  {descriptionExpanded ? "Show less" : "Read more"}
                </Button>
              )}
            </div>
          )}

          {/* Equipment — merged from scraped listing + AI enrichment */}
          {(() => {
            const merged = new Set<string>();
            (effective!.equipment || []).forEach((e) => e && merged.add(e));
            (enrichedExtras.equipmentHighlights || []).forEach((e) => e && merged.add(e));
            const items = Array.from(merged);
            if (items.length === 0) return null;
            return (
              <div>
                <h3 className="text-sm font-semibold mb-1">Equipment</h3>
                <div className="flex flex-wrap gap-1">
                  {items.map((eq, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{eq}</span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Known issues from enrichment */}
          {enrichedExtras.knownIssues && enrichedExtras.knownIssues.length > 0 && (
            <Card className="p-3 border-destructive/30 bg-destructive/5">
              <p className="text-xs font-semibold text-destructive mb-1">⚠️ Known Issues</p>
              {enrichedExtras.knownIssues.map((issue, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {issue}</p>
              ))}
            </Card>
          )}

          {/* Recent work from AI analysis */}
          {aiRecentWork.length > 0 && (
            <Card className="p-3 border-primary/30 bg-primary/5">
              <p className="text-xs font-semibold text-primary mb-1">✅ Recent Work</p>
              {aiRecentWork.map((work, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {work}</p>
              ))}
            </Card>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground/70 border-t pt-3">
            <span>{effective!.source}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(effective!.scraped_at)}</span>
          </div>

          {/* Tab buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              variant={activeTab === "evaluate" ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => { setActiveTab(activeTab === "evaluate" ? "details" : "evaluate"); }}
            >
              <TrendingDown className="w-4 h-4" /> Evaluate
            </Button>
            <Button
              variant={activeTab === "costs" ? "default" : "secondary"}
              className="gap-1.5"
              onClick={() => { setActiveTab(activeTab === "costs" ? "details" : "costs"); }}
            >
              <Calculator className="w-4 h-4" /> Costs
            </Button>
            <Button variant="outline" className="gap-1.5" asChild>
              <a href={effective!.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> View
              </a>
            </Button>
          </div>

          {/* ===== EVALUATE SECTION ===== */}
          {activeTab === "evaluate" && (
            <div className="space-y-4 animate-fade-in border-t pt-4">
              <h3 className="font-semibold text-primary flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Evaluation</h3>
              {isFetching ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Fetching listing details…</div>
              ) : fetchError && (!effective!.price_eur || !effective!.length_feet || !effective!.year) ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{fetchError}</p>
                  <Button variant="outline" size="sm" onClick={fetchMissingData}>Retry</Button>
                </div>
              ) : (!effective!.price_eur || !effective!.length_feet || !effective!.year) ? (
                <p className="text-sm text-muted-foreground">Missing price, length, or year — cannot evaluate this listing.</p>
              ) : isEvaluating ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Evaluating: pricing model, condition risk, and negotiation target…
                  </div>
                  <Progress value={evalProgress} className="h-2" />
                </div>
              ) : evalError ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{evalError}</p>
                  <Button variant="outline" size="sm" onClick={runEvaluation}>Retry evaluation</Button>
                </div>
              ) : !evalResult ? (
                <Button variant="outline" size="sm" onClick={runEvaluation}>Run evaluation</Button>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  {/* Score card */}
                  <Card className="p-6 text-center premium-surface">
                    <p className={`text-5xl font-bold ${evalResult.color}`}>{evalResult.score}</p>
                    <p className={`text-lg font-semibold mt-1 ${evalResult.color}`}>{evalResult.verdict}</p>
                    <p className="text-sm text-muted-foreground mt-2">{evalResult.priceAssessment}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Confidence: <span className="font-medium">{evalResult.confidenceScore}/100</span>
                    </p>
                  </Card>

                  <Card className="p-4 premium-surface">
                    <h4 className="font-semibold text-primary mb-2 text-sm">Negotiation</h4>
                    <p className="text-xs text-muted-foreground">
                      Fair range: <span className="text-foreground font-medium">€{evalResult.fairPriceLow.toLocaleString()} - €{evalResult.fairPriceHigh.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target offer: <span className="text-primary font-medium">€{evalResult.targetOffer.toLocaleString()}</span>
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border p-2 bg-background">
                        <p className="text-muted-foreground">Aggressive</p>
                        <p className="font-semibold">€{evalResult.offerRange.aggressive.toLocaleString()}</p>
                      </div>
                      <div className="rounded-md border p-2 bg-background">
                        <p className="text-muted-foreground">Realistic</p>
                        <p className="font-semibold">€{evalResult.offerRange.realistic.toLocaleString()}</p>
                      </div>
                      <div className="rounded-md border p-2 bg-background col-span-2">
                        <p className="text-muted-foreground">Safe offer / walk-away cap</p>
                        <p className="font-semibold">€{evalResult.offerRange.safe.toLocaleString()} / €{evalResult.walkAwayPrice.toLocaleString()}</p>
                      </div>
                    </div>
                    {evalResult.negotiationAnchors.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {evalResult.negotiationAnchors.map((a, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground">• {a}</li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-semibold text-primary mb-2 text-sm">Negotiation Script Generator</h4>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">Generate an English negotiation message from your current offer.</p>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setScriptOpen((v) => !v)}>
                        {scriptOpen ? "Hide" : "Show"}
                      </Button>
                    </div>
                    {scriptOpen && (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Language</Label>
                            <Select value={scriptLang} onValueChange={(v) => setScriptLang(v as NegotiationLanguage)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="sl">Slovenian</SelectItem>
                                <SelectItem value="it">Italian</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                        <Label className="text-xs">Tone</Label>
                        <Select value={scriptTone} onValueChange={(v) => setScriptTone(v as NegotiationTone)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="neutral">Neutral</SelectItem>
                            <SelectItem value="firm">Firm</SelectItem>
                          </SelectContent>
                        </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Offer amount override (optional)</Label>
                          <input
                            type="number"
                            value={customOffer}
                            onChange={(e) => setCustomOffer(e.target.value)}
                            className="mt-1 w-full h-8 rounded-md border bg-background px-2 text-xs"
                            placeholder={String(evalResult.offerRange.realistic)}
                          />
                        </div>
                        {script && (
                          <div className="space-y-2">
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-xs text-muted-foreground">Subject</p>
                              <p className="text-xs">{script.subject}</p>
                            </div>
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-xs text-muted-foreground mb-1">Email</p>
                              <pre className="text-xs whitespace-pre-wrap font-sans">{script.emailBody}</pre>
                            </div>
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
                              <pre className="text-xs whitespace-pre-wrap font-sans">{script.whatsappText}</pre>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(`${script.subject}\n\n${script.emailBody}`);
                                  setCopyStatus("Email copied.");
                                }}
                              >
                                <Copy className="w-3.5 h-3.5 mr-1" /> Copy Email
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(script.whatsappText);
                                  setCopyStatus("WhatsApp text copied.");
                                }}
                              >
                                <Copy className="w-3.5 h-3.5 mr-1" /> Copy WhatsApp
                              </Button>
                            </div>
                            {copyStatus && <p className="text-[11px] text-muted-foreground">{copyStatus}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Score breakdown */}
                  <Card className="p-4 premium-surface">
                    <h4 className="font-semibold text-primary mb-3 text-sm">Score Breakdown</h4>
                    <div className="space-y-3">
                      {evalResult.categories.map((cat) => (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{cat.icon} {cat.name}</span>
                            <span className="text-muted-foreground">{cat.score}/{cat.maxScore}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${scoreBarColor(cat.score, cat.maxScore)}`}
                              style={{ width: `${(cat.score / cat.maxScore) * 100}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cat.details}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Estimated repair costs */}
                  {evalResult.estimatedRepairCost > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold text-primary mb-2 text-sm flex items-center gap-2">
                        <Wrench className="w-4 h-4" /> Estimated Repair Costs
                      </h4>
                      <p className="text-2xl font-bold text-destructive">€{evalResult.estimatedRepairCost.toLocaleString()}</p>
                      {effective!.price_eur && (
                        <p className="text-xs text-muted-foreground mt-1">
                          True cost: €{(Number(effective!.price_eur) + evalResult.estimatedRepairCost).toLocaleString()} (price + repairs)
                        </p>
                      )}
                      {evalResult.repairEstimateBreakdown.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {evalResult.repairEstimateBreakdown.map((item, idx) => (
                            <div key={`${item.label}-${idx}`} className="rounded-md border bg-background p-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium">{item.label}</p>
                                <p className="text-xs font-semibold">€{item.estimate.toLocaleString()}</p>
                              </div>
                              {item.note && <p className="text-[11px] text-muted-foreground mt-0.5">{item.note}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Recommendations */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-primary mb-2 text-sm">💡 Recommendations</h4>
                    <ul className="space-y-1.5">
                      {evalResult.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-accent mt-0.5 shrink-0">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ===== COSTS SECTION ===== */}
          {activeTab === "costs" && (
            <div className="space-y-4 animate-fade-in border-t pt-4">
              <h3 className="font-semibold text-primary flex items-center gap-2"><Calculator className="w-4 h-4" /> Annual Ownership Cost</h3>
              {isFetching ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Fetching listing details…</div>
              ) : fetchError && !effective!.length_feet ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{fetchError}</p>
                  <Button variant="outline" size="sm" onClick={fetchMissingData}>Retry</Button>
                </div>
              ) : !effective!.length_feet ? (
                <p className="text-sm text-muted-foreground">Missing boat length — cannot calculate costs.</p>
              ) : (
                <>
                  {(() => {
                    const items = getMaintenanceBreakdown(
                      effective!.length_feet! * 0.3048,
                      effective!.year,
                      effective!.boat_type || "sailboat",
                      effective!.hull_material,
                      effective!.engine_hours || null,
                    ).filter((i) => i.applicable);
                    let low = 0;
                    let high = 0;
                    for (const item of items) {
                      const match = item.frequency.match(/(\d+)/);
                      const years = item.frequency === "Yearly" ? 1 : (match ? parseInt(match[1]) : 3);
                      low += item.costLow / years;
                      high += item.costHigh / years;
                    }
                    const byCategory = [...new Set(items.map((i) => i.category))].map((cat) => {
                      const catItems = items.filter((i) => i.category === cat);
                      let catLow = 0;
                      let catHigh = 0;
                      for (const item of catItems) {
                        const match = item.frequency.match(/(\d+)/);
                        const years = item.frequency === "Yearly" ? 1 : (match ? parseInt(match[1]) : 3);
                        catLow += item.costLow / years;
                        catHigh += item.costHigh / years;
                      }
                      return { cat, low: Math.round(catLow), high: Math.round(catHigh) };
                    });
                    return (
                      <Card className="p-3">
                        <p className="text-xs font-semibold text-primary">Base annual cost breakdown (without marina)</p>
                        <p className="text-sm font-semibold mt-1">
                          €{Math.round(low).toLocaleString()} - €{Math.round(high).toLocaleString()} / yr
                        </p>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {byCategory.slice(0, 6).map((row) => (
                            <p key={row.cat} className="text-[11px] text-muted-foreground">
                              {row.cat}: €{row.low.toLocaleString()}-€{row.high.toLocaleString()}
                            </p>
                          ))}
                        </div>
                      </Card>
                    );
                  })()}

                  {loadingMarinas ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading marinas…</div>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-between text-xs"
                        onClick={() => setMarinaSectionOpen((v) => !v)}
                      >
                        {marinaSectionOpen ? "Hide marina options" : "Add marina cost (optional)"}
                        <ChevronsUpDown className="w-3.5 h-3.5" />
                      </Button>
                      {marinaSectionOpen && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant={marinaMode === "selected" ? "default" : "outline"}
                              size="sm"
                              className="text-xs"
                              onClick={() => setMarinaMode("selected")}
                            >
                              Use marina rate
                            </Button>
                            <Button
                              type="button"
                              variant={marinaMode === "manual" ? "default" : "outline"}
                              size="sm"
                              className="text-xs"
                              onClick={() => setMarinaMode("manual")}
                            >
                              Use manual cost
                            </Button>
                          </div>
                          <div className={marinaMode === "selected" ? "" : "opacity-60"}>
                            <Label className="text-xs">Marina (searchable)</Label>
                            <Popover open={marinaSelectOpen} onOpenChange={setMarinaSelectOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-8 text-xs mt-1"
                                  disabled={marinaMode !== "selected"}
                                >
                                  {selectedMarina
                                    ? `${selectedMarina.name}${selectedMarina.region ? ` (${selectedMarina.region})` : ""}`
                                    : "Optional: select a marina"}
                                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[360px] p-0">
                                <Command>
                                  <CommandInput placeholder="Search marina..." />
                                  <CommandList>
                                    <CommandEmpty>No marina found.</CommandEmpty>
                                    <CommandGroup>
                                      {filteredMarinas.map((m) => (
                                        <CommandItem
                                          key={m.id}
                                          value={`${m.name} ${m.region || ""} ${m.country}`}
                                          onSelect={() => {
                                            setSelectedMarinaId(m.id);
                                            setMarinaSelectOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${selectedMarinaId === m.id ? "opacity-100" : "opacity-0"}`}
                                          />
                                          {m.name} {m.region ? `(${m.region})` : ""} — €{m.price_per_meter_year}/m/yr
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className={marinaMode === "manual" ? "" : "opacity-60"}>
                            <Label className="text-xs">Or enter manual annual marina cost (€)</Label>
                            <input
                              type="number"
                              min={0}
                              value={manualMarinaCost}
                              onChange={(e) => setManualMarinaCost(e.target.value)}
                              className="mt-1 w-full h-8 rounded-md border bg-background px-2 text-xs"
                              placeholder="Optional, e.g. 7200"
                              disabled={marinaMode !== "manual"}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {costResult && (
                <div className="space-y-4 animate-fade-in">
                  {/* Summary */}
                  <Card className="p-4">
                    <div className="space-y-2">
                      {costResult.marina > 0 && (
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Marina berth</span><span className="font-medium">€{costResult.marina.toLocaleString()}</span></div>
                      )}
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Maintenance (low)</span><span className="font-medium">€{costResult.maintenanceLow.toLocaleString()}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Maintenance (high)</span><span className="font-medium">€{costResult.maintenanceHigh.toLocaleString()}</span></div>
                      <div className="border-t pt-2 mt-1">
                        <div className="flex justify-between font-bold"><span>Total (low)</span><span className="text-primary">€{costResult.totalLow.toLocaleString()}/yr</span></div>
                        <div className="flex justify-between font-bold mt-0.5"><span>Total (high)</span><span className="text-destructive">€{costResult.totalHigh.toLocaleString()}/yr</span></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Monthly: €{Math.round(costResult.totalLow / 12).toLocaleString()} – €{Math.round(costResult.totalHigh / 12).toLocaleString()}</p>
                    </div>
                  </Card>

                  {/* Category breakdown */}
                  <Card className="p-4">
                    <h4 className="text-sm font-semibold text-primary mb-3">Cost Breakdown by Category</h4>
                    <div className="space-y-2">
                      {costCategories.map(cat => {
                        const catItems = costResult.maintenanceItems.filter(i => i.category === cat);
                        const catAvg = catItems.reduce((s, i) => s + (i.costLow + i.costHigh) / 2, 0);
                        const totalAvg = (costResult.totalLow + costResult.totalHigh) / 2 || 1;
                        const pct = (catAvg / totalAvg) * 100;
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-medium">{cat}</span>
                              <span className="text-muted-foreground">€{Math.round(catAvg).toLocaleString()} ({Math.round(pct)}%)</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        );
                      })}
                      {costResult.marina > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium">Marina Berth</span>
                            <span className="text-muted-foreground">€{costResult.marina.toLocaleString()}</span>
                          </div>
                          <Progress value={(costResult.marina / ((costResult.totalLow + costResult.totalHigh) / 2 || 1)) * 100} className="h-1.5" />
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Detailed items */}
                  <Card className="p-4">
                    <h4 className="text-sm font-semibold text-primary mb-3">Detailed Maintenance Items</h4>
                    <div className="space-y-3">
                      {costCategories.map(cat => (
                        <div key={cat}>
                          <h5 className="font-medium text-xs text-primary mb-1 flex items-center gap-1"><Wrench className="w-3 h-3" /> {cat}</h5>
                          <div className="space-y-0.5">
                            {costResult.maintenanceItems.filter(i => i.category === cat).map((item, idx) => (
                              <div key={idx} className="py-1 border-b border-border/30 last:border-0">
                                <div className="flex justify-between text-xs">
                                  <div>
                                    <span className="text-foreground">{item.item}</span>
                                    <span className="text-muted-foreground ml-1.5">({item.frequency})</span>
                                  </div>
                                  <span className="text-muted-foreground whitespace-nowrap">€{item.costLow.toLocaleString()} – €{item.costHigh.toLocaleString()}</span>
                                </div>
                                {item.rationale && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.rationale}</p>
                                )}
                                {item.optionsHint && (
                                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">Options: {item.optionsHint}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ===== COMPARABLES + SIMILAR ===== */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Ship className="w-4 h-4" /> Comparables + Similar Boats
            </h3>
            {loadingSimilar ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Finding similar boats…
              </div>
            ) : mergedReferenceBoats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comparable or similar boats found in the catalog yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {mergedReferenceBoats.map((b) => (
                  <button
                    key={`${b.sourceTag}-${b.url}`}
                    type="button"
                    onClick={() => {
                      setSelectedRefBoat(b);
                      setRefBoatOpen(true);
                    }}
                    className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="aspect-video bg-muted overflow-hidden">
                      {b.image_url ? (
                        <img
                          src={b.image_url}
                          alt={b.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Ship className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 space-y-0.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{b.sourceTag}</span>
                      </div>
                      <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{b.title}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>
                          {b.year || "—"}
                          {b.length_feet ? ` · ${Number(b.length_feet)}ft` : ""}
                          {b.boat_type ? ` · ${b.boat_type}` : ""}
                        </span>
                        {b.price_eur && (
                          <span className="font-semibold text-primary">€{Number(b.price_eur).toLocaleString()}</span>
                        )}
                      </div>
                      {b.location && (
                        <p className="text-[10px] text-muted-foreground/70 line-clamp-1 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {b.location}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      <Dialog open={refBoatOpen} onOpenChange={setRefBoatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRefBoat?.title || "Boat card"}</DialogTitle>
          </DialogHeader>
          {selectedRefBoat && (
            <div className="space-y-3">
              {selectedRefBoat.image_url && (
                <img
                  src={selectedRefBoat.image_url}
                  alt={selectedRefBoat.title}
                  className="w-full h-52 object-cover rounded-md"
                />
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                {selectedRefBoat.price_eur && <span className="font-semibold text-primary">€{selectedRefBoat.price_eur.toLocaleString()}</span>}
                {selectedRefBoat.year && <span className="text-muted-foreground">{selectedRefBoat.year}</span>}
                {selectedRefBoat.length_feet && <span className="text-muted-foreground">{selectedRefBoat.length_feet}ft</span>}
                {selectedRefBoat.boat_type && <span className="text-muted-foreground capitalize">{selectedRefBoat.boat_type}</span>}
                {selectedRefBoat.location && <span className="text-muted-foreground">{selectedRefBoat.location}</span>}
              </div>
              {selectedRefBoat.engine_info && (
                <p className="text-sm text-muted-foreground">⚙️ {selectedRefBoat.engine_info}</p>
              )}
              {selectedRefBoat.description && (
                <p className="text-sm text-muted-foreground line-clamp-4">{selectedRefBoat.description}</p>
              )}
              <div className="flex gap-2 pt-1">
                {onNavigateToListing && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setRefBoatOpen(false);
                      onNavigateToListing(selectedRefBoat.url, "evaluate");
                    }}
                  >
                    Evaluate
                  </Button>
                )}
                <a href={selectedRefBoat.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1">
                    <ExternalLink className="w-3 h-3" /> Open listing
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
