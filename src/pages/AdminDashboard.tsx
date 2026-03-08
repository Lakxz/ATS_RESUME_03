import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, avgScore: 0, selected: 0, topScore: 0 });
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: analyses } = await supabase.from("resume_analyses").select("ats_score");
      const { data: apps } = await supabase.from("applications").select("status");

      if (analyses) {
        const scores = analyses.map((a) => a.ats_score);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const top = scores.length ? Math.max(...scores) : 0;
        const selected = apps?.filter((a) => a.status === "selected").length || 0;

        setStats({ total: analyses.length, avgScore: avg, selected, topScore: top });

        // Build score distribution
        const buckets = [
          { range: "0-20", count: 0 },
          { range: "21-40", count: 0 },
          { range: "41-60", count: 0 },
          { range: "61-80", count: 0 },
          { range: "81-100", count: 0 },
        ];
        scores.forEach((s) => {
          if (s <= 20) buckets[0].count++;
          else if (s <= 40) buckets[1].count++;
          else if (s <= 60) buckets[2].count++;
          else if (s <= 80) buckets[3].count++;
          else buckets[4].count++;
        });
        setScoreDistribution(buckets);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Applicants", value: stats.total, icon: Users, color: "text-primary" },
    { label: "Average Score", value: stats.avgScore, icon: TrendingUp, color: "text-warning" },
    { label: "Top Score", value: stats.topScore, icon: FileText, color: "text-success" },
    { label: "Selected", value: stats.selected, icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>

        <div className="grid gap-4 md:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ATS Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
