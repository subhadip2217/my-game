const corsHeaders = {
  "Access-Control-Allow-Origin": "https://subhadip2217.github.io",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Vary": "Origin",
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (origin !== "https://subhadip2217.github.io") {
    return Response.json({ error: "Origin not allowed." }, { status: 403, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });
  }

  const turnKeyId = Deno.env.get("CLOUDFLARE_TURN_KEY_ID");
  const turnApiToken = Deno.env.get("CLOUDFLARE_TURN_API_TOKEN");
  if (!turnKeyId || !turnApiToken) {
    return Response.json(
      { error: "TURN service setup is incomplete. Add CLOUDFLARE_TURN_KEY_ID and CLOUDFLARE_TURN_API_TOKEN to Supabase Edge Function secrets." },
      { status: 503, headers: corsHeaders },
    );
  }

  try {
    const upstream = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(turnKeyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${turnApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 14400 }),
      },
    );
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !Array.isArray(payload.iceServers)) {
      console.error("Cloudflare TURN credential request failed:", upstream.status);
      return Response.json(
        { error: "Could not obtain TURN credentials. Check the Cloudflare TURN key and API token." },
        { status: 502, headers: corsHeaders },
      );
    }
    // Browser trickle-ICE is enabled; remove alternate port 53 URLs that commonly time out.
    const iceServers = payload.iceServers.map((server: any) => ({
      ...server,
      urls: Array.isArray(server.urls)
        ? server.urls.filter((url: string) => !/:53(?:\\?|$)/.test(url))
        : server.urls,
    }));
    return Response.json({ iceServers }, {
      headers: { ...corsHeaders, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("TURN credential service error:", error);
    return Response.json(
      { error: "TURN credential service is temporarily unavailable." },
      { status: 502, headers: corsHeaders },
    );
  }
});
