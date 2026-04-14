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
    const { model, length_feet, year } = await req.json();
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

    // Build a search query for similar boats
    const baseModel = model.replace(/\d{2,4}\s*(cruiser|sailing|yacht)?$/i, "").trim();
    const lengthRange = length_feet ? `${Math.round(length_feet - 3)}-${Math.round(length_feet + 3)} feet` : "";
    const yearRange = year ? `${year - 5}-${year + 5}` : "";
    const query = `${baseModel} sailboat for sale ${lengthRange} ${yearRange} EUR`.trim();

    console.log("Searching for similar boats:", query);

    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 5,
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

    // Extract useful info from search results
    const results = (searchData?.data || []).map((r: any) => ({
      title: r.title || "Unknown listing",
      url: r.url || "",
      description: r.description || r.markdown?.slice(0, 200) || "",
    })).filter((r: any) => r.url);

    console.log(`Found ${results.length} similar boats`);

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
