import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";

export default function MyResumes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("resumes")
      .select("*, resume_analyses(*), applications(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setResumes(data || []);
        setLoading(false);
      });
  }, [user]);

  const statusColor = (status: string) => {
    if (status === "selected") return "bg-success text-success-foreground";
    if (status === "rejected") return "bg-destructive text-destructive-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Resumes</h1>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : resumes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No resumes uploaded yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {resumes.map((resume: any) => {
              const analysis = resume.resume_analyses?.[0];
              const app = resume.applications?.[0];
              return (
                <Card
                  key={resume.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/resume/${resume.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{resume.file_name}</CardTitle>
                      {app && <Badge className={statusColor(app.status)}>{app.status}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{resume.job_role}</p>
                    {analysis && (
                      <p className="mt-2 text-lg font-bold text-primary">Score: {analysis.ats_score}/100</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
