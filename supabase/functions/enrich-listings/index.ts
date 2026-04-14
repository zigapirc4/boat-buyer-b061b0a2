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

    let batchSize = 2;
    try {
      const body = await req.json();
      if (body.batchSize) batchSize = Math.min(body.batchSize, 5);
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
        // Use scrape with links format to get images quickly
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url: listing.url,
            formats: ["markdown"],
            onlyMainContent: true,
            timeout: 15000,
          }),
        });

        if (!res.ok) {
          console.error(`Scrape failed for ${listing.url}: ${res.status}`);
          await patchListing(supabaseUrl, supabaseServiceKey, listing.id, { image_url: "none" });
          continue;
        }

        const data = await res.json();
        const markdown = data?.data?.markdown || data?.markdown || "";
        const metadata = data?.data?.metadata || data?.metadata || {};

        // Extract image URLs from markdown ![alt](url) patterns
        const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
        const images: string[] = [];
        let match;
        while ((match = imgRegex.exec(markdown)) !== null) {
          const url = match[1];
          // Filter out icons, logos, tiny images
          if (!url.includes("logo") && !url.includes("icon") && !url.includes("avatar") && 
              !url.includes("favicon") && !url.includes("1x1") && !url.includes("pixel")) {
            images.push(url);
          }
        }

        // Also check og:image from metadata
        if (metadata.ogImage && !images.includes(metadata.ogImage)) {
          images.unshift(metadata.ogImage);
        }

        const updates: Record<string, any> = {};
        if (images.length > 0) {
          updates.image_url = images[0];
          updates.image_urls = images.slice(0, 10);
        } else {
          updates.image_url = "none";
        }

        // Try to extract description from first paragraph
        if (!listing.description && markdown) {
          const firstParagraph = markdown.split("\n").find((l: string) => l.length > 50 && !l.startsWith("#") && !l.startsWith("!"));
          if (firstParagraph) updates.description = firstParagraph.substring(0, 500);
        }

        await patchListing(supabaseUrl, supabaseServiceKey, listing.id, updates);
        enriched++;
        console.log(`Enriched: ${listing.url} (${images.length} images)`);
      } catch (e) {
        console.error(`Error enriching ${listing.url}:`, e);
        await patchListing(supabaseUrl, supabaseServiceKey, listing.id, { image_url: "none" });
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

async function patchListing(supabaseUrl: string, key: string, id: string, updates: Record<string, any>) {
  await fetch(`${supabaseUrl}/rest/v1/cached_listings?id=eq.${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(updates),
  });
}
