import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { checkLimit } from "@/lib/ratelimit";
import { searchListings } from "@/lib/etsy/client";
import { computeOpportunity } from "@/lib/scoring/opportunity";
import { supabaseAdmin } from "@/lib/supabase/server";

const Body = z.object({
  query: z.string().min(2).max(120),
  project_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { success, data, error } = Body.safeParse(await req.json());
  if (!success) return NextResponse.json({ error: error.format() }, { status: 400 });

  const rl = await checkLimit(user.plan as any, `opp:${user.id}`);
  if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const search = await searchListings(data.query, 100);
  // Category baseline is a placeholder until we add a per-category median table
  const categoryMedianPrice = 25;
  const result = computeOpportunity(
    data.query,
    search.count,
    search.results,
    0,
    categoryMedianPrice
  );

  const { data: saved } = await supabaseAdmin
    .from("opportunities")
    .insert({
      user_id: user.id,
      project_id: data.project_id ?? null,
      query: data.query,
      score: result.score,
      score_breakdown: result.breakdown,
      risk_level: result.risk,
      confidence: result.confidence,
      data_sources: result.data_sources,
      snapshot: { sample_size: search.results.length, total: search.count },
    })
    .select()
    .single();

  return NextResponse.json({ ...result, id: saved?.id });
}
