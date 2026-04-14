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
  if (age <= 3) { ageScore = 20; ageDetail = "Nearly new — minimal depreciation, modern systems"; }
  else if (age <= 7) { ageScore = 18; ageDetail = "Young boat in prime condition, low maintenance expected"; }
  else if (age <= 12) { ageScore = 15; ageDetail = "Proven design, some wear items may need attention"; }
  else if (age <= 18) { ageScore = 11; ageDetail = "Mid-life — standing rigging, electronics, upholstery aging"; recommendations.push("Check standing rigging age — replacement due every 10–15 years"); }
  else if (age <= 25) { ageScore = 7; ageDetail = "Aging — expect deferred maintenance, possible refit needed"; recommendations.push("Commission a full marine survey before purchase"); recommendations.push("Budget for electronics upgrade (€2,000–5,000)"); estimatedRepairCost += 3000; }
  else if (age <= 35) { ageScore = 4; ageDetail = "Old — significant systems likely need overhaul"; recommendations.push("Full marine survey essential — structural concerns likely"); recommendations.push("Budget for extensive refit (€15,000–40,000+)"); estimatedRepairCost += 20000; }
  else { ageScore = 1; ageDetail = "Very old — likely needs complete refit, may be uninsurable"; recommendations.push("Insurance may be difficult to obtain for boats 35+ years old"); recommendations.push("Budget for complete refit (€25,000–60,000+)"); estimatedRepairCost += 35000; }
  categories.push({ name: "Age & Depreciation", score: ageScore, maxScore: 20, details: ageDetail, icon: "⏳" });

  // 2. Engine (max 25 sail / 35 power)
  const engineMax = boatType === "powerboat" ? 35 : 25;
  let engineScore = engineMax;
  let engineDetail = "";

  const effectiveEngineCondition = engine === "good" && engineHours && engineHours > 3000 ? "average" :
    engine === "good" && engineHours && engineHours > 5000 ? "bad" : engine;

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
  } else {
    engineScore = Math.round(engineMax * 0.15);
    engineDetail = `Engine needs major repair or replacement${engineHours ? ` (${engineHours}h)` : ""}`;
    const replaceCost = boatType === "powerboat" ? "€8,000–25,000" : "€5,000–15,000";
    recommendations.push(`Engine replacement can cost ${replaceCost}`);
    recommendations.push("Get a professional engine survey with compression and oil analysis");
    estimatedRepairCost += boatType === "powerboat" ? 15000 : 10000;
  }

  if (engineYear && (currentYear - engineYear) > 15) {
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
  const pricePerFoot = price / lengthFt;
  let valueScore = 25;
  let valueDetail = "";

  // Market rate analysis based on age and type
  const expectedPpf = boatType === "powerboat"
    ? (age <= 5 ? 4000 : age <= 10 ? 2800 : age <= 20 ? 1800 : age <= 30 ? 1000 : 600)
    : (age <= 5 ? 3500 : age <= 10 ? 2500 : age <= 20 ? 1500 : age <= 30 ? 800 : 400);

  const priceRatio = pricePerFoot / expectedPpf;

  if (priceRatio <= 0.6) {
    valueScore = 25;
    valueDetail = `€${Math.round(pricePerFoot).toLocaleString()}/ft — significantly below market (${Math.round((1 - priceRatio) * 100)}% under)`;
    recommendations.push("🔍 Price is very low — inspect thoroughly for hidden problems");
    recommendations.push("Check for liens, outstanding debts, or title issues");
  } else if (priceRatio <= 0.85) {
    valueScore = 23;
    valueDetail = `€${Math.round(pricePerFoot).toLocaleString()}/ft — good value, below market average`;
    recommendations.push("Good price — still negotiate, sellers often have 10–15% margin");
  } else if (priceRatio <= 1.15) {
    valueScore = 18;
    valueDetail = `€${Math.round(pricePerFoot).toLocaleString()}/ft — market-rate pricing`;
  } else if (priceRatio <= 1.4) {
    valueScore = 12;
    valueDetail = `€${Math.round(pricePerFoot).toLocaleString()}/ft — above market (${Math.round((priceRatio - 1) * 100)}% over)`;
    recommendations.push("Price is above average — negotiate or verify premium features justify the cost");
  } else {
    valueScore = 5;
    valueDetail = `€${Math.round(pricePerFoot).toLocaleString()}/ft — significantly overpriced (${Math.round((priceRatio - 1) * 100)}% over market)`;
    recommendations.push("Price is well above market — strong negotiation recommended");
  }

  if (age > 20 && price > 100000) {
    valueScore = Math.max(0, valueScore - 5);
    recommendations.push("High price for an older boat — ensure condition justifies it");
  }

  categories.push({ name: "Value for Money", score: valueScore, maxScore: 25, details: valueDetail, icon: "💰" });

  // 4. Sails/Drive (max 20 for sailboats, max 15 for powerboats)
  if (boatType === "sailboat") {
    let sailsScore = 20;
    let sailsDetail = "";
    if (sails === "new") { sailsScore = 20; sailsDetail = "Sails are new or recently replaced"; }
    else if (sails === "average" || sails === "none") {
      sailsScore = 13;
      sailsDetail = "Sails serviceable but aging";
      recommendations.push("Plan for new sails in 2–4 years (€2,000–6,000 for a cruising set)");
      estimatedRepairCost += 1000;
    } else {
      sailsScore = 5;
      sailsDetail = "Sails worn out — replacement needed soon";
      recommendations.push("New sail set needed: mainsail €1,500–4,000, genoa €1,500–3,500");
      estimatedRepairCost += 5000;
    }

    // Standing rigging age check
    if (age > 12) {
      sailsScore = Math.max(0, sailsScore - 2);
      sailsDetail += " — rigging may be due for replacement";
      if (age > 15) {
        recommendations.push("Standing rigging replacement: €4,000–10,000 depending on boat size");
        estimatedRepairCost += 3000;
      }
    }

    categories.push({ name: "Sails & Rigging", score: sailsScore, maxScore: 20, details: sailsDetail, icon: "⛵" });
  } else {
    let driveScore = 15;
    let driveDetail = "";
    if (engine === "good") { driveScore = 15; driveDetail = "Drive system and propellers in good shape"; }
    else if (engine === "average") { driveScore = 9; driveDetail = "Drive system showing wear"; recommendations.push("Budget for outdrive/propeller service (€1,000–3,000)"); estimatedRepairCost += 1500; }
    else { driveScore = 4; driveDetail = "Drive system needs attention"; recommendations.push("Full drive system overhaul may be needed (€3,000–8,000)"); estimatedRepairCost += 5000; }
    categories.push({ name: "Drive & Propulsion", score: driveScore, maxScore: 15, details: driveDetail, icon: "🔧" });
  }

  // 5. Overall Condition (max 10) — inferred from hull, age, description
  let conditionScore = 10;
  let conditionDetail = "";
  if (hull === "good" && age <= 15) {
    conditionScore = 10;
    conditionDetail = `Well-maintained${hullMaterial ? ` ${hullMaterial}` : ""} hull, good overall condition`;
  } else if (hull === "good") {
    conditionScore = 7;
    conditionDetail = `Hull sound but age (${age}yr) means cosmetic and system wear likely`;
  } else if (hull === "osmosis") {
    conditionScore = 3;
    conditionDetail = "Osmosis detected — costly treatment needed";
    recommendations.push("Osmosis treatment: €3,000–8,000 depending on severity and boat size");
    estimatedRepairCost += 5000;
  } else {
    conditionScore = 1;
    conditionDetail = "Hull damage — structural integrity at risk";
    recommendations.push("Get a hull survey ASAP; repair costs €5,000–20,000+");
    estimatedRepairCost += 12000;
  }
  categories.push({ name: "Overall Condition", score: conditionScore, maxScore: 10, details: conditionDetail, icon: "🔍" });

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
  if (priceRatio <= 0.6) {
    priceAssessment = "🔍 Very low price — proceed with caution, inspect thoroughly";
  } else if (priceRatio <= 0.85) {
    priceAssessment = "👍 Below market — potential bargain if condition checks out";
  } else if (priceRatio <= 1.15) {
    priceAssessment = "✅ Market-rate pricing for this size and age";
  } else if (priceRatio <= 1.4) {
    priceAssessment = "💰 Above market — negotiate or verify premium features";
  } else {
    priceAssessment = "⚠️ Significantly overpriced for comparable boats";
  }

  totalScore = Math.max(0, Math.min(100, totalScore));
  const verdict = totalScore >= 80 ? "Great Deal" : totalScore >= 65 ? "Good Deal" : totalScore >= 50 ? "Fair Deal" : totalScore >= 35 ? "Below Average" : "Risky Purchase";
  const color = totalScore >= 65 ? "text-success" : totalScore >= 50 ? "text-warning" : "text-destructive";

  if (recommendations.length === 0) {
    recommendations.push("Boat looks solid! Still recommended to get a professional survey before committing.");
  }

  // Always add survey recommendation for boats over €20k
  if (price > 20000 && !recommendations.some(r => r.toLowerCase().includes("survey"))) {
    recommendations.push("Always get an independent marine survey for boats over €20,000");
  }

  return { score: totalScore, verdict, color, categories, recommendations, priceAssessment, estimatedRepairCost };
}
