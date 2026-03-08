import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, name, jobRole, status } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured. Email not sent.");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject =
      status === "selected"
        ? `Congratulations! You've been selected for ${jobRole}`
        : `Application Update for ${jobRole}`;

    const html =
      status === "selected"
        ? `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4338ca;">Congratulations, ${name}! 🎉</h1>
            <p>We're thrilled to let you know that you've been <strong>selected</strong> for the <strong>${jobRole}</strong> position.</p>
            <h3>Next Steps:</h3>
            <ol>
              <li>Our HR team will reach out within 2-3 business days</li>
              <li>Please prepare for a detailed interview</li>
              <li>Keep your documents ready for verification</li>
            </ol>
            <p>Best regards,<br/>The Hiring Team</p>
          </div>`
        : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Application Update</h1>
            <p>Dear ${name},</p>
            <p>Thank you for your interest in the <strong>${jobRole}</strong> position. After careful review, we've decided to move forward with other candidates.</p>
            <p>We encourage you to apply for future openings.</p>
            <p>Best regards,<br/>The Hiring Team</p>
          </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ATS Resume Checker <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: "Failed to send email", details: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-notification error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
