import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Download,
  ChevronRight,
  Loader2,
  User,
  Phone,
  Mail,
  FileText,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ApplicationStatus = "pending" | "shortlisted" | "interview" | "offer" | "selected" | "rejected";

const PIPELINE_STAGES: { status: ApplicationStatus; label: string; color: string; bgColor: string }[] = [
  { status: "pending", label: "Pending Review", color: "text-slate-400", bgColor: "bg-slate-700/50" },
  { status: "shortlisted", label: "Shortlisted", color: "text-blue-400", bgColor: "bg-blue-600/20" },
  { status: "interview", label: "Interview", color: "text-amber-400", bgColor: "bg-amber-600/20" },
  { status: "offer", label: "Offer Made", color: "text-emerald-400", bgColor: "bg-emerald-600/20" },
  { status: "selected", label: "Hired", color: "text-green-400", bgColor: "bg-green-600/20" },
];

export default function AdminApplicants() {
  const { toast } = useToast();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);

  const fetchApplicants = async () => {
    const { data: resumes } = await supabase
      .from("resumes")
      .select("*, resume_analyses(*), applications(*), profiles:user_id(full_name, email, phone)")
      .order("created_at", { ascending: false });
    setApplicants(resumes || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  const updateStatus = async (applicationId: string, status: ApplicationStatus, resume: any) => {
    setActionLoading(applicationId);
    const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setActionLoading(null);
      return;
    }

    // Send notification on final statuses
    if (status === "selected" || status === "rejected") {
      const profile = resume.profiles;
      await supabase.functions.invoke("send-notification", {
        body: {
          email: profile?.email,
          name: profile?.full_name,
          jobRole: resume.job_role,
          status,
        },
      });
    }

    toast({ title: `Moved to ${PIPELINE_STAGES.find((s) => s.status === status)?.label || status}` });
    setActionLoading(null);
    fetchApplicants();
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from("resumes").download(filePath);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const filtered = applicants.filter((r) => {
    const profile = r.profiles;
    const name = profile?.full_name?.toLowerCase() || "";
    const role = r.job_role?.toLowerCase() || "";
    const matchesSearch = name.includes(search.toLowerCase()) || role.includes(search.toLowerCase());
    const score = r.resume_analyses?.[0]?.ats_score || 0;
    const matchesScore =
      scoreFilter === "all" ||
      (scoreFilter === "high" && score >= 75) ||
      (scoreFilter === "medium" && score >= 50 && score < 75) ||
      (scoreFilter === "low" && score < 50);
    const appStatus = r.applications?.[0]?.status || "pending";
    const matchesStage = stageFilter === "all" || appStatus === stageFilter;
    return matchesSearch && matchesScore && matchesStage;
  });

  const getNextStage = (current: ApplicationStatus): ApplicationStatus | null => {
    const order: ApplicationStatus[] = ["pending", "shortlisted", "interview", "offer", "selected"];
    const idx = order.indexOf(current);
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Screening Pipeline</h1>
          <p className="mt-1 text-slate-400">Manage and track applicants through the hiring process</p>
        </div>

        {/* Pipeline Overview */}
        <div className="grid gap-4 md:grid-cols-5">
          {PIPELINE_STAGES.map((stage) => {
            const count = applicants.filter((a) => (a.applications?.[0]?.status || "pending") === stage.status).length;
            return (
              <Card
                key={stage.status}
                className={cn(
                  "cursor-pointer border-slate-800 transition-all hover:border-slate-700",
                  stageFilter === stage.status ? "border-violet-500 bg-violet-600/10" : "bg-slate-900/50"
                )}
                onClick={() => setStageFilter(stageFilter === stage.status ? "all" : stage.status)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn("text-sm font-medium", stage.color)}>{stage.label}</p>
                      <p className="mt-1 text-2xl font-bold text-white">{count}</p>
                    </div>
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", stage.bgColor)}>
                      <User className={cn("h-5 w-5", stage.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search by name or job role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-slate-700 bg-slate-800/50 pl-10 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-48 border-slate-700 bg-slate-800/50 text-white">
              <SelectValue placeholder="Filter by score" />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800">
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="high">High (75+)</SelectItem>
              <SelectItem value="medium">Medium (50-74)</SelectItem>
              <SelectItem value="low">Low (&lt;50)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applicants List */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filtered.map((r) => {
                  const profile = r.profiles;
                  const analysis = r.resume_analyses?.[0];
                  const app = r.applications?.[0];
                  const currentStatus = (app?.status || "pending") as ApplicationStatus;
                  const stageInfo = PIPELINE_STAGES.find((s) => s.status === currentStatus);
                  const nextStage = getNextStage(currentStatus);
                  const matched = (analysis?.matched_keywords as string[]) || [];

                  return (
                    <div
                      key={r.id}
                      className="flex flex-col gap-4 p-6 transition-colors hover:bg-slate-800/30 lg:flex-row lg:items-center lg:justify-between"
                    >
                      {/* Applicant Info */}
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-bold text-white">
                          {profile?.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-semibold text-white">{profile?.full_name || "Unknown"}</p>
                            <Badge className={cn("text-xs", stageInfo?.bgColor, stageInfo?.color)}>
                              {stageInfo?.label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-400">{r.job_role}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {profile?.email}
                            </span>
                            {profile?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {profile.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Score & Keywords */}
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">ATS Score</p>
                          <p className={cn("text-2xl font-bold", getScoreColor(analysis?.ats_score || 0))}>
                            {analysis?.ats_score ?? "—"}%
                          </p>
                        </div>
                        <div className="hidden lg:block">
                          <p className="mb-1 text-xs text-slate-500">Matched Keywords</p>
                          <div className="flex flex-wrap gap-1">
                            {matched.slice(0, 4).map((kw: string) => (
                              <Badge key={kw} variant="secondary" className="bg-slate-700 text-xs text-slate-300">
                                {kw}
                              </Badge>
                            ))}
                            {matched.length > 4 && (
                              <Badge variant="secondary" className="bg-slate-700 text-xs text-slate-300">
                                +{matched.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(r.file_path, r.file_name)}
                          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Resume
                        </Button>
                        {app && currentStatus !== "selected" && currentStatus !== "rejected" && nextStage && (
                          <Button
                            size="sm"
                            disabled={actionLoading === app.id}
                            onClick={() => updateStatus(app.id, nextStage, r)}
                            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                          >
                            {actionLoading === app.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                Move to {PIPELINE_STAGES.find((s) => s.status === nextStage)?.label}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        )}
                        {app && currentStatus !== "selected" && currentStatus !== "rejected" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoading === app.id}
                            onClick={() => updateStatus(app.id, "rejected", r)}
                            className="text-red-400 hover:bg-red-600/10 hover:text-red-300"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="py-16 text-center text-slate-500">
                    <User className="mx-auto h-12 w-12 opacity-50" />
                    <p className="mt-4">No applicants found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
