import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["extract", "markdown"],
        extract: {
          schema: {
            type: "object",
            properties: {
              boat_model: { type: "string", description: "Full boat model name, e.g. 'Hanse 311', 'Beneteau Oceanis 40', 'Bavaria 37 Cruiser', 'Fairline Targa 43'" },
              boat_type: { type: "string", enum: ["sailboat", "powerboat"], description: "Whether the boat is a sailboat or a powerboat/motorboat" },
              year: { type: "number", description: "Year the boat was built" },
              price_eur: { type: "number", description: "Price in EUR. Convert from other currencies if needed using approximate rates." },
              price_currency: { type: "string", description: "Original currency of the listing price, e.g. EUR, GBP, USD, CHF" },
              length_feet: { type: "number", description: "Length overall (LOA) in feet. Convert from meters if needed (multiply by 3.281)." },
              beam_feet: { type: "number", description: "Beam (width) in feet" },
              draft_feet: { type: "number", description: "Draft in feet" },
              displacement_kg: { type: "number", description: "Displacement/weight in kg" },
              engine_make: { type: "string", description: "Engine manufacturer, e.g. Volvo Penta, Yanmar, Mercury" },
              engine_model: { type: "string", description: "Engine model name/number" },
              engine_hp: { type: "number", description: "Engine horsepower" },
              engine_year: { type: "number", description: "Year the engine was built or installed" },
              engine_hours: { type: "number", description: "Total engine hours logged" },
              engine_type: { type: "string", enum: ["diesel", "petrol", "electric", "hybrid", "outboard", "unknown"], description: "Engine fuel type" },
              num_engines: { type: "number", description: "Number of engines. Default 1 if not stated." },
              engine_condition: { type: "string", enum: ["good", "average", "bad"], description: "Engine condition based on hours, age, description" },
              hull_material: { type: "string", enum: ["fiberglass", "steel", "aluminum", "wood", "composite", "other"], description: "Hull construction material" },
              hull_condition: { type: "string", enum: ["good", "osmosis", "damaged"], description: "Hull condition" },
              sails_condition: { type: "string", enum: ["new", "average", "worn", "none"], description: "Sails condition. Use 'none' for powerboats." },
              sail_area_sqm: { type: "number", description: "Total sail area in square meters (sailboats only)" },
              location: { type: "string", description: "Location/marina where the boat is located" },
              country: { type: "string", description: "Country where the boat is located" },
              images: { type: "array", items: { type: "string" }, description: "Up to 5 image URLs of the boat" },
              cabins: { type: "number", description: "Number of cabins" },
              berths: { type: "number", description: "Number of berths/sleeping positions" },
              heads: { type: "number", description: "Number of heads/bathrooms" },
              fuel_tank_liters: { type: "number", description: "Fuel tank capacity in liters" },
              water_tank_liters: { type: "number", description: "Water tank capacity in liters" },
              description_summary: { type: "string", description: "A 2-3 sentence summary of the boat's key selling points and any issues mentioned" },
              equipment_highlights: { type: "array", items: { type: "string" }, description: "Notable equipment: autopilot, GPS, radar, bow thruster, generator, air conditioning, watermaker, davits, etc." },
              recent_work: { type: "array", items: { type: "string" }, description: "Any recently completed maintenance, upgrades, or repairs mentioned" },
              known_issues: { type: "array", items: { type: "string" }, description: "Any problems, defects, or needed repairs mentioned in the listing" },
            },
            required: ["boat_model"],
          },
          prompt:
            "Extract ALL details from this boat listing. Read the ENTIRE description carefully. This could be a sailboat OR a powerboat/motorboat. Extract engine hours and engine year if available. Look for mentions of recent maintenance, known issues, equipment. For images, extract the main boat photo URLs. Infer conditions from context clues.",
        },
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeRes.json();

    if (!scrapeRes.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || "Failed to scrape listing" }),
        { status: scrapeRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = scrapeData?.data?.extract || scrapeData?.extract || {};
    console.log("Extracted data:", JSON.stringify(extracted));

    // Persist enriched data back to cached_listings so future users get it instantly
    try {
      const updates: Record<string, any> = {};
      if (extracted.price_eur) updates.price_eur = extracted.price_eur;
      if (extracted.year) updates.year = extracted.year;
      if (extracted.length_feet) updates.length_feet = extracted.length_feet;
      if (extracted.boat_type) updates.boat_type = extracted.boat_type;
      if (extracted.hull_material) updates.hull_material = extracted.hull_material;
      if (extracted.engine_hours) updates.engine_hours = extracted.engine_hours;
      if (extracted.cabins) updates.cabins = extracted.cabins;
      if (extracted.engine_type) updates.fuel_type = extracted.engine_type;
      if (extracted.location) updates.location = extracted.location;
      if (extracted.description_summary) updates.description = extracted.description_summary;
      if (extracted.images?.length) {
        updates.image_urls = extracted.images;
        if (!updates.image_url) updates.image_url = extracted.images[0];
      }
      if (extracted.engine_make) {
        const engineParts = [extracted.engine_make, extracted.engine_model, extracted.engine_hp ? `${extracted.engine_hp}hp` : null].filter(Boolean);
        updates.engine_info = engineParts.join(" ");
      }

      if (Object.keys(updates).length > 0) {
        // Only update fields that are currently null in the DB (don't overwrite existing data)
        const patchResp = await fetch(
          `${supabaseUrl}/rest/v1/cached_listings?url=eq.${encodeURIComponent(formattedUrl)}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              apikey: supabaseKey,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify(updates),
          }
        );
        if (!patchResp.ok) {
          console.error("Failed to persist enriched data:", await patchResp.text());
        } else {
          console.log("Persisted enriched data for:", formattedUrl);
        }
      }
    } catch (e) {
      console.error("Error persisting enriched data:", e);
    }

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
