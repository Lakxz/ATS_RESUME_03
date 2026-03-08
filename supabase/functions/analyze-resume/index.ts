import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeId, filePath, jobRole } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user from request
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(token);
      userId = user?.id ?? null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download resume from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to download resume" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text (simple approach for text-based content)
    const text = await fileData.text();

    // Fetch admin keywords
    const { data: keywords } = await supabase.from("keywords").select("*");
    const keywordList = keywords?.map((k: any) => `${k.keyword} (weight: ${k.weight}, category: ${k.category})`) || [];

    if (!lovableApiKey) {
      // Fallback: simple keyword matching without AI
      const resumeLower = text.toLowerCase();
      const matched: string[] = [];
      const missing: string[] = [];
      let totalWeight = 0;
      let matchedWeight = 0;

      (keywords || []).forEach((k: any) => {
        totalWeight += k.weight;
        if (resumeLower.includes(k.keyword.toLowerCase())) {
          matched.push(k.keyword);
          matchedWeight += k.weight;
        } else {
          missing.push(k.keyword);
        }
      });

      const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

      await supabase.from("resume_analyses").insert({
        resume_id: resumeId,
        user_id: userId,
        ats_score: score,
        matched_keywords: matched,
        missing_keywords: missing,
        suggestions: ["Add missing keywords to your resume to improve your score"],
        raw_text: text.substring(0, 5000),
      });

      return new Response(JSON.stringify({ score, matched, missing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI-powered analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an ATS (Applicant Tracking System) resume analyzer. Analyze the resume text against the provided keywords and return a structured analysis.`,
          },
          {
            role: "user",
            content: `Analyze this resume for the job role "${jobRole}".

Keywords to check (with weights): ${keywordList.join(", ")}

Resume text:
${text.substring(0, 8000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "ats_analysis",
              description: "Return ATS resume analysis results",
              parameters: {
                type: "object",
                properties: {
                  ats_score: {
                    type: "number",
                    description: "ATS score from 0-100 based on keyword match, relevance, and resume completeness",
                  },
                  matched_keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Keywords found in the resume",
                  },
                  missing_keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Important keywords not found in the resume",
                  },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific actionable suggestions to improve the resume for this job role",
                  },
                },
                required: ["ats_score", "matched_keywords", "missing_keywords", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "ats_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;

    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      throw new Error("No structured response from AI");
    }

    // Save analysis
    await supabase.from("resume_analyses").insert({
      resume_id: resumeId,
      user_id: userId,
      ats_score: Math.min(100, Math.max(0, Math.round(analysis.ats_score))),
      matched_keywords: analysis.matched_keywords,
      missing_keywords: analysis.missing_keywords,
      suggestions: analysis.suggestions,
      raw_text: text.substring(0, 5000),
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
