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
    const { model, length_feet, year, boat_type } = await req.json();
    if (!model) {
      return new Response(JSON.stringify({ success: false, error: "Model is required" }), {
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

    const typeLabel = boat_type === "powerboat" ? "powerboat motorboat" : "sailboat";
    const lengthRange = length_feet ? `${Math.round(length_feet - 4)}-${Math.round(length_feet + 4)} feet` : "";
    const yearRange = year ? `${year - 5}-${year + 5}` : "";
    const query = `"${model}" ${typeLabel} for sale ${lengthRange} ${yearRange} price EUR`.trim();

    console.log("Searching for similar boats:", query);

    // Search with scrapeOptions to get content from each result
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 6,
        scrapeOptions: {
          formats: ["extract"],
          extract: {
            schema: {
              type: "object",
              properties: {
                boat_name: { type: "string", description: "Boat model name" },
                price_eur: { type: "number", description: "Price in EUR" },
                year: { type: "number", description: "Year built" },
                length_feet: { type: "number", description: "Length in feet" },
                location: { type: "string", description: "Where the boat is located" },
                image_url: { type: "string", description: "Main photo URL of the boat" },
                engine_info: { type: "string", description: "Brief engine details (make, HP, hours)" },
                condition_summary: { type: "string", description: "One-sentence summary of the boat's condition" },
              },
            },
            prompt: "Extract boat listing details. Get the price in EUR, location, and the main boat image URL. Summarize engine and condition briefly.",
          },
        },
      }),
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.error("Firecrawl search error:", searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || "Search failed" }),
        { status: searchRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = (searchData?.data || []).map((r: any) => {
      const extract = r.extract || {};
      return {
        title: extract.boat_name || r.title || "Unknown listing",
        url: r.url || "",
        description: extract.condition_summary || r.description || "",
        price_eur: extract.price_eur || null,
        year: extract.year || null,
        length_feet: extract.length_feet || null,
        location: extract.location || null,
        image_url: extract.image_url || null,
        engine_info: extract.engine_info || null,
      };
    }).filter((r: any) => r.url);

    console.log(`Found ${results.length} similar boats with details`);

    return new Response(JSON.stringify({ success: true, data: results }), {
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
