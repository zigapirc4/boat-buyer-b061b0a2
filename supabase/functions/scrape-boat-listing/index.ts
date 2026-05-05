import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Proxies to scrape-free (single canonical scrape + AI pipeline). */
async function invokeScrapeFreeForUrl(
  supabaseUrl: string,
  fallbackApiKey: string,
  url: string,
  options: Record<string, unknown>,
  authHeader: string | null,
  apiKeyHeader: string | null,
): Promise<{ success: boolean; data?: any; error?: string; source?: string }> {
  try {
    const authorization = authHeader && authHeader.trim().length > 0 ? authHeader : null;
    const apiKey = apiKeyHeader && apiKeyHeader.trim().length > 0 ? apiKeyHeader : fallbackApiKey;
    const forwardKeys = [
      "enableAiBrandModel",
      "enableAiMediaReview",
      "enableAiDataValidation",
      "listingConcurrency",
      "pageConcurrency",
      "fetchRetries",
      "upsertRetries",
      "pageStart",
      "pageEnd",
      "categoryStart",
      "categoryEnd",
      "maxListingsPerPage",
      "allowedSites",
      "blockedSites",
      "requestedUrls",
      "timeoutMs",
    ];
    const body: Record<string, unknown> = { urls: [url] };
    for (const k of forwardKeys) {
      if (k in options) body[k] = options[k];
    }
    const resp = await fetch(`${supabaseUrl}/functions/v1/scrape-free`, {
      method: "POST",
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      return { success: false, error: `scrape-free HTTP ${resp.status}: ${errBody.slice(0, 300)}` };
    }
    const payload = await resp.json().catch(() => null);
    if (!payload?.success) {
      return { success: false, error: payload?.error || "scrape-free returned unsuccessful response" };
    }
    const data = payload?.data || payload?.results?.[0]?.data || null;
    if (!data?.core || !data?.specs || !data?.raw) {
      return { success: false, error: "scrape-free returned invalid data shape" };
    }
    return { success: true, data, source: "scrape-free" };
  } catch (e) {
    return { success: false, error: `scrape-free invoke failed: ${e}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url : "";
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Delegating to scrape-free with canonical pipeline:", formattedUrl);
    const delegated = await invokeScrapeFreeForUrl(
      supabaseUrl,
      supabaseKey,
      formattedUrl,
      body && typeof body === "object" ? body : {},
      req.headers.get("authorization"),
      req.headers.get("apikey"),
    );
    if (!delegated.success || !delegated.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: delegated.error || "Could not process listing through scrape-free.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: delegated.data,
        source: delegated.source || "scrape-free",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
