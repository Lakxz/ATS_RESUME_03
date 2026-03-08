import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function AdminApplicants() {
  const { toast } = useToast();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplicants = async () => {
    const { data: resumes } = await supabase
      .from("resumes")
      .select("*, resume_analyses(*), applications(*), profiles:user_id(full_name, email, phone)")
      .order("created_at", { ascending: false });
    setApplicants(resumes || []);
    setLoading(false);
  };

  useEffect(() => { fetchApplicants(); }, []);

  const updateStatus = async (applicationId: string, status: "selected" | "rejected", resume: any) => {
    setActionLoading(applicationId);
    const { error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", applicationId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setActionLoading(null);
      return;
    }

    if (status === "selected") {
      // Send notification email
      const profile = resume.profiles;
      await supabase.functions.invoke("send-notification", {
        body: {
          email: profile?.email,
          name: profile?.full_name,
          jobRole: resume.job_role,
          status: "selected",
        },
      });
    }

    toast({ title: `Applicant ${status}` });
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
    return matchesSearch && matchesScore;
  });

  const statusBadge = (status: string) => {
    if (status === "selected") return <Badge className="bg-success text-success-foreground">Selected</Badge>;
    if (status === "rejected") return <Badge className="bg-destructive text-destructive-foreground">Rejected</Badge>;
    return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Applicants</h1>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or job role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="high">High (75+)</SelectItem>
              <SelectItem value="medium">Medium (50-74)</SelectItem>
              <SelectItem value="low">Low (&lt;50)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Job Role</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Matched</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const profile = r.profiles;
                    const analysis = r.resume_analyses?.[0];
                    const app = r.applications?.[0];
                    const matched = (analysis?.matched_keywords as string[]) || [];
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{profile?.full_name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{profile?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{r.job_role}</TableCell>
                        <TableCell>
                          <span className="font-bold">{analysis?.ats_score ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {matched.slice(0, 3).map((kw: string) => (
                              <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                            ))}
                            {matched.length > 3 && (
                              <Badge variant="secondary" className="text-xs">+{matched.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{app ? statusBadge(app.status) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(r.file_path, r.file_name)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {app && app.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={actionLoading === app.id}
                                  onClick={() => updateStatus(app.id, "selected", r)}
                                  title="Select"
                                >
                                  {actionLoading === app.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={actionLoading === app.id}
                                  onClick={() => updateStatus(app.id, "rejected", r)}
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No applicants found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
