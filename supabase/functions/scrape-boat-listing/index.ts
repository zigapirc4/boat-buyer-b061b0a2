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
        formats: ["extract"],
        extract: {
          schema: {
            type: "object",
            properties: {
              boat_model: { type: "string", description: "The boat model name, e.g. 'Bavaria 37 Cruiser'" },
              year: { type: "number", description: "Year the boat was built" },
              price_eur: { type: "number", description: "Price in EUR (convert if in other currency)" },
              length_feet: { type: "number", description: "Length of the boat in feet" },
              engine_condition: {
                type: "string",
                enum: ["good", "average", "bad"],
                description: "Engine condition. Infer from description if not explicit. Default to average.",
              },
              hull_condition: {
                type: "string",
                enum: ["good", "osmosis", "damaged"],
                description: "Hull condition. Look for mentions of osmosis, blistering, damage. Default to good.",
              },
              sails_condition: {
                type: "string",
                enum: ["new", "average", "worn"],
                description: "Sails condition. Infer from age/description if not explicit. Default to average.",
              },
            },
            required: ["boat_model"],
          },
          prompt:
            "Extract the sailboat listing details. If a field is not explicitly mentioned, make a reasonable inference based on the boat's age, price, and description. For conditions, default to 'average'/'good' if no negative indicators are found.",
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
