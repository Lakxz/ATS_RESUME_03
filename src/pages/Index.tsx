import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, Zap, Shield, BarChart3 } from "lucide-react";

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">ATS Resume Checker</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate("/login")}>Sign In</Button>
          <Button onClick={() => navigate("/register")}>Get Started</Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Optimize Your Resume with <span className="text-primary">AI-Powered</span> ATS Analysis
        </h1>
        <p className="mb-8 max-w-lg text-lg text-muted-foreground">
          Upload your resume, get an instant ATS score, and discover exactly what keywords you're missing to land your dream job.
        </p>
        <div className="flex gap-3">
          <Button size="lg" onClick={() => navigate("/register")}>
            <Zap className="mr-2 h-5 w-5" />
            Analyze My Resume
          </Button>
        </div>

        <div className="mt-16 grid max-w-3xl gap-8 md:grid-cols-3">
          {[
            { icon: Zap, title: "AI Analysis", desc: "Powered by advanced AI for semantic keyword matching" },
            { icon: BarChart3, title: "ATS Score", desc: "Get a 0-100 score with detailed breakdown" },
            { icon: Shield, title: "Actionable Tips", desc: "Specific suggestions to improve your resume" },
          ].map((f) => (
            <div key={f.title} className="flex flex-col items-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
