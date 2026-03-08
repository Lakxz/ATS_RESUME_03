import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ScoreRing from "@/components/ScoreRing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function ResumeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [resume, setResume] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("resumes")
        .select("*, resume_analyses(*), applications(*)")
        .eq("id", id)
        .single();
      if (data) {
        setResume(data);
        setAnalysis(data.resume_analyses?.[0]);
        setApplication(data.applications?.[0]);
      }
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const handleDownload = async () => {
    if (!resume) return;
    const { data } = await supabase.storage.from("resumes").download(resume.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = resume.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!resume) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Resume not found</p>
      </DashboardLayout>
    );
  }

  const matched = (analysis?.matched_keywords as string[]) || [];
  const missing = (analysis?.missing_keywords as string[]) || [];
  const suggestions = (analysis?.suggestions as string[]) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{resume.file_name}</h1>
            <p className="text-muted-foreground">Job Role: {resume.job_role}</p>
          </div>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>

        {analysis ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>ATS Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <ScoreRing score={analysis.ats_score} size={160} strokeWidth={14} />
                <p className="mt-4 text-sm text-muted-foreground">
                  {analysis.ats_score >= 75
                    ? "Great match!"
                    : analysis.ats_score >= 50
                    ? "Needs improvement"
                    : "Significant gaps found"}
                </p>
                {application && (
                  <Badge
                    className={`mt-3 ${
                      application.status === "selected"
                        ? "bg-success text-success-foreground"
                        : application.status === "rejected"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {application.status}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Keyword Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Matched Keywords ({matched.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {matched.map((kw: string) => (
                      <Badge key={kw} variant="secondary" className="bg-success/10 text-success">
                        {kw}
                      </Badge>
                    ))}
                    {matched.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Missing Keywords ({missing.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {missing.map((kw: string) => (
                      <Badge key={kw} variant="secondary" className="bg-destructive/10 text-destructive">
                        {kw}
                      </Badge>
                    ))}
                    {missing.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {suggestions.length > 0 && (
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Suggestions to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {suggestions.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Analysis in progress...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
