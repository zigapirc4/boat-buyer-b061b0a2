const currentYear = new Date().getFullYear();

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

export function evaluate(
  year: number,
  price: number,
  lengthFt: number,
  engine: string,
  hull: string,
  sails: string
): EvalResult {
  const age = currentYear - year;
  const categories: EvalCategory[] = [];
  const recommendations: string[] = [];
  let estimatedRepairCost = 0;

  // 1. Age & Depreciation (max 25)
  let ageScore = 25;
  let ageDetail = "";
  if (age <= 5) { ageScore = 25; ageDetail = "Nearly new boat, minimal depreciation"; }
  else if (age <= 10) { ageScore = 22; ageDetail = "Modern boat in prime years"; }
  else if (age <= 15) { ageScore = 18; ageDetail = "Middle-aged, check for wear"; }
  else if (age <= 20) { ageScore = 14; ageDetail = "Aging — expect maintenance costs"; }
  else if (age <= 30) { ageScore = 8; ageDetail = "Old boat — significant upkeep needed"; recommendations.push("Commission a full marine survey before purchase"); }
  else { ageScore = 3; ageDetail = "Very old — likely needs extensive refit"; recommendations.push("Budget for a complete refit (€10,000–30,000+)"); estimatedRepairCost += 15000; }
  categories.push({ name: "Age & Depreciation", score: ageScore, maxScore: 25, details: ageDetail, icon: "⏳" });

  // 2. Engine (max 25)
  let engineScore = 25;
  let engineDetail = "";
  if (engine === "good") { engineScore = 25; engineDetail = "Engine in good working condition"; }
  else if (engine === "average") { engineScore = 15; engineDetail = "Engine functional but showing wear"; recommendations.push("Budget €1,000–3,000 for engine servicing"); estimatedRepairCost += 2000; }
  else { engineScore = 5; engineDetail = "Engine needs major repair or replacement"; recommendations.push("Engine replacement can cost €5,000–15,000"); estimatedRepairCost += 10000; }
  categories.push({ name: "Engine", score: engineScore, maxScore: 25, details: engineDetail, icon: "⚙️" });

  // 3. Hull (max 30)
  let hullScore = 30;
  let hullDetail = "";
  if (hull === "good") { hullScore = 30; hullDetail = "Hull in solid condition, no issues"; }
  else if (hull === "osmosis") { hullScore = 10; hullDetail = "Osmosis detected — costly treatment needed"; recommendations.push("Osmosis treatment costs €3,000–8,000 depending on severity"); estimatedRepairCost += 5000; }
  else { hullScore = 5; hullDetail = "Hull damage — structural integrity at risk"; recommendations.push("Get a hull survey ASAP; repair costs €5,000–20,000+"); estimatedRepairCost += 12000; }
  categories.push({ name: "Hull Integrity", score: hullScore, maxScore: 30, details: hullDetail, icon: "🚢" });

  // 4. Sails & Rigging (max 20)
  let sailsScore = 20;
  let sailsDetail = "";
  if (sails === "new") { sailsScore = 20; sailsDetail = "Sails are new or recently replaced"; }
  else if (sails === "average") { sailsScore = 14; sailsDetail = "Sails serviceable but aging"; recommendations.push("Plan for new sails in 2–4 years (€2,000–6,000)"); estimatedRepairCost += 1000; }
  else { sailsScore = 6; sailsDetail = "Sails worn out — replacement needed soon"; recommendations.push("New sail set needed: €3,000–8,000 depending on size"); estimatedRepairCost += 5000; }
  categories.push({ name: "Sails & Rigging", score: sailsScore, maxScore: 20, details: sailsDetail, icon: "⛵" });

  // Total
  let totalScore = ageScore + engineScore + hullScore + sailsScore;

  // Price assessment
  const pricePerFoot = price / lengthFt;
  let priceAssessment = "";
  if (age > 20 && price > 100000) {
    totalScore = Math.max(0, totalScore - 10);
    priceAssessment = "⚠️ Overpriced — very high price for the age of this boat";
    recommendations.push("Negotiate hard — price seems inflated for a boat this old");
  } else if (pricePerFoot > 4000) {
    priceAssessment = "💰 Premium pricing — verify condition justifies the cost";
  } else if (pricePerFoot > 2000) {
    priceAssessment = "✅ Market-rate pricing for this size";
  } else if (pricePerFoot > 1000) {
    priceAssessment = "👍 Below average price — could be a bargain or hidden issues";
    recommendations.push("Low price — investigate why the seller is discounting");
  } else {
    priceAssessment = "🔍 Very low price — proceed with extreme caution";
    recommendations.push("Suspiciously low price — likely hiding major problems");
  }

  totalScore = Math.max(0, Math.min(100, totalScore));
  const verdict = totalScore >= 80 ? "Good Deal" : totalScore >= 60 ? "Fair Deal" : totalScore >= 40 ? "Below Average" : "Risky Purchase";
  const color = totalScore >= 80 ? "text-success" : totalScore >= 60 ? "text-warning" : "text-destructive";

  if (recommendations.length === 0) {
    recommendations.push("Boat looks solid! Still recommended to get a professional survey.");
  }

  return { score: totalScore, verdict, color, categories, recommendations, priceAssessment, estimatedRepairCost };
}
