import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileUp } from "lucide-react";

export default function UploadResume() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PDF or DOCX", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: resume, error: insertError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          job_role: jobRole,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Create application
      await supabase.from("applications").insert({
        user_id: user.id,
        resume_id: resume.id,
      });

      // Trigger AI analysis
      const { error: fnError } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeId: resume.id, filePath, jobRole },
      });
      if (fnError) {
        console.error("Analysis error:", fnError);
        toast({ title: "Resume uploaded", description: "Analysis may take a moment." });
      } else {
        toast({ title: "Resume uploaded & analyzed!", description: "View your ATS score now." });
      }

      navigate(`/resume/${resume.id}`);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Resume</h1>
          <p className="text-muted-foreground">Upload your resume for ATS analysis</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resume Details</CardTitle>
            <CardDescription>Upload a PDF or DOCX file</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="jobRole">Job Role Applying For</Label>
                <Input
                  id="jobRole"
                  placeholder="e.g. Frontend Developer"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Resume File</Label>
                <label
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <FileUp className="mb-3 h-10 w-10 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {file ? file.name : "Click to select a file"}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">PDF or DOCX, max 10MB</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={uploading || !file}>
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Analyzing..." : "Upload & Analyze"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
