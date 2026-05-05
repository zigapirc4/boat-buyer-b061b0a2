const currentYear = new Date().getFullYear();

export type BoatType = "sailboat" | "powerboat";
export type SailboatSegment =
  | "cruiser"
  | "performance_cruiser"
  | "racing"
  | "catamaran"
  | "luxury_cruiser"
  | "project";
export type MotorboatSegment =
  | "motor_cruiser"
  | "flybridge"
  | "sport_boat"
  | "tender"
  | "rib"
  | "luxury_yacht"
  | "project";
export type BoatSegment = SailboatSegment | MotorboatSegment;

export interface EvalCategory {
  name: string;
  score: number;
  maxScore: number;
  details: string;
  icon: string;
}

export interface ScoreDriver {
  label: string;
  impact: number;
  type: "positive" | "negative";
}

export interface DataQualityItem {
  field: string;
  status: "available" | "missing" | "inferred";
  note: string;
}

export interface EvalResult {
  score: number;
  verdict: string;
  color: string;
  categories: EvalCategory[];
  recommendations: string[];
  priceAssessment: string;
  estimatedRepairCost: number;
  confidenceScore: number;
  confidenceDetails: string;
  fairPriceLow: number;
  fairPriceHigh: number;
  targetOffer: number;
  scoreDrivers: ScoreDriver[];
  dataQuality: DataQualityItem[];
  offerRange: {
    aggressive: number;
    realistic: number;
    safe: number;
  };
  walkAwayPrice: number;
  negotiationAnchors: string[];
  repairEstimateBreakdown: {
    label: string;
    estimate: number;
    note?: string;
  }[];
}

export interface BoatData {
  boatType: BoatType;
  segment?: BoatSegment | null;
  conditionScore?: number;
  year: number;
  price: number;
  lengthFt: number;
  engine: string;
  hull: string;
  sails: string;
  engineHours?: number;
  engineYear?: number;
  engineHp?: number;
  hullMaterial?: string;
  knownIssues?: string[];
  recentWork?: string[];
  comparables?: {
    price_eur: number;
    length_feet: number;
    year?: number | null;
    title?: string;
    url?: string;
    image_url?: string | null;
    location?: string | null;
    engine_info?: string | null;
    description?: string;
    segment?: string | null;
    condition_score?: number | null;
  }[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

export function evaluate(data: BoatData): EvalResult {
  const {
    boatType,
    segment,
    conditionScore,
    year,
    price,
    lengthFt,
    engine,
    hull,
    sails,
    engineHours,
    engineYear,
    engineHp,
    hullMaterial,
    knownIssues,
    recentWork,
    comparables,
  } = data;
  const age = currentYear - year;
  const categories: EvalCategory[] = [];
  const recommendations: string[] = [];
  let estimatedRepairCost = 0;
  const repairEstimateBreakdown: { label: string; estimate: number; note?: string }[] = [];

  // 1. Age & Depreciation (max 20)
  let ageScore = 20;
  let ageDetail = "";
  if (age <= 3) {
    ageScore = 20;
    ageDetail = "Nearly new — minimal depreciation, modern systems";
  } else if (age <= 7) {
    ageScore = 18;
    ageDetail = "Young boat in prime condition, low maintenance expected";
  } else if (age <= 12) {
    ageScore = 15;
    ageDetail = "Proven design, some wear items may need attention";
  } else if (age <= 18) {
    ageScore = 13;
    ageDetail = "Mid-life — standing rigging, electronics, upholstery aging";
    recommendations.push("Check standing rigging age — replacement due every 10–15 years");
  } else if (age <= 25) {
    ageScore = 10;
    ageDetail = "Older but often solid when maintained — verify service history and key systems";
    recommendations.push("Commission a full marine survey before purchase");
    recommendations.push("Budget for electronics upgrade (€2,000–5,000)");
    estimatedRepairCost += 2000;
    repairEstimateBreakdown.push({
      label: "Age-related systems refresh",
      estimate: 2000,
      note: "Electronics, plumbing, wiring spot replacements",
    });
  } else if (age <= 35) {
    ageScore = 8;
    ageDetail = "Classic/older boat — condition varies strongly by maintenance and upgrades";
    recommendations.push("Full marine survey essential — prioritize structure, engine, and electrical checks");
    recommendations.push("Budget for selective refit based on survey findings (€8,000–25,000+)");
    estimatedRepairCost += 12000;
    repairEstimateBreakdown.push({
      label: "Major age refit reserve",
      estimate: 12000,
      note: "Multiple core systems likely overdue",
    });
  } else {
    ageScore = 6;
    ageDetail = "Very old/classic — can still be excellent if restoration and maintenance are documented";
    recommendations.push("Insurance may be difficult to obtain for boats 35+ years old");
    recommendations.push("Budget for deeper refit risk reserve (€15,000–45,000+), based on survey scope");
    estimatedRepairCost += 22000;
    repairEstimateBreakdown.push({
      label: "Full legacy refit reserve",
      estimate: 22000,
      note: "Structural, mechanical, electrical and interior updates",
    });
  }
  categories.push({ name: "Age & Depreciation", score: ageScore, maxScore: 20, details: ageDetail, icon: "⏳" });

  // 2. Engine (max 25 sail / 35 power)
  const engineMax = boatType === "powerboat" ? 35 : 25;
  let engineScore = engineMax;
  let engineDetail = "";

  const effectiveEngineCondition =
    engine === "good" && engineHours && engineHours > 5000
      ? "bad"
      : engine === "good" && engineHours && engineHours > 3000
        ? "average"
        : engine;

  if (effectiveEngineCondition === "good") {
    engineScore = engineMax;
    engineDetail = `Engine in good condition${engineHours ? ` (${engineHours}h)` : ""}`;
    if (engineHours && engineHours < 500) {
      engineDetail += " — very low hours, excellent";
    } else if (engineHours && engineHours < 1500) {
      engineDetail += " — low hours";
    }
  } else if (effectiveEngineCondition === "average") {
    engineScore = Math.round(engineMax * 0.55);
    engineDetail = `Engine functional but showing wear${engineHours ? ` (${engineHours}h)` : ""}`;
    const serviceCost = boatType === "powerboat" ? "€2,000–5,000" : "€1,000–3,000";
    recommendations.push(`Budget ${serviceCost} for engine servicing (oil, filters, impeller, belts)`);
    if (engineHours && engineHours > 3000) recommendations.push("Consider compression test and injector service");
    estimatedRepairCost += boatType === "powerboat" ? 3500 : 2000;
    repairEstimateBreakdown.push({
      label: "Engine service catch-up",
      estimate: boatType === "powerboat" ? 3500 : 2000,
      note: "Routine + wear components",
    });
  } else {
    engineScore = Math.round(engineMax * 0.15);
    engineDetail = `Engine needs major repair or replacement${engineHours ? ` (${engineHours}h)` : ""}`;
    const replaceCost = boatType === "powerboat" ? "€8,000–25,000" : "€5,000–15,000";
    recommendations.push(`Engine replacement can cost ${replaceCost}`);
    recommendations.push("Get a professional engine survey with compression and oil analysis");
    estimatedRepairCost += boatType === "powerboat" ? 15000 : 10000;
    repairEstimateBreakdown.push({
      label: "Engine major repair/replacement reserve",
      estimate: boatType === "powerboat" ? 15000 : 10000,
      note: boatType === "powerboat" ? "Inboard/twin setup risk is higher" : "Single diesel replacement scenario",
    });
  }

  if (engineYear && currentYear - engineYear > 15) {
    engineScore = Math.max(0, engineScore - 3);
    engineDetail += ` — engine is ${currentYear - engineYear} years old`;
    recommendations.push("Consider engine age when budgeting — parts availability may be limited");
  }

  if (engineHp) {
    const hpPerFoot = engineHp / lengthFt;
    if (boatType === "powerboat" && hpPerFoot < 3) {
      engineDetail += " — underpowered for this size";
      recommendations.push("Engine may be underpowered — check planing ability and cruising speed");
    }
  }

  categories.push({ name: "Engine", score: engineScore, maxScore: engineMax, details: engineDetail, icon: "⚙️" });

  // 3. Price/Value (max 25)
  const lengthM = Math.max(0.1, lengthFt * 0.3048);
  const pricePerMeter = price / lengthM;
  let valueScore = 25;
  let valueDetail = "";

  // Market rate analysis based on cohort:
  // segment + year + length + condition score proximity.
  const comparableRows = (comparables || []).filter((c) => c.price_eur > 0 && c.length_feet > 0);
  const strictCohort = comparableRows.filter((c) => {
    const segOk = !segment || !c.segment || c.segment === segment;
    const yearOk = !c.year || Math.abs(c.year - year) <= 3;
    const lenOk = Math.abs(c.length_feet - lengthFt) <= 2.5;
    const condOk =
      conditionScore === undefined || conditionScore === null || c.condition_score === null || c.condition_score === undefined
        ? true
        : Math.abs(c.condition_score - conditionScore) <= 15;
    return segOk && yearOk && lenOk && condOk;
  });
  const relaxedCohort = comparableRows.filter((c) => {
    const segOk = !segment || !c.segment || c.segment === segment;
    const yearOk = !c.year || Math.abs(c.year - year) <= 5;
    const lenOk = Math.abs(c.length_feet - lengthFt) <= 4;
    return segOk && yearOk && lenOk;
  });
  const cohort = strictCohort.length >= 4 ? strictCohort : relaxedCohort;
  const comparableCount = cohort.length;

  const comparablePpm = cohort.map((c) => c.price_eur / (c.length_feet * 0.3048)).filter((v) => Number.isFinite(v) && v > 0);
  let fairLow = 0;
  let fairHigh = 0;
  let fairMid = 0;
  let priceRatio = 1;
  if (comparablePpm.length >= 4) {
    fairLow = percentile(comparablePpm, 0.25);
    fairMid = median(comparablePpm);
    fairHigh = percentile(comparablePpm, 0.75);
    priceRatio = pricePerMeter / Math.max(1, fairMid);
  }

  if (comparablePpm.length < 4) {
    valueScore = 12;
    valueDetail = "Insufficient comparable boats for robust cohort pricing";
  } else if (priceRatio <= 0.85) {
    valueScore = 25;
    valueDetail = `€${Math.round(pricePerMeter).toLocaleString()}/m is below cohort median (segment/size/year/condition)`;
    recommendations.push("Good price — still negotiate, sellers often have 10–15% margin");
  } else if (priceRatio <= 1.15 && pricePerMeter <= fairHigh) {
    valueScore = 18;
    valueDetail = `€${Math.round(pricePerMeter).toLocaleString()}/m is within fair cohort range`;
  } else if (priceRatio <= 1.35) {
    valueScore = 12;
    valueDetail = `€${Math.round(pricePerMeter).toLocaleString()}/m is above similar boats`;
    recommendations.push("Price is above average — negotiate or verify premium features justify the cost");
  } else {
    valueScore = 5;
    valueDetail = `€${Math.round(pricePerMeter).toLocaleString()}/m is strongly above comparable cohort`;
    recommendations.push("Price is well above market — strong negotiation recommended");
  }

  if (age > 20 && price > 100000) {
    valueScore = Math.max(0, valueScore - 2);
    recommendations.push("High price for an older boat — ensure condition justifies it");
  }
  categories.push({ name: "Value for Money", score: valueScore, maxScore: 25, details: valueDetail, icon: "💰" });
  // 4. Sails/Drive (max 20 for sailboats, max 15 for powerboats)
  if (boatType === "sailboat") {
    let sailsScore = 20;
    let sailsDetail = "";
    if (sails === "new") {
      sailsScore = 20;
      sailsDetail = "Sails are new or recently replaced";
    } else if (sails === "average" || sails === "none") {
      sailsScore = 13;
      sailsDetail = "Sails serviceable but aging";
      recommendations.push("Plan for new sails in 2–4 years (€2,000–6,000 for a cruising set)");
      estimatedRepairCost += 1000;
      repairEstimateBreakdown.push({
        label: "Sail refresh reserve",
        estimate: 1000,
      });
    } else {
      sailsScore = 5;
      sailsDetail = "Sails worn out — replacement needed soon";
      recommendations.push("New sail set needed: mainsail €1,500–4,000, genoa €1,500–3,500");
      estimatedRepairCost += 5000;
      repairEstimateBreakdown.push({
        label: "Sail set replacement",
        estimate: 5000,
        note: "Mainsail + headsail typical cruising setup",
      });
    }

    // Standing rigging age check
    if (age > 12) {
      sailsScore = Math.max(0, sailsScore - 2);
      sailsDetail += " — rigging may be due for replacement";
      if (age > 15) {
        recommendations.push("Standing rigging replacement: €4,000–10,000 depending on boat size");
        estimatedRepairCost += 3000;
        repairEstimateBreakdown.push({
          label: "Standing rigging reserve",
          estimate: 3000,
          note: "Wire, terminals, tuning labor",
        });
      }
    }

    categories.push({ name: "Sails & Rigging", score: sailsScore, maxScore: 20, details: sailsDetail, icon: "⛵" });
  } else {
    let driveScore = 15;
    let driveDetail = "";
    if (engine === "good") {
      driveScore = 15;
      driveDetail = "Drive system and propellers in good shape";
    } else if (engine === "average") {
      driveScore = 9;
      driveDetail = "Drive system showing wear";
      recommendations.push("Budget for outdrive/propeller service (€1,000–3,000)");
      estimatedRepairCost += 1500;
      repairEstimateBreakdown.push({
        label: "Drive system service",
        estimate: 1500,
      });
    } else {
      driveScore = 4;
      driveDetail = "Drive system needs attention";
      recommendations.push("Full drive system overhaul may be needed (€3,000–8,000)");
      estimatedRepairCost += 5000;
      repairEstimateBreakdown.push({
        label: "Drive system overhaul reserve",
        estimate: 5000,
      });
    }
    categories.push({ name: "Drive & Propulsion", score: driveScore, maxScore: 15, details: driveDetail, icon: "🔧" });
  }

  // 5. Overall Condition (max 10) — inferred from hull, age, description
  let conditionCategoryScore = 10;
  let conditionDetail = "";
  if (hull === "good" && age <= 25) {
    conditionCategoryScore = 10;
    conditionDetail = `Well-maintained${hullMaterial ? ` ${hullMaterial}` : ""} hull, good overall condition`;
  } else if (hull === "good") {
    conditionCategoryScore = 8;
    conditionDetail = `Hull sound; age (${age}yr) can still be fine if maintenance and upgrades are documented`;
  } else if (hull === "osmosis") {
    conditionCategoryScore = 3;
    conditionDetail = "Osmosis detected — costly treatment needed";
    recommendations.push("Osmosis treatment: €3,000–8,000 depending on severity and boat size");
    estimatedRepairCost += 5000;
    repairEstimateBreakdown.push({
      label: "Osmosis treatment",
      estimate: 5000,
      note: "Peel, dry-out, barrier recoating",
    });
  } else {
    conditionCategoryScore = 1;
    conditionDetail = "Hull damage — structural integrity at risk";
    recommendations.push("Get a hull survey ASAP; repair costs €5,000–20,000+");
    estimatedRepairCost += 12000;
    repairEstimateBreakdown.push({
      label: "Hull structural repair reserve",
      estimate: 12000,
      note: "Fiberglass/laminate structural correction",
    });
  }
  categories.push({
    name: "Overall Condition",
    score: conditionCategoryScore,
    maxScore: 10,
    details: conditionDetail,
    icon: "🔍",
  });

  // 6. Known Issues penalty
  if (knownIssues && knownIssues.length > 0) {
    const penalty = Math.min(10, knownIssues.length * 3);
    categories.push({
      name: "Known Issues",
      score: Math.max(0, 10 - penalty),
      maxScore: 10,
      details: `${knownIssues.length} issue(s) reported: ${knownIssues.slice(0, 2).join("; ")}`,
      icon: "⚠️",
    });
    // Estimate €1,500 per known issue
    estimatedRepairCost += knownIssues.length * 1500;
    repairEstimateBreakdown.push({
      label: "Known issue remediation",
      estimate: knownIssues.length * 1500,
      note: `${knownIssues.length} identified issues`,
    });
  }

  // Recent work bonus (informational)
  if (recentWork && recentWork.length > 0) {
    recommendations.unshift(`✅ Recent work done: ${recentWork.slice(0, 3).join(", ")}`);
  }

  // Total
  const maxTotal = categories.reduce((sum, c) => sum + c.maxScore, 0);
  const rawTotal = categories.reduce((sum, c) => sum + c.score, 0);
  let totalScore = Math.round((rawTotal / maxTotal) * 100);

  // Price assessment summary
  let priceAssessment = "";
  if (comparablePpm.length < 4) {
    priceAssessment = "⚪ Not enough similar boats for reliable overpriced verdict";
  } else if (priceRatio <= 0.85) {
    priceAssessment = "👍 Below market — potential bargain if condition checks out";
  } else if (priceRatio <= 1.15 && pricePerMeter <= fairHigh) {
    priceAssessment = "✅ Fair pricing vs boats with similar segment/length/year/condition";
  } else if (priceRatio <= 1.35) {
    priceAssessment = "💰 Somewhat overpriced vs comparable cohort";
  } else {
    priceAssessment = "⚠️ Overpriced vs comparable segment/length/year/condition cohort";
  }

  totalScore = Math.max(0, Math.min(100, totalScore));
  const verdict =
    totalScore >= 80
      ? "Great Deal"
      : totalScore >= 65
        ? "Good Deal"
        : totalScore >= 50
          ? "Fair Deal"
          : totalScore >= 35
            ? "Below Average"
            : "Risky Purchase";
  const color = totalScore >= 65 ? "text-success" : totalScore >= 50 ? "text-warning" : "text-destructive";

  if (recommendations.length === 0) {
    recommendations.push("Boat looks solid! Still recommended to get a professional survey before committing.");
  }

  // Always add survey recommendation for boats over €20k
  if (price > 20000 && !recommendations.some((r) => r.toLowerCase().includes("survey"))) {
    recommendations.push("Always get an independent marine survey for boats over €20,000");
  }

  let confidence = 40;
  if (comparableCount >= 10) confidence += 25;
  else if (comparableCount >= 5) confidence += 18;
  else if (comparableCount >= 3) confidence += 12;
  if (engineHours !== undefined) confidence += 8;
  if (engineYear !== undefined) confidence += 5;
  if (engineHp !== undefined) confidence += 5;
  if (hullMaterial) confidence += 5;
  if ((knownIssues && knownIssues.length > 0) || (recentWork && recentWork.length > 0)) confidence += 7;
  const confidenceScore = Math.max(0, Math.min(100, confidence));
  const confidenceDetails =
    comparableCount >= 4
      ? `Based on ${comparableCount} boats matched by segment, size, year, and condition`
      : `Limited cohort matches (${comparableCount}) for segment/size/year/condition pricing`;

  const fairPriceLow = comparablePpm.length >= 4 ? Math.max(0, Math.round(fairLow * lengthM)) : Math.max(0, Math.round(price * 0.85));
  const fairPriceHigh = comparablePpm.length >= 4 ? Math.max(fairPriceLow, Math.round(fairHigh * lengthM)) : Math.max(fairPriceLow, Math.round(price * 1.15));
  const repairNegotiationBuffer = Math.round(estimatedRepairCost * 0.3);
  const marketNegotiationBuffer = Math.round(fairPriceLow * 0.05);
  const rawTargetOffer = Math.max(0, fairPriceLow - Math.max(repairNegotiationBuffer, marketNegotiationBuffer));
  const isClearlyOverpriced = price > fairPriceHigh;
  // Keep offer guidance aligned with verdict only when listing is not clearly above fair range.
  const minOfferByVerdictPct =
    totalScore >= 80 ? 0.92 : totalScore >= 65 ? 0.87 : totalScore >= 50 ? 0.78 : totalScore >= 35 ? 0.65 : 0.5;
  const minOfferByVerdict = Math.round(price * minOfferByVerdictPct);
  const verdictFloor = isClearlyOverpriced ? 0 : minOfferByVerdict;
  const preCapTargetOffer = Math.max(rawTargetOffer, verdictFloor);
  // If listing is above fair range, never suggest target above fair high.
  const fairCap = isClearlyOverpriced ? fairPriceHigh : price;
  // Never suggest offering above the current listing price.
  const targetOffer = Math.max(0, Math.min(price, fairCap, preCapTargetOffer));

  const missingCriticalSignals =
    (engineHours === undefined ? 1 : 0) +
    (hullMaterial ? 0 : 1) +
    (comparableCount < 3 ? 1 : 0);
  // Keep walk-away guidance slightly more flexible: apply a lighter
  // uncertainty penalty so users still have room to close realistic deals.
  const riskPenaltyPct = missingCriticalSignals * 0.015;
  const walkAwayBase = Math.min(price, fairPriceHigh);
  const walkAwayPrice = Math.max(0, Math.round(walkAwayBase * (1 - riskPenaltyPct)));

  const aggressive = Math.max(0, Math.round(targetOffer - price * 0.06));
  const realistic = targetOffer;
  const safeGap = Math.max(1500, Math.round(price * 0.02));
  const safeUpperBound = Math.max(0, walkAwayPrice - safeGap);
  const safe = Math.min(safeUpperBound, Math.round(targetOffer + price * 0.08));
  const ordered = [aggressive, realistic, safe].sort((a, b) => a - b);

  const negotiationAnchors: string[] = [];
  if (price > fairPriceHigh) {
    negotiationAnchors.push(
      `Current ask is about €${(price - fairPriceHigh).toLocaleString()} above the fair high estimate.`,
    );
  } else if (price < fairPriceLow) {
    negotiationAnchors.push(
      `Current ask is already below the model fair range by about €${(fairPriceLow - price).toLocaleString()}.`,
    );
  } else {
    negotiationAnchors.push("Current ask sits within the estimated fair market range.");
  }
  if (estimatedRepairCost > 0) {
    negotiationAnchors.push(
      `Expected near-term repairs are estimated at roughly €${estimatedRepairCost.toLocaleString()}.`,
    );
  }
  if (engineHours === undefined) {
    negotiationAnchors.push("Engine hours are missing, so additional mechanical risk remains unpriced.");
  }
  if (!hullMaterial) {
    negotiationAnchors.push("Hull material is unknown, which increases uncertainty on structural risk and maintenance.");
  }
  if (comparableCount < 3) {
    negotiationAnchors.push("Cohort matches are limited for segment/size/year/condition, so keep negotiation conservative.");
  }

  const driverCandidates: ScoreDriver[] = [
    { label: "Age & Depreciation", impact: ageScore - 10, type: ageScore >= 10 ? "positive" : "negative" },
    {
      label: "Engine condition and hours",
      impact: engineScore - Math.round(engineMax * 0.6),
      type: engineScore >= Math.round(engineMax * 0.6) ? "positive" : "negative",
    },
    { label: "Value vs market comps", impact: valueScore - 15, type: valueScore >= 15 ? "positive" : "negative" },
    {
      label: "Overall condition",
      impact: conditionCategoryScore - 5,
      type: conditionCategoryScore >= 5 ? "positive" : "negative",
    },
  ];
  const scoreDrivers = driverCandidates
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 4)
    .map((d) => ({ ...d, impact: Math.round(d.impact) }));

  const dataQuality: DataQualityItem[] = [
    { field: "Price", status: price > 0 ? "available" : "missing", note: price > 0 ? "Provided for valuation" : "Missing price" },
    {
      field: "Length",
      status: lengthFt > 0 ? "available" : "missing",
      note: lengthFt > 0 ? "Used for normalized market comparison" : "Missing length",
    },
    { field: "Year", status: year > 0 ? "available" : "missing", note: year > 0 ? "Used for age and comparables" : "Missing build year" },
    {
      field: "Engine hours",
      status: engineHours !== undefined ? "available" : "inferred",
      note: engineHours !== undefined ? "Directly included in engine scoring" : "Condition inferred without hour data",
    },
    {
      field: "Hull material",
      status: hullMaterial ? "available" : "inferred",
      note: hullMaterial ? "Material-specific risk captured" : "Generic hull risk assumptions used",
    },
    {
      field: "Market comparables",
      status: comparableCount >= 4 ? "available" : "inferred",
      note:
        comparableCount >= 4
          ? `${comparableCount} cohort-matched listings used`
          : "Too few cohort matches (segment/length/year/condition)",
    },
  ];

  return {
    score: totalScore,
    verdict,
    color,
    categories,
    recommendations,
    priceAssessment,
    estimatedRepairCost,
    confidenceScore,
    confidenceDetails,
    fairPriceLow,
    fairPriceHigh,
    targetOffer,
    scoreDrivers,
    dataQuality,
    offerRange: {
      aggressive: ordered[0],
      realistic: ordered[1],
      safe: ordered[2],
    },
    walkAwayPrice,
    negotiationAnchors: negotiationAnchors.slice(0, 5),
    repairEstimateBreakdown,
  };
}
