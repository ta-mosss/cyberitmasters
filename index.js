/**
 * CITM contact form backend.
 *
 * Deploy: wrangler deploy (from the worker/ directory)
 * Requires a secret: wrangler secret put RESEND_API_KEY
 * Requires two vars in wrangler.toml: TO_EMAIL, FROM_EMAIL (see wrangler.toml)
 *
 * Point the frontend's fetch() at this Worker's URL once deployed
 * (e.g. https://citm-contact.<your-subdomain>.workers.dev).
 */

const ALLOWED_ORIGINS = [
  "https://www.cyberitmasters.co.za",
  "https://cyberitmasters.co.za",
  // Add your Cloudflare Pages / Vercel / Netlify preview domain(s) here while testing, e.g.:
  // "https://citm-website.pages.dev",
];

const SERVICES = [
  "Managed IT Services",
  "IT Solutions & Infrastructure",
  "Cybersecurity",
  "Microsoft 365 / Cloud",
  "Website Development",
  "Application Development",
  "DevOps / Cloud Engineering",
  "IT Procurement",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body" }, 400, origin);
    }

    const { name, email, company, service, message, website } = body || {};

    // Honeypot: real users never fill this hidden field. Silently accept
    // and drop, so the bot's script sees "success" and doesn't retry/adapt.
    if (website) {
      return json({ ok: true }, 200, origin);
    }

    // Server-side validation — mirrors the client-side checks, since those
    // are trivially bypassed by anything not using the actual form UI.
    const errors = [];
    if (!name || typeof name !== "string" || name.trim().length < 2) errors.push("name");
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email");
    if (!service || !SERVICES.includes(service)) errors.push("service");
    if (!message || typeof message !== "string" || message.trim().length < 10) errors.push("message");
    if (name && name.length > 200) errors.push("name");
    if (message && message.length > 5000) errors.push("message");

    if (errors.length) {
      return json({ error: "Invalid fields", fields: errors }, 422, origin);
    }

    const safe = {
      name: escapeHtml(name.trim()),
      email: escapeHtml(email.trim()),
      company: escapeHtml((company || "").trim()) || "—",
      service: escapeHtml(service),
      message: escapeHtml(message.trim()).replace(/\n/g, "<br>"),
    };

    try {
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL,
          to: env.TO_EMAIL,
          reply_to: email.trim(),
          subject: `Cyber I.T Masters enquiry — ${service}`,
          html: `
            <p><strong>Name:</strong> ${safe.name}</p>
            <p><strong>Company:</strong> ${safe.company}</p>
            <p><strong>Email:</strong> ${safe.email}</p>
            <p><strong>Service:</strong> ${safe.service}</p>
            <p><strong>Message:</strong><br>${safe.message}</p>
          `,
        }),
      });

      if (!resendResp.ok) {
        const errText = await resendResp.text();
        console.error("Resend error:", errText);
        return json({ error: "Failed to send" }, 502, origin);
      }
    } catch (e) {
      console.error("Worker error:", e);
      return json({ error: "Failed to send" }, 502, origin);
    }

    return json({ ok: true }, 200, origin);
  },
};
