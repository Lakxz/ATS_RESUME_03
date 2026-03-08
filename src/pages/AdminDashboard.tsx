import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, CheckCircle2, Clock, UserCheck, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    avgScore: 0,
    selected: 0,
    topScore: 0,
    pending: 0,
    shortlisted: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  });
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
  const [recentApplicants, setRecentApplicants] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: analyses } = await supabase.from("resume_analyses").select("ats_score");
      const { data: apps } = await supabase.from("applications").select("status");
      const { data: recent } = await supabase
        .from("resumes")
        .select("*, profiles:user_id(full_name, email), resume_analyses(*)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (analyses) {
        const scores = analyses.map((a) => a.ats_score);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const top = scores.length ? Math.max(...scores) : 0;

        const statusCounts = {
          pending: apps?.filter((a) => a.status === "pending").length || 0,
          shortlisted: apps?.filter((a) => a.status === "shortlisted").length || 0,
          interview: apps?.filter((a) => a.status === "interview").length || 0,
          offer: apps?.filter((a) => a.status === "offer").length || 0,
          selected: apps?.filter((a) => a.status === "selected").length || 0,
          rejected: apps?.filter((a) => a.status === "rejected").length || 0,
        };

        setStats({
          total: analyses.length,
          avgScore: avg,
          selected: statusCounts.selected,
          topScore: top,
          ...statusCounts,
        });

        const buckets = [
          { range: "0-20", count: 0, fill: "#ef4444" },
          { range: "21-40", count: 0, fill: "#f97316" },
          { range: "41-60", count: 0, fill: "#eab308" },
          { range: "61-80", count: 0, fill: "#22c55e" },
          { range: "81-100", count: 0, fill: "#8b5cf6" },
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

      setRecentApplicants(recent || []);
    };
    fetchStats();
  }, []);

  const pipelineData = [
    { name: "Pending", value: stats.pending, color: "#64748b" },
    { name: "Shortlisted", value: stats.shortlisted, color: "#3b82f6" },
    { name: "Interview", value: stats.interview, color: "#f59e0b" },
    { name: "Offer", value: stats.offer, color: "#22c55e" },
    { name: "Rejected", value: stats.rejected, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const statCards = [
    { label: "Total Applicants", value: stats.total, icon: Users, gradient: "from-violet-600 to-indigo-600" },
    { label: "Average Score", value: `${stats.avgScore}%`, icon: TrendingUp, gradient: "from-amber-500 to-orange-600" },
    { label: "Top Score", value: `${stats.topScore}%`, icon: FileText, gradient: "from-emerald-500 to-teal-600" },
    { label: "In Pipeline", value: stats.shortlisted + stats.interview + stats.offer, icon: Clock, gradient: "from-blue-500 to-cyan-600" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="mt-1 text-slate-400">Monitor your recruitment pipeline and applicant statistics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label} className="border-slate-800 bg-slate-900/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">{s.label}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{s.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient}`}>
                    <s.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Score Distribution */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">ATS Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline Status */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Pipeline Status</CardTitle>
            </CardHeader>
            <CardContent>
              {pipelineData.length > 0 ? (
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pipelineData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pipelineData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-slate-500">
                  No pipeline data yet
                </div>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-400">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Applicants */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Recent Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplicants.map((applicant) => {
                const profile = applicant.profiles;
                const analysis = applicant.resume_analyses?.[0];
                return (
                  <div
                    key={applicant.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white">
                        {profile?.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-white">{profile?.full_name || "Unknown"}</p>
                        <p className="text-sm text-slate-400">{applicant.job_role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-400">ATS Score</p>
                        <p className="text-lg font-bold text-white">{analysis?.ats_score ?? "—"}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentApplicants.length === 0 && (
                <p className="py-8 text-center text-slate-500">No applicants yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
