const currentYear = new Date().getFullYear();

export type BoatType = "sailboat" | "powerboat";

export interface EvalCategory {
  name: string;
  score: number;
  maxScore: number;
  details: string;
  icon: string;
}

export interface EvalResult {
  score: number;
  verdict: string;
  color: string;
  categories: EvalCategory[];
  recommendations: string[];
  priceAssessment: string;
  estimatedRepairCost: number;
}

export interface BoatData {
  boatType: BoatType;
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
}

export function evaluate(data: BoatData): EvalResult {
  const { boatType, year, price, lengthFt, engine, hull, sails, engineHours, engineYear, engineHp, hullMaterial, knownIssues, recentWork } = data;
  const age = currentYear - year;
  const categories: EvalCategory[] = [];
  const recommendations: string[] = [];
  let estimatedRepairCost = 0;

  // 1. Age & Depreciation (max 20)
  let ageScore = 20;
  let ageDetail = "";
  if (age <= 5) { ageScore = 20; ageDetail = "Nearly new, minimal depreciation"; }
  else if (age <= 10) { ageScore = 17; ageDetail = "Modern boat in prime years"; }
  else if (age <= 15) { ageScore = 14; ageDetail = "Middle-aged, check for wear"; }
  else if (age <= 20) { ageScore = 10; ageDetail = "Aging — expect maintenance costs"; }
  else if (age <= 30) { ageScore = 6; ageDetail = "Old — significant upkeep needed"; recommendations.push("Commission a full marine survey before purchase"); }
  else { ageScore = 2; ageDetail = "Very old — likely needs extensive refit"; recommendations.push("Budget for a complete refit (€10,000–30,000+)"); estimatedRepairCost += 15000; }
  categories.push({ name: "Age & Depreciation", score: ageScore, maxScore: 20, details: ageDetail, icon: "⏳" });

  // 2. Engine (max 30 — more weight for powerboats)
  const engineMax = boatType === "powerboat" ? 35 : 25;
  let engineScore = engineMax;
  let engineDetail = "";

  // Factor in engine hours if available
  const effectiveEngineCondition = engine === "good" && engineHours && engineHours > 3000 ? "average" :
    engine === "good" && engineHours && engineHours > 5000 ? "bad" : engine;

  if (effectiveEngineCondition === "good") {
    engineScore = engineMax;
    engineDetail = `Engine in good condition${engineHours ? ` (${engineHours}h)` : ""}`;
  } else if (effectiveEngineCondition === "average") {
    engineScore = Math.round(engineMax * 0.55);
    engineDetail = `Engine functional but showing wear${engineHours ? ` (${engineHours}h)` : ""}`;
    const serviceCost = boatType === "powerboat" ? "€2,000–5,000" : "€1,000–3,000";
    recommendations.push(`Budget ${serviceCost} for engine servicing`);
    estimatedRepairCost += boatType === "powerboat" ? 3500 : 2000;
  } else {
    engineScore = Math.round(engineMax * 0.15);
    engineDetail = `Engine needs major repair or replacement${engineHours ? ` (${engineHours}h)` : ""}`;
    const replaceCost = boatType === "powerboat" ? "€8,000–25,000" : "€5,000–15,000";
    recommendations.push(`Engine replacement can cost ${replaceCost}`);
    estimatedRepairCost += boatType === "powerboat" ? 15000 : 10000;
  }

  if (engineYear && (currentYear - engineYear) > 15) {
    engineScore = Math.max(0, engineScore - 3);
    engineDetail += ` — engine is ${currentYear - engineYear} years old`;
    recommendations.push("Consider engine age when budgeting for maintenance");
  }

  categories.push({ name: "Engine", score: engineScore, maxScore: engineMax, details: engineDetail, icon: "⚙️" });

  // 3. Hull (max 25)
  let hullScore = 25;
  let hullDetail = "";
  if (hull === "good") {
    hullScore = 25;
    hullDetail = `Hull in solid condition${hullMaterial ? ` (${hullMaterial})` : ""}`;
  } else if (hull === "osmosis") {
    hullScore = 8;
    hullDetail = "Osmosis detected — costly treatment needed";
    recommendations.push("Osmosis treatment costs €3,000–8,000 depending on severity");
    estimatedRepairCost += 5000;
  } else {
    hullScore = 3;
    hullDetail = "Hull damage — structural integrity at risk";
    recommendations.push("Get a hull survey ASAP; repair costs €5,000–20,000+");
    estimatedRepairCost += 12000;
  }
  categories.push({ name: "Hull Integrity", score: hullScore, maxScore: 25, details: hullDetail, icon: "🚢" });

  // 4. Sails/Drive (max 20 for sailboats, max 15 for powerboats — drives/props)
  if (boatType === "sailboat") {
    let sailsScore = 20;
    let sailsDetail = "";
    if (sails === "new") { sailsScore = 20; sailsDetail = "Sails are new or recently replaced"; }
    else if (sails === "average" || sails === "none") { sailsScore = 13; sailsDetail = "Sails serviceable but aging"; recommendations.push("Plan for new sails in 2–4 years (€2,000–6,000)"); estimatedRepairCost += 1000; }
    else { sailsScore = 5; sailsDetail = "Sails worn out — replacement needed soon"; recommendations.push("New sail set needed: €3,000–8,000"); estimatedRepairCost += 5000; }
    categories.push({ name: "Sails & Rigging", score: sailsScore, maxScore: 20, details: sailsDetail, icon: "⛵" });
  } else {
    // Powerboat: propulsion/drive system
    let driveScore = 15;
    let driveDetail = "";
    if (engine === "good") { driveScore = 15; driveDetail = "Drive system and propellers in good shape"; }
    else if (engine === "average") { driveScore = 9; driveDetail = "Drive system showing wear"; recommendations.push("Budget for outdrive/propeller service (€1,000–3,000)"); estimatedRepairCost += 1500; }
    else { driveScore = 4; driveDetail = "Drive system needs attention"; recommendations.push("Full drive system overhaul may be needed (€3,000–8,000)"); estimatedRepairCost += 5000; }
    categories.push({ name: "Drive & Propulsion", score: driveScore, maxScore: 15, details: driveDetail, icon: "🔧" });
  }

  // 5. Known Issues penalty
  if (knownIssues && knownIssues.length > 0) {
    const penalty = Math.min(10, knownIssues.length * 3);
    categories.push({
      name: "Known Issues",
      score: Math.max(0, 10 - penalty),
      maxScore: 10,
      details: `${knownIssues.length} issue(s) reported: ${knownIssues.slice(0, 2).join("; ")}`,
      icon: "⚠️",
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

  // Price assessment
  const pricePerFoot = price / lengthFt;
  let priceAssessment = "";
  if (age > 20 && price > 100000) {
    totalScore = Math.max(0, totalScore - 10);
    priceAssessment = "⚠️ Overpriced — very high price for the age";
    recommendations.push("Negotiate hard — price seems inflated for a boat this old");
  } else if (pricePerFoot > 5000) {
    priceAssessment = "💰 Premium pricing — verify condition justifies the cost";
  } else if (pricePerFoot > 2500) {
    priceAssessment = "✅ Market-rate pricing for this size";
  } else if (pricePerFoot > 1000) {
    priceAssessment = "👍 Below average price — possible bargain or hidden issues";
    recommendations.push("Low price — investigate why the seller is discounting");
  } else {
    priceAssessment = "🔍 Very low price — proceed with caution";
    recommendations.push("Suspiciously low price — inspect thoroughly");
  }

  totalScore = Math.max(0, Math.min(100, totalScore));
  const verdict = totalScore >= 80 ? "Good Deal" : totalScore >= 60 ? "Fair Deal" : totalScore >= 40 ? "Below Average" : "Risky Purchase";
  const color = totalScore >= 80 ? "text-success" : totalScore >= 60 ? "text-warning" : "text-destructive";

  if (recommendations.length === 0) {
    recommendations.push("Boat looks solid! Still recommended to get a professional survey.");
  }

  return { score: totalScore, verdict, color, categories, recommendations, priceAssessment, estimatedRepairCost };
}
