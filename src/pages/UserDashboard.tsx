import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ScoreRing from "@/components/ScoreRing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, TrendingUp } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalResumes: 0, avgScore: 0, latestScore: 0, latestStatus: "pending" as string });
  const [recentResumes, setRecentResumes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: resumes } = await supabase
        .from("resumes")
        .select("*, resume_analyses(*), applications(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (resumes) {
        setRecentResumes(resumes);
        const analyses = resumes.flatMap((r: any) => r.resume_analyses || []);
        const scores = analyses.map((a: any) => a.ats_score);
        const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        const latest = scores[0] || 0;
        const latestApp = resumes[0]?.applications?.[0];
        setStats({
          totalResumes: resumes.length,
          avgScore: avg,
          latestScore: latest,
          latestStatus: latestApp?.status || "pending",
        });
      }
    };
    fetchData();
  }, [user]);

  const statusColor = (status: string) => {
    if (status === "selected") return "bg-success text-success-foreground";
    if (status === "rejected") return "bg-destructive text-destructive-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Track your resume performance</p>
          </div>
          <Button onClick={() => navigate("/upload")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Resume
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Resumes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalResumes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <ScoreRing score={stats.avgScore} size={80} strokeWidth={8} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Latest Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={statusColor(stats.latestStatus)}>
                {stats.latestStatus.charAt(0).toUpperCase() + stats.latestStatus.slice(1)}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentResumes.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">No resumes uploaded yet</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/upload")}>
                  Upload your first resume
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentResumes.map((resume: any) => {
                  const analysis = resume.resume_analyses?.[0];
                  const app = resume.applications?.[0];
                  return (
                    <div
                      key={resume.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/resume/${resume.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{resume.file_name}</p>
                          <p className="text-sm text-muted-foreground">{resume.job_role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {analysis && (
                          <span className="text-sm font-semibold">Score: {analysis.ats_score}</span>
                        )}
                        {app && (
                          <Badge className={statusColor(app.status)}>
                            {app.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
