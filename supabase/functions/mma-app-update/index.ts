import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://localhost",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });
const bucket = "mma-app-updates";

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Method unavailable" }, 405);
  try {
    const { token, installed, download } = await request.json();
    if (typeof token !== "string" || !token || token.length > 4096 || !Number.isSafeInteger(installed) || installed < 1) {
      return reply({ error: "Invalid request" }, 400);
    }
    const server = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: session, error: denied } = await server.rpc("mma548_context", { p_token: token });
    if (denied || !["readymade", "grey", "both"].includes(session?.access)) return reply({ error: "Sign in again" }, 401);
    const storage = server.storage.from(bucket);
    const { data: manifest, error: unavailable } = await storage.download("latest.json");
    if (unavailable || !manifest) return reply({ error: "Update service unavailable" }, 503);
    const { versionCode, versionName } = JSON.parse(await manifest.text());
    if (!Number.isSafeInteger(versionCode) || versionCode < 687 || typeof versionName !== "string" || !/^\d+\.\d+\.\d+$/.test(versionName)) {
      return reply({ error: "Update service unavailable" }, 503);
    }
    if (versionCode <= installed) return reply({ available: false });
    if (download !== true) return reply({ available: true, versionName });
    const { data: link, error } = await storage.createSignedUrl(`MMA_Tradelink_V${versionCode}.apk`, 300, {
      download: `MMA_Tradelink_V${versionCode}.apk`,
    });
    if (error || !link) return reply({ error: "Download unavailable" }, 503);
    return reply({ available: true, versionName, url: link.signedUrl });
  } catch {
    return reply({ error: "Update service unavailable" }, 503);
  }
});
