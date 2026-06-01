import { Progress } from "@/components/ui/progress";
import type { ScoreBreakdown } from "@/lib/scoring/opportunity";

const LABELS: Record<keyof ScoreBreakdown, string> = {
  competition_inverse: "Competition (inverse)",
  review_density: "Engagement density",
  price_strength: "Price strength",
  new_listing_velocity: "New listing velocity",
  favorite_velocity: "Favorite velocity",
  shop_diversity: "Shop diversity",
};

export function ScoreBreakdownView({ data }: { data: ScoreBreakdown }) {
  return (
    <div className="space-y-3">
      {(Object.keys(data) as (keyof ScoreBreakdown)[]).map((k) => {
        const term = data[k];
        const pct = (term.score / term.max) * 100;
        return (
          <div key={k}>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{LABELS[k]}</span>
              <span className="font-medium">
                {term.score.toFixed(1)} / {term.max}
              </span>
            </div>
            <Progress value={pct} className="h-2 mt-1" />
            <div className="text-xs text-muted-foreground mt-1">
              Raw input: {typeof term.raw === "number" ? term.raw.toFixed(2) : String(term.raw)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
