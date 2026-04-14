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
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let batchSize = 5;
    try {
      const body = await req.json();
      if (body.batchSize) batchSize = Math.min(body.batchSize, 10);
    } catch {}

    // Get listings that need enrichment (no image)
    const fetchRes = await fetch(
      `${supabaseUrl}/rest/v1/cached_listings?image_url=is.null&price_eur=not.is.null&order=scraped_at.desc&limit=${batchSize}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
        },
      }
    );
    const listings = await fetchRes.json();
    
    if (!listings || listings.length === 0) {
      return new Response(JSON.stringify({ success: true, enriched: 0, message: "No listings to enrich" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Enriching ${listings.length} listings...`);
    let enriched = 0;

    for (const listing of listings) {
      try {
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url: listing.url,
            formats: ["extract"],
            extract: {
              schema: {
                type: "object",
                properties: {
                  images: { type: "array", items: { type: "string" }, description: "URLs of all boat photos on this page" },
                  description: { type: "string", description: "Full listing description, max 500 chars" },
                  hull_material: { type: "string" },
                  engine_hours: { type: "number" },
                  cabins: { type: "number" },
                  fuel_type: { type: "string" },
                  location: { type: "string" },
                },
              },
              prompt: "Extract boat listing details. Find ALL image URLs showing the boat.",
            },
          }),
        });

        if (!res.ok) {
          console.error(`Scrape failed for ${listing.url}: ${res.status}`);
          // Mark as processed to avoid retrying
          await fetch(`${supabaseUrl}/rest/v1/cached_listings?id=eq.${listing.id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ image_url: "none" }),
          });
          continue;
        }

        const data = await res.json();
        const ext = data?.data?.extract || {};

        const updates: Record<string, any> = {};
        if (ext.location) updates.location = ext.location.substring(0, 100);
        if (ext.images && ext.images.length > 0) {
          updates.image_url = ext.images[0];
          updates.image_urls = ext.images.slice(0, 10);
        }
        if (ext.description) updates.description = ext.description.substring(0, 500);
        if (ext.hull_material) updates.hull_material = ext.hull_material;
        if (ext.engine_hours && ext.engine_hours > 0) updates.engine_hours = ext.engine_hours;
        if (ext.cabins && ext.cabins > 0) updates.cabins = ext.cabins;
        if (ext.fuel_type) updates.fuel_type = ext.fuel_type;
        if (!updates.image_url) updates.image_url = "none";

        const patchRes = await fetch(`${supabaseUrl}/rest/v1/cached_listings?id=eq.${listing.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify(updates),
        });
        if (patchRes.ok) {
          enriched++;
          console.log(`Enriched: ${listing.url} (${updates.image_url !== 'none' ? 'with image' : 'no image'})`);
        }
      } catch (e) {
        console.error(`Error enriching ${listing.url}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, enriched, total: listings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Enrich error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
