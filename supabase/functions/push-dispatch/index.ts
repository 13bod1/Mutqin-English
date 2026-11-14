// Supabase Edge Function: Web Push Dispatcher
// Deno runtime with pinned npm:web-push@3.6.7
// Strict GoTrue JWT verification, admin-only dispatch, SSRF-safe gateway filtering, and 410 cleanup.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "npm:web-push@3.6.7";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  targetRole?: string;
  recipientUserIds?: string[];
  tag?: string;
}

const ALLOWED_PUSH_HOST_PATTERN = /^https:\/\/(([a-zA-Z0-9-]+\.)*(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|notify\.windows\.com|web\.push\.apple\.com|push\.apple\.com))(\/.*)?$/i;
const PRIVATE_HOST_PATTERN = /:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|0\.0\.0\.0|\[::1\])/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const port = Number(Deno.env.get("PORT")) || 8000;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@adelmostafa.com";

    // 1. Check server configuration gates
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing Supabase credentials" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID credentials not configured on server (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY missing)" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure WebPush library
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // 2. Authenticate caller via GoTrue JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid JWT" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Authorize caller: profiles role must be admin or super_admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !["admin", "super_admin"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: push dispatch requires admin or super_admin role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validate runtime request body
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rawBody || typeof rawBody !== "object") {
      return new Response(JSON.stringify({ error: "Body must be an object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, body, url, targetRole, recipientUserIds, tag } = rawBody as PushPayload;
    if (typeof title !== "string" || !title.trim() || title.length > 200 || typeof body !== "string" || !body.trim() || body.length > 2000) {
      return new Response(
        JSON.stringify({ error: "title and body must be non-empty strings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetRole !== undefined) return Response.json({error:'Role targeting is not supported; supply explicit recipients'}, {status:400, headers:corsHeaders});
    if (url !== undefined && (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || url.includes('\\') || /[\u0000-\u001f\u007f]/.test(url))) return Response.json({error:'Invalid notification destination'}, {status:400, headers:corsHeaders});
    if (recipientUserIds !== undefined && (!Array.isArray(recipientUserIds) || recipientUserIds.length > 500 || recipientUserIds.some(id => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)))) return Response.json({error:'Invalid recipient IDs'}, {status:400, headers:corsHeaders});

    // 5. Query active subscriptions
    let query = supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth, user_id").limit(500);

    if (Array.isArray(recipientUserIds) && recipientUserIds.length === 0) return Response.json({success:true,total:0,sent:0,failed:0,cleanedUp:0}, {headers:corsHeaders});
    if (Array.isArray(recipientUserIds) && recipientUserIds.length > 0) {
      query = query.in("user_id", recipientUserIds);
    }

    const { data: subscriptions, error: subsError } = await query;
    if (subsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions", details: subsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total: 0, sent: 0, failed: 0, cleanedUp: 0, message: "No active subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Dispatch with SSRF protection, timeout, and 410 cleanup
    const notificationPayload = JSON.stringify({
      title: title.trim(),
      body: body.trim(),
      url: url || "/",
      tag: tag || "mutqin-notice",
    });

    let sentCount = 0;
    let failedCount = 0;
    let cleanedUpCount = 0;
    const goneEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        // SSRF Host Check
        if (typeof sub.endpoint !== "string" || !ALLOWED_PUSH_HOST_PATTERN.test(sub.endpoint) || PRIVATE_HOST_PATTERN.test(sub.endpoint)) {
          failedCount++;
          return;
        }
        try {
          const endpointUrl = new URL(sub.endpoint);
          if (endpointUrl.protocol !== "https:" || endpointUrl.username || endpointUrl.password) {
            failedCount++;
            return;
          }
        } catch {
          failedCount++;
          return;
        }

        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          // Bounded push dispatch timeout (7 seconds)
          await Promise.race([
            webpush.sendNotification(pushSub, notificationPayload, { timeout: 6500, TTL: 60 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Push gateway dispatch timeout")), 7000)),
          ]);
          sentCount++;
        } catch (err: any) {
          failedCount++;
          const statusCode = err?.statusCode;
          // Status 404 or 410 indicates endpoint expired/unsubscribed
          if (statusCode === 410 || statusCode === 404) {
            goneEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    // 7. Cleanup gone endpoints
    if (goneEndpoints.length > 0) {
      const { error: delError } = await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", goneEndpoints);
      if (!delError) {
        cleanedUpCount = goneEndpoints.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: subscriptions.length,
        sent: sentCount,
        failed: failedCount,
        cleanedUp: cleanedUpCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_unexpectedError: any) {
    return new Response(
      JSON.stringify({ error: "Internal dispatch error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}, { port });
