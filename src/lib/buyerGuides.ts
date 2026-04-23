import { BookOpen, Compass, DollarSign, FileCheck, Shield, Wrench } from "lucide-react";

export interface BuyerGuideArticle {
  id: string;
  category: "Buying" | "Costs" | "Compliance" | "Ownership" | "Negotiation";
  icon: any;
  color: string;
  tagColor: string;
  title: string;
  summary: string;
  body: string;
}

export const BUYER_GUIDES: BuyerGuideArticle[] = [
  {
    id: "true-cost-ownership",
    category: "Costs",
    icon: DollarSign,
    color: "bg-coral/15 text-coral",
    tagColor: "bg-coral/10 text-coral",
    title: "True Cost of Boat Ownership",
    summary: "A practical first-year budget model: berth, insurance, maintenance, haul-out, and hidden costs.",
    body:
      "The purchase price is only the beginning. In real ownership, yearly costs are what make or break your decision.\n\n" +
      "**Maintenance benchmark**: A common planning rule is **5-10% of boat value per year** for maintenance and repairs (often more for older boats).\n\n" +
      "**Insurance benchmark**: In many markets, full cover can be around **1-2.5% of insured hull value per year**, depending on vessel type, cruising area, claims history, and storage.\n\n" +
      "**Marina / berth**: This is usually the largest fixed expense after purchase. Price varies heavily by location, season, and boat length.\n\n" +
      "**Haul-out & winter cycle**: Lift, hard-stand, launch, antifouling, and seasonal service should be treated as predictable annual costs.\n\n" +
      "**Actionable setup**: Build a 12-month ownership model before buying, with conservative, base, and optimistic scenarios.",
  },
  {
    id: "marine-survey-playbook",
    category: "Buying",
    icon: Shield,
    color: "bg-primary/15 text-primary",
    tagColor: "bg-primary/10 text-primary",
    title: "Marine Survey Playbook",
    summary: "What a pre-purchase survey includes, typical cost ranges, and how to use findings in negotiation.",
    body:
      "A survey is one of the highest-ROI steps in a used-boat purchase.\n\n" +
      "**Typical survey ranges**: Published market references commonly show around **$20-$45 per foot** for pre-purchase surveys (plus haul-out and specialist engine/rig checks where needed).\n\n" +
      "**What survey gives you**: condition snapshot, defects by severity, and valuation context. It is evidence for risk and price decisions, not a guarantee of future performance.\n\n" +
      "**Who requires it**: insurers and lenders often request survey documentation for used boats.\n\n" +
      "**How to use it**: convert serious findings to line-item repair budgets and negotiate from documented facts, not assumptions.",
  },
  {
    id: "sea-trial-checklist",
    category: "Buying",
    icon: Compass,
    color: "bg-primary/15 text-primary",
    tagColor: "bg-primary/10 text-primary",
    title: "Sea Trial Checklist That Catches Problems",
    summary: "A structured sea-trial flow to validate handling, systems load, vibration, and real cruising behavior.",
    body:
      "A dock inspection cannot replace a proper sea trial.\n\n" +
      "**Run profile**: idle, harbor maneuvering, cruise rpm, and near-WOT where safe.\n\n" +
      "**Observe**: cold start behavior, smoke, vibration, steering response, trim, and temperature stability.\n\n" +
      "**Systems under load**: electronics, pumps, charging, and navigation stack should all be tested underway.\n\n" +
      "**Decision tip**: write issues as pass/fail items immediately after trial to avoid memory bias.",
  },
  {
    id: "paperwork-liens-ownership",
    category: "Buying",
    icon: FileCheck,
    color: "bg-primary/15 text-primary",
    tagColor: "bg-primary/10 text-primary",
    title: "Paperwork, Liens, and Ownership Chain",
    summary: "How to verify legal ownership, outstanding debts, and transfer-ready documentation before payment.",
    body:
      "Documentation errors can be more expensive than mechanical repairs.\n\n" +
      "**Verify ownership chain**: registration records, bills of sale, and matching hull identifiers.\n\n" +
      "**Check encumbrances**: ask for lien release evidence where relevant.\n\n" +
      "**Match seller identity**: ensure the selling party is legally authorized to transfer title.\n\n" +
      "**Close safely**: use escrow-style steps and staged payment conditions tied to documents and survey outcomes.",
  },
  {
    id: "adriatic-compliance-2025",
    category: "Compliance",
    icon: FileCheck,
    color: "bg-accent/15 text-accent",
    tagColor: "bg-accent/10 text-accent",
    title: "Adriatic Compliance (Croatia 2025)",
    summary: "Quick compliance checklist: navigation fee, tourist tax, and must-carry documents for private boats.",
    body:
      "If you cruise Croatia, treat compliance as part of acquisition risk.\n\n" +
      "**Navigation fee / permit**: boats over threshold size/power generally need registration of stay/navigation and payment of safety/pollution-related charges.\n\n" +
      "**Tourist tax**: for boats over 7m staying overnight, tourist tax rules apply (flat by vessel-length period or per-person/per-night model depending on circumstances).\n\n" +
      "**Carry documents**: ownership authorization, insurance, technical seaworthiness docs, and payment confirmations.\n\n" +
      "**Operational advice**: create a reusable compliance folder (PDFs + screenshots) before every season.",
  },
  {
    id: "croatia-fees-explained",
    category: "Compliance",
    icon: FileCheck,
    color: "bg-accent/15 text-accent",
    tagColor: "bg-accent/10 text-accent",
    title: "Croatia Fees Explained: Permit vs Tourist Tax",
    summary: "Avoid confusion between navigation/safety fees and tourist tax obligations for overnight stays.",
    body:
      "Two fee streams are often mixed up by first-time buyers.\n\n" +
      "**Navigation/safety fee**: tied to vessel operation and maritime administration requirements.\n\n" +
      "**Tourist tax**: tied to overnight stay rules, with options based on vessel-length period or person/night.\n\n" +
      "**Practical rule**: keep payment confirmations onboard and in cloud backup.\n\n" +
      "**Budgeting**: include both categories in annual ownership estimates for Adriatic cruising.",
  },
  {
    id: "cross-border-doc-pack",
    category: "Compliance",
    icon: Compass,
    color: "bg-accent/15 text-accent",
    tagColor: "bg-accent/10 text-accent",
    title: "Cross-Border Document Pack for Cruisers",
    summary: "Build a ready-to-show file for inspections: IDs, insurance, authorization, and vessel paperwork.",
    body:
      "Inspection delays are usually a paperwork problem, not a navigation problem.\n\n" +
      "**Core pack**: IDs/passports, ownership authorization, insurance, registration, technical certificates.\n\n" +
      "**Crew list discipline**: keep one current version and update promptly.\n\n" +
      "**Digital backup**: phone + cloud + offline PDF copies.\n\n" +
      "**Workflow**: assign one onboard person responsible for document readiness in every port move.",
  },
  {
    id: "insured-cruising-zones",
    category: "Compliance",
    icon: Shield,
    color: "bg-accent/15 text-accent",
    tagColor: "bg-accent/10 text-accent",
    title: "Insurance Zones and Cruising Limits",
    summary: "Confirm where your policy is valid before changing cruising area or crossing borders.",
    body:
      "Coverage assumptions are dangerous.\n\n" +
      "**Check policy geography**: confirm approved cruising zone and seasonal limits.\n\n" +
      "**Notify insurer**: route changes may require endorsement updates.\n\n" +
      "**Storm exclusions**: verify named-storm, haul-out, and lay-up clauses.\n\n" +
      "**Result**: legal compliance and claim certainty when incidents happen.",
  },
  {
    id: "used-boat-depreciation",
    category: "Buying",
    icon: Compass,
    color: "bg-ocean/15 text-ocean",
    tagColor: "bg-ocean/10 text-ocean",
    title: "Used Boat Depreciation Reality",
    summary: "How depreciation behavior changes from new to used boats and why this matters when timing a purchase.",
    body:
      "Timing matters. New boats usually depreciate fastest early, while used boats often stabilize into slower decline.\n\n" +
      "**Practical implication**: many buyers get better value by buying a well-maintained used vessel with clear documentation.\n\n" +
      "**Risk filter**: lower price alone is not value; deferred maintenance can erase any discount.\n\n" +
      "**Decision rule**: combine price trend, condition evidence, and expected yearly costs before committing.",
  },
  {
    id: "berth-and-marina-strategy",
    category: "Ownership",
    icon: Compass,
    color: "bg-warning/15 text-warning",
    tagColor: "bg-warning/10 text-warning",
    title: "Berth and Marina Strategy",
    summary: "How to choose marinas by total annual cost, access, weather exposure, and service quality.",
    body:
      "Marina choice drives both cost and experience.\n\n" +
      "**Compare full-stack cost**: berth + utilities + haul-out proximity + service network.\n\n" +
      "**Operational factor**: weekend congestion and departure friction can reduce actual boat usage.\n\n" +
      "**Weather factor**: exposure and shelter quality matter for wear and peace of mind.\n\n" +
      "**Decision method**: score marinas by cost, convenience, and risk, not price alone.",
  },
  {
    id: "seasonal-maintenance-calendar",
    category: "Ownership",
    icon: Wrench,
    color: "bg-warning/15 text-warning",
    tagColor: "bg-warning/10 text-warning",
    title: "Seasonal Maintenance Calendar",
    summary: "A practical month-by-month maintenance cadence to reduce emergency repairs and downtime.",
    body:
      "Reactive maintenance is the expensive path.\n\n" +
      "**Pre-season**: antifouling, safety checks, battery and charging validation, seal inspections.\n\n" +
      "**In-season**: fluid checks, cooling/fuel monitoring, periodic bilge and electrical checks.\n\n" +
      "**Post-season**: winterization, corrosion control, moisture management, and service scheduling.\n\n" +
      "**Outcome**: fewer failures and more predictable annual costs.",
  },
  {
    id: "parts-availability-risk",
    category: "Ownership",
    icon: FileCheck,
    color: "bg-warning/15 text-warning",
    tagColor: "bg-warning/10 text-warning",
    title: "Parts Availability Risk on Older Boats",
    summary: "How to check supply risk for engines, electronics, and fittings before buying older models.",
    body:
      "Availability risk can turn small repairs into long downtime.\n\n" +
      "**Before purchase**: verify parts channels for engine family, gearbox, and major electronics.\n\n" +
      "**Ask yards directly**: lead times and substitutes in your region.\n\n" +
      "**Mitigate**: keep critical spares onboard and maintain supplier shortlist.\n\n" +
      "**Pricing link**: scarcity risk should reduce your acceptable offer price.",
  },
  {
    id: "engine-risk-checklist",
    category: "Ownership",
    icon: Wrench,
    color: "bg-warning/15 text-warning",
    tagColor: "bg-warning/10 text-warning",
    title: "Engine Risk Checklist Before Offer",
    summary: "How to triage engine risk quickly using hours, service records, oil analysis, and survey findings.",
    body:
      "Engine uncertainty is one of the largest downside risks in used-boat purchases.\n\n" +
      "**Fast triage**: verify logged hours, service intervals, cooling/fuel system history, and recent major work.\n\n" +
      "**Evidence over claims**: invoices and maintenance records are more valuable than listing descriptions.\n\n" +
      "**When to escalate**: if signs of neglect appear, add specialist diagnostics and reserve budget for major service or replacement scenarios.",
  },
  {
    id: "insurance-coverage-gaps",
    category: "Costs",
    icon: Shield,
    color: "bg-coral/15 text-coral",
    tagColor: "bg-coral/10 text-coral",
    title: "Insurance Coverage Gaps to Avoid",
    summary: "A checklist for deductibles, exclusions, and claim conditions that impact true annual risk cost.",
    body:
      "Premium alone is not your real insurance cost.\n\n" +
      "**Check deductibles**: high deductibles shift risk back to you.\n\n" +
      "**Read exclusions**: weather, racing, unattended mooring, and machinery clauses.\n\n" +
      "**Claim conditions**: some policies require documented maintenance standards.\n\n" +
      "**Buying rule**: compare policies on effective coverage, not only headline premium.",
  },
  {
    id: "refit-budget-method",
    category: "Costs",
    icon: Wrench,
    color: "bg-coral/15 text-coral",
    tagColor: "bg-coral/10 text-coral",
    title: "Refit Budget Method for Older Boats",
    summary: "How to build staged refit budgets and avoid underestimating total cost of ownership.",
    body:
      "Older boats often need phased investment.\n\n" +
      "**Stage 1 (safety-critical)**: structural, fuel, electrical, steering, and through-hull priorities.\n\n" +
      "**Stage 2 (reliability)**: engine optimization, charging, pumps, and weatherproofing.\n\n" +
      "**Stage 3 (comfort/performance)**: interior, electronics upgrades, optional improvements.\n\n" +
      "**Budgeting tip**: include contingency reserve for hidden findings during works.",
  },
  {
    id: "fuel-and-usage-planning",
    category: "Costs",
    icon: Compass,
    color: "bg-coral/15 text-coral",
    tagColor: "bg-coral/10 text-coral",
    title: "Fuel and Usage Planning by Boat Type",
    summary: "Estimate realistic annual running cost using usage profile, engine setup, and cruising style.",
    body:
      "Fuel cost is a usage equation, not a fixed number.\n\n" +
      "**Inputs**: operating hours, cruise speed profile, engine setup, and route conditions.\n\n" +
      "**Powerboats**: model fuel with conservative and peak scenarios.\n\n" +
      "**Sailboats**: include engine hours for maneuvering and weather contingencies.\n\n" +
      "**Decision output**: annual fuel envelope you can sustain without reducing usage quality.",
  },
  {
    id: "negotiation-structure",
    category: "Negotiation",
    icon: BookOpen,
    color: "bg-primary/15 text-primary",
    tagColor: "bg-primary/10 text-primary",
    title: "Negotiation Structure That Works",
    summary: "Build your offer around market comparables, risk adjustments, and a strict walk-away threshold.",
    body:
      "Strong negotiations are structured, not emotional.\n\n" +
      "**Step 1**: establish fair market range from comparables.\n\n" +
      "**Step 2**: subtract documented risk and near-term repairs.\n\n" +
      "**Step 3**: define aggressive, realistic, and safe offer levels.\n\n" +
      "**Step 4**: enforce a walk-away price to avoid overpaying under pressure.\n\n" +
      "This is exactly where consistent scoring and evidence-backed risk notes create leverage.",
  },
  {
    id: "offer-ladder-tactics",
    category: "Negotiation",
    icon: DollarSign,
    color: "bg-primary/15 text-primary",
    tagColor: "bg-primary/10 text-primary",
    title: "Offer Ladder Tactics",
    summary: "How to sequence first, second, and final offers using evidence checkpoints and timing control.",
    body:
      "Good negotiations are phased.\n\n" +
      "**Round 1**: anchor with market comparables and documented concerns.\n\n" +
      "**Round 2**: move only when new evidence is acknowledged.\n\n" +
      "**Final round**: keep a clear expiry and walk-away discipline.\n\n" +
      "**Result**: better prices without emotional overbidding.",
  },
  {
    id: "survey-findings-to-price",
    category: "Negotiation",
    icon: FileCheck,
    color: "bg-primary/15 text-primary",
    tagColor: "bg-primary/10 text-primary",
    title: "Turn Survey Findings Into Price Moves",
    summary: "Translate technical findings into quantified concessions the seller can respond to immediately.",
    body:
      "Survey reports are negotiation leverage when quantified.\n\n" +
      "**Convert findings to cost lines**: urgent, near-term, and optional buckets.\n\n" +
      "**Use ranges, not guesses**: request yard quotes where possible.\n\n" +
      "**Present cleanly**: one-page adjustment summary avoids argument noise.\n\n" +
      "**Outcome**: objective discussion focused on value gap, not opinions.",
  },
  {
    id: "when-to-walk-away",
    category: "Negotiation",
    icon: Shield,
    color: "bg-primary/15 text-primary",
    tagColor: "bg-primary/10 text-primary",
    title: "When to Walk Away",
    summary: "The warning signals that indicate your best financial decision is to stop negotiating.",
    body:
      "Walking away is part of good buying, not failure.\n\n" +
      "**Red flags**: missing documents, inconsistent claims, unresolved major defects, shifting seller terms.\n\n" +
      "**Discipline**: pre-define max all-in cost before talks intensify.\n\n" +
      "**Opportunity cost**: market depth usually rewards patient buyers.\n\n" +
      "**Rule**: if trust and numbers both break, exit early and preserve capital.",
  },
];
