export type NegotiationTone = "friendly" | "neutral" | "firm";
export type NegotiationLanguage = "en" | "sl" | "it";

export interface CounterOfferSimulation {
  decision: "accept" | "counter" | "walk-away";
  guidance: string;
  deltaToWalkAway: number;
}

export interface NegotiationScriptInput {
  lang: NegotiationLanguage;
  tone: NegotiationTone;
  boatTitle: string;
  listingPrice: number;
  fairLow: number;
  fairHigh: number;
  offer: number;
  walkAwayPrice: number;
  anchors: string[];
}

export interface NegotiationScriptOutput {
  subject: string;
  emailBody: string;
  whatsappText: string;
}

export function simulateCounterOffer(counterPrice: number, walkAwayPrice: number): CounterOfferSimulation {
  const delta = Math.round(walkAwayPrice - counterPrice);
  if (counterPrice <= walkAwayPrice * 0.97) {
    return {
      decision: "accept",
      guidance: "Counter offer is within acceptable range. You can proceed if survey confirms condition.",
      deltaToWalkAway: delta,
    };
  }
  if (counterPrice <= walkAwayPrice) {
    return {
      decision: "counter",
      guidance: "Counter offer is close. Reply with your realistic offer and ask for documented condition proof.",
      deltaToWalkAway: delta,
    };
  }
  return {
    decision: "walk-away",
    guidance: "Counter offer is above your walk-away limit. Best move is to hold your cap or step away.",
    deltaToWalkAway: delta,
  };
}

type ToneBlocks = {
  intro: string;
  rationaleLead: string;
  closing: string;
  whatsappLead: string;
};

const toneBlocks: Record<NegotiationTone, Record<NegotiationLanguage, ToneBlocks>> = {
  friendly: {
    en: {
      intro: "I really like this boat and I would love to move forward quickly if we can align on price.",
      rationaleLead: "I reviewed the listing carefully and based my offer on realistic market and condition factors:",
      closing: "If this works for you, I can proceed quickly with viewing/survey and next steps.",
      whatsappLead: "I really like the boat and can offer",
    },
    sl: {
      intro: "Ta barka mi je res všeč in z veseljem bi hitro nadaljeval, če se uskladimo pri ceni.",
      rationaleLead: "Oglas sem podrobno pregledal in ponudbo pripravil na podlagi realnih tržnih in tehničnih dejavnikov:",
      closing: "Če vam ustreza, lahko hitro nadaljujem z ogledom/surveyjem in naslednjimi koraki.",
      whatsappLead: "Barka mi je res všeč in lahko ponudim",
    },
    it: {
      intro: "Questa barca mi piace davvero e sarei felice di procedere rapidamente se troviamo un accordo sul prezzo.",
      rationaleLead: "Ho analizzato attentamente l'annuncio e ho basato la mia offerta su fattori di mercato e condizioni reali:",
      closing: "Se per voi va bene, posso procedere rapidamente con visita/perizia e passi successivi.",
      whatsappLead: "La barca mi piace davvero e posso offrire",
    },
  },
  neutral: {
    en: {
      intro: "Thank you for the listing details. I prepared a serious offer based on current market and condition inputs.",
      rationaleLead: "My offer is supported by the following points:",
      closing: "If you are open to this number, I can move ahead without delay.",
      whatsappLead: "Based on market and condition, I can offer",
    },
    sl: {
      intro: "Hvala za informacije v oglasu. Pripravil sem resno ponudbo na podlagi trga in stanja barke.",
      rationaleLead: "Ponudba temelji na naslednjih argumentih:",
      closing: "Če ste odprti za to ceno, lahko nadaljujem brez odlašanja.",
      whatsappLead: "Na podlagi trga in stanja lahko ponudim",
    },
    it: {
      intro: "Grazie per i dettagli dell'annuncio. Ho preparato un'offerta seria basata su mercato e condizioni tecniche.",
      rationaleLead: "La mia offerta è supportata dai seguenti punti:",
      closing: "Se siete disponibili su questa cifra, posso procedere senza ritardi.",
      whatsappLead: "In base a mercato e condizioni posso offrire",
    },
  },
  firm: {
    en: {
      intro: "After reviewing the market and condition risk, this is my final justified offer.",
      rationaleLead: "I am anchoring this offer on these concrete points:",
      closing: "I can proceed only at this level. If this is acceptable, we can close quickly.",
      whatsappLead: "Given market and condition risk, my final offer is",
    },
    sl: {
      intro: "Po pregledu trga in tehničnih tveganj je to moja končna utemeljena ponudba.",
      rationaleLead: "Ponudbo utemeljujem z naslednjimi konkretnimi točkami:",
      closing: "Nadaljujem lahko le pri tej ceni. Če vam ustreza, lahko hitro zaključimo.",
      whatsappLead: "Glede na trg in tehnična tveganja je moja končna ponudba",
    },
    it: {
      intro: "Dopo analisi di mercato e rischio tecnico, questa è la mia offerta finale motivata.",
      rationaleLead: "Sto ancorando questa offerta ai seguenti punti concreti:",
      closing: "Posso procedere solo a questo livello. Se va bene, possiamo chiudere rapidamente.",
      whatsappLead: "Considerando mercato e rischio tecnico, la mia offerta finale è",
    },
  },
};

export function generateNegotiationScript(input: NegotiationScriptInput): NegotiationScriptOutput {
  const points = input.anchors.slice(0, 3).map((p) => `- ${p}`).join("\n");
  const tone = toneBlocks[input.tone][input.lang];

  if (input.lang === "sl") {
    const subject = `Ponudba za ${input.boatTitle}`;
    const emailBody = `Pozdravljeni,\n\n${tone.intro}\n\nZa oglas ${input.boatTitle} je moja ponudba €${input.offer.toLocaleString()}.\n\n${tone.rationaleLead}\n${points || "- Tržna primerjava in stanje barke."}\n\n${tone.closing}\n\nLep pozdrav`;
    const whatsappText = `Živjo! ${tone.whatsappLead} €${input.offer.toLocaleString()} za ${input.boatTitle}.`;
    return { subject, emailBody, whatsappText };
  }

  if (input.lang === "it") {
    const subject = `Offerta per ${input.boatTitle}`;
    const emailBody = `Buongiorno,\n\n${tone.intro}\n\nPer ${input.boatTitle}, la mia offerta è €${input.offer.toLocaleString()}.\n\n${tone.rationaleLead}\n${points || "- Confronto di mercato e stato tecnico dell'imbarcazione."}\n\n${tone.closing}\n\nCordiali saluti`;
    const whatsappText = `Ciao! ${tone.whatsappLead} €${input.offer.toLocaleString()} per ${input.boatTitle}.`;
    return { subject, emailBody, whatsappText };
  }

  const subject = `Offer for ${input.boatTitle}`;
  const emailBody = `Hi,\n\n${tone.intro}\n\nFor ${input.boatTitle}, my offer is €${input.offer.toLocaleString()}.\n\n${tone.rationaleLead}\n${points || "- Market comparison and condition risk."}\n\n${tone.closing}\n\nBest regards`;
  const whatsappText = `Hi! ${tone.whatsappLead} €${input.offer.toLocaleString()} for ${input.boatTitle}.`;
  return { subject, emailBody, whatsappText };
}
