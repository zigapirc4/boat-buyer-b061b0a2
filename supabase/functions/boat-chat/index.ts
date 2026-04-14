import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userLocation } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query listings from DB to provide context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Analyze user's latest message to build a smart query
    const lastMsg = messages[messages.length - 1]?.content || "";
    const lowerMsg = lastMsg.toLowerCase();

    // Build dynamic filters from conversation
    let query = supabase
      .from("cached_listings")
      .select("title, url, boat_type, price_eur, year, length_feet, location, engine_info, description, hull_material, engine_hours, cabins, fuel_type, source, image_url")
      .not("price_eur", "is", null)
      .order("scraped_at", { ascending: false });

    // Auto-detect boat type from message
    if (lowerMsg.includes("sailboat") || lowerMsg.includes("sailing") || lowerMsg.includes("jedrilica") || lowerMsg.includes("vela")) {
      query = query.eq("boat_type", "sailboat");
    } else if (lowerMsg.includes("powerboat") || lowerMsg.includes("motor") || lowerMsg.includes("speed") || lowerMsg.includes("gliser") || lowerMsg.includes("motore")) {
      query = query.eq("boat_type", "powerboat");
    }

    // Price filters
    const underMatch = lowerMsg.match(/under\s*€?\s*([\d,]+)/i) || lowerMsg.match(/below\s*€?\s*([\d,]+)/i) || lowerMsg.match(/budget\s*(?:is\s*)?€?\s*([\d,]+)/i) || lowerMsg.match(/max\s*€?\s*([\d,]+)/i);
    if (underMatch) {
      const maxPrice = parseInt(underMatch[1].replace(/,/g, ""));
      query = query.lte("price_eur", maxPrice);
    }
    const overMatch = lowerMsg.match(/over\s*€?\s*([\d,]+)/i) || lowerMsg.match(/above\s*€?\s*([\d,]+)/i) || lowerMsg.match(/min\s*€?\s*([\d,]+)/i);
    if (overMatch) {
      const minPrice = parseInt(overMatch[1].replace(/,/g, ""));
      query = query.gte("price_eur", minPrice);
    }

    // Length filters
    const lengthMatch = lowerMsg.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*(?:feet|ft|foot)/i);
    if (lengthMatch) {
      query = query.gte("length_feet", parseInt(lengthMatch[1])).lte("length_feet", parseInt(lengthMatch[2]));
    }

    // Year filters
    const yearAfterMatch = lowerMsg.match(/(?:after|newer than|from)\s*(19\d{2}|20\d{2})/i);
    if (yearAfterMatch) {
      query = query.gte("year", parseInt(yearAfterMatch[1]));
    }

    const { data: listings } = await query.limit(100);

    // Also get marina data for cost questions
    let marinaContext = "";
    if (lowerMsg.includes("cost") || lowerMsg.includes("marina") || lowerMsg.includes("berth") || lowerMsg.includes("mooring")) {
      const { data: marinas } = await supabase
        .from("marinas")
        .select("name, country, region, price_per_meter_year")
        .not("price_per_meter_year", "is", null)
        .order("country")
        .limit(30);
      if (marinas && marinas.length > 0) {
        marinaContext = `\n\nMarina berth prices (EUR/meter/year):\n${marinas.map(m => `- ${m.name} (${m.country}${m.region ? ', ' + m.region : ''}): €${m.price_per_meter_year}/m/yr`).join("\n")}`;
      }
    }

    const listingSummary = listings && listings.length > 0
      ? listings.map(l =>
          `- ${l.title} | €${l.price_eur?.toLocaleString()} | ${l.year || "?"} | ${l.length_feet || "?"}ft | ${l.boat_type} | ${l.location || "?"} | ${l.hull_material || "?"} | ${l.engine_info || "?"} | ${l.engine_hours ? l.engine_hours + "h" : "?"} | ${l.cabins ? l.cabins + " cabins" : "?"} | ${l.source} | ${l.url}`
        ).join("\n")
      : "No listings match the current filters.";

    const systemPrompt = `You are BoatBuyer AI, an expert boat buying assistant. You help users find their perfect boat from our database of ${listings?.length || 0} matching listings.

CURRENT LISTINGS DATABASE:
${listingSummary}
${marinaContext}

USER LOCATION: ${userLocation || "Unknown"}

INSTRUCTIONS:
- Help users find boats matching their needs (budget, size, type, location, features)
- When recommending boats, always include the price, year, length, location and the listing URL
- Format boat recommendations clearly with key specs
- If asked about costs, estimate annual ownership costs (marina ~€50-100/m/yr in Med, maintenance ~2-5% of boat value/yr, insurance ~1-2%)
- Ask clarifying questions if the request is vague (budget? sailboat or powerboat? cruising area?)
- Be enthusiastic but honest about potential issues (age, engine hours, hull condition)
- Suggest nearby alternatives if exact match isn't found
- Keep responses concise and actionable
- When listing boats, format them as a numbered list with key details
- You can compare boats side by side if asked
- Always respond in the user's language`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("boat-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
