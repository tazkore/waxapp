// send-push-notification — envía Web Push a una o varias suscripciones
// Payload: { title, body, url?, tag?, user_ids?, to_all? }
// Requiere: VAPID_PRIVATE_KEY y VAPID_PUBLIC_KEY en Supabase Vault
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// ── VAPID helpers (sin librerías externas) ─────────────────────────────────
function base64UrlToUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function buildVapidAuth(
  audience: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: new URL(audience).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "mailto:admin@waxapp.mx",
  };

  const enc = new TextEncoder();
  const headerB64 = uint8ToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ToBase64Url(enc.encode(JSON.stringify(payload)));
  const toSign = `${headerB64}.${payloadB64}`;

  const privKeyBytes = base64UrlToUint8(vapidPrivateKey);
  const privKey = await crypto.subtle.importKey(
    "raw",
    privKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privKey,
    enc.encode(toSign),
  );

  const sig = uint8ToBase64Url(new Uint8Array(sigBytes));
  const token = `${toSign}.${sig}`;
  return `vapid t=${token},k=${vapidPublicKey}`;
}

async function sendOne(
  subscription: { endpoint: string; p256dh: string | null; auth: string | null },
  payloadStr: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const authorization = await buildVapidAuth(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
    );

    // Cifrar con ECDH + AES-GCM si hay claves del cliente
    let body: BodyInit = payloadStr;
    const headers: Record<string, string> = {
      Authorization: authorization,
      TTL: "86400",
    };

    if (subscription.p256dh && subscription.auth) {
      // Usar Content-Encoding: aes128gcm (RFC 8291)
      const enc = new TextEncoder();
      const clientPublicKey = base64UrlToUint8(subscription.p256dh);
      const clientAuth = base64UrlToUint8(subscription.auth);

      // Generar par de claves efímeras del servidor
      const serverKeyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"],
      );

      const serverPublicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey("raw", serverKeyPair.publicKey),
      );

      const clientKey = await crypto.subtle.importKey(
        "raw",
        clientPublicKey,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        [],
      );

      const sharedBits = await crypto.subtle.deriveBits(
        { name: "ECDH", public: clientKey },
        serverKeyPair.privateKey,
        256,
      );

      // HKDF para derivar IKM
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const ikmInfo = new Uint8Array([
        ...enc.encode("WebPush: info\0"),
        ...clientPublicKey,
        ...serverPublicKeyRaw,
      ]);

      const hkdfKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveBits"]);
      const ikm = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt: clientAuth, info: ikmInfo },
        hkdfKey,
        256,
      );

      const contentKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
      const cekBits = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt, info: enc.encode("Content-Encoding: aes128gcm\0") },
        contentKey,
        128,
      );
      const nonceBits = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt, info: enc.encode("Content-Encoding: nonce\0") },
        contentKey,
        96,
      );

      const aesKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
      const plaintext = enc.encode(payloadStr);
      // Add 2-byte padding length (0) + 1-byte delimiter (0x02)
      const padded = new Uint8Array([...plaintext, 0x02]);
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonceBits },
        aesKey,
        padded,
      );

      // Build RFC 8291 header: salt (16) + rs (4) + keyid_len (1) + keyid
      const rs = 4096;
      const rsBytes = new Uint8Array(4);
      new DataView(rsBytes.buffer).setUint32(0, rs, false);
      const encBody = new Uint8Array([
        ...salt,
        ...rsBytes,
        serverPublicKeyRaw.length,
        ...serverPublicKeyRaw,
        ...new Uint8Array(ciphertext),
      ]);

      body = encBody;
      headers["Content-Encoding"] = "aes128gcm";
      headers["Content-Type"] = "application/octet-stream";
    } else {
      headers["Content-Type"] = "text/plain;charset=UTF-8";
    }

    const res = await fetch(subscription.endpoint, { method: "POST", headers, body });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || Deno.env.get("VITE_VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configurados en Supabase Vault" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { title, body, url = "/", tag, user_ids, to_all = false } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title y body son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener suscripciones
    let query = supabase.from("push_subscriptions").select("*").eq("active", true);
    if (!to_all && Array.isArray(user_ids) && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    }
    const { data: subs, error: subErr } = await query;
    if (subErr) throw new Error(subErr.message);
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "Sin suscriptores activos" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payloadStr = JSON.stringify({ title, body, data: { url }, tag });
    const results = await Promise.allSettled(
      subs.map((s) =>
        sendOne({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payloadStr, vapidPublicKey, vapidPrivateKey)
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;
    const failed = results.length - sent;

    // Desactivar suscripciones con 410 Gone (usuario desuscrito)
    const goneEndpoints: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && (r.value as { status?: number }).status === 410) {
        goneEndpoints.push(subs[i].endpoint);
      }
    });
    if (goneEndpoints.length > 0) {
      await supabase.from("push_subscriptions").update({ active: false }).in("endpoint", goneEndpoints);
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, total: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[send-push-notification] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
