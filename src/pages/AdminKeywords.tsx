import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tags, Search, Filter, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "general", label: "General", color: "bg-slate-600" },
  { value: "technical", label: "Technical", color: "bg-blue-600" },
  { value: "soft-skill", label: "Soft Skill", color: "bg-emerald-600" },
  { value: "certification", label: "Certification", color: "bg-amber-600" },
];

export default function AdminKeywords() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("general");
  const [weight, setWeight] = useState(5);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchKeywords = async () => {
    const { data } = await supabase.from("keywords").select("*").order("weight", { ascending: false });
    setKeywords(data || []);
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleSave = async () => {
    if (!keyword.trim()) return;
    if (editing) {
      const { error } = await supabase.from("keywords").update({ keyword, category, weight }).eq("id", editing.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase.from("keywords").insert({ keyword, category, weight, created_by: user?.id });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: editing ? "Keyword updated" : "Keyword added" });
    resetForm();
    fetchKeywords();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("keywords").delete().eq("id", id);
    toast({ title: "Keyword deleted" });
    fetchKeywords();
  };

  const resetForm = () => {
    setEditing(null);
    setKeyword("");
    setCategory("general");
    setWeight(5);
    setDialogOpen(false);
  };

  const openEdit = (kw: any) => {
    setEditing(kw);
    setKeyword(kw.keyword);
    setCategory(kw.category || "general");
    setWeight(kw.weight);
    setDialogOpen(true);
  };

  const filteredKeywords = keywords.filter((kw) => {
    const matchesSearch = kw.keyword.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || kw.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (cat: string) => CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];

  const getWeightDisplay = (w: number) => {
    if (w >= 8) return { label: "Critical", color: "text-red-400", bg: "bg-red-600/20" };
    if (w >= 5) return { label: "Important", color: "text-amber-400", bg: "bg-amber-600/20" };
    return { label: "Nice to have", color: "text-slate-400", bg: "bg-slate-700" };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">ATS Keywords</h1>
            <p className="mt-1 text-slate-400">Configure keywords to match against applicant resumes</p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              if (!o) resetForm();
              setDialogOpen(o);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Keyword
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-700 bg-slate-900 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  {editing ? "Edit Keyword" : "Add New Keyword"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Keyword</Label>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. React, Python, Leadership"
                    maxLength={50}
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-800">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", cat.color)} />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Weight (1-10)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="range"
                      min={1}
                      max={10}
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-8 text-center text-lg font-bold text-white">{weight}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {getWeightDisplay(weight).label} - Higher weight = more impact on ATS score
                  </p>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                  onClick={handleSave}
                >
                  {editing ? "Update Keyword" : "Add Keyword"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const count = keywords.filter((k) => k.category === cat.value).length;
            return (
              <Card
                key={cat.value}
                className={cn(
                  "cursor-pointer border-slate-800 transition-all hover:border-slate-700",
                  categoryFilter === cat.value ? "border-violet-500 bg-violet-600/10" : "bg-slate-900/50"
                )}
                onClick={() => setCategoryFilter(categoryFilter === cat.value ? "all" : cat.value)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-slate-400">{cat.label}</p>
                    <p className="text-2xl font-bold text-white">{count}</p>
                  </div>
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", cat.color + "/20")}>
                    <Tags className={cn("h-5 w-5", cat.color.replace("bg-", "text-").replace("-600", "-400"))} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-700 bg-slate-800/50 pl-10 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Keywords Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredKeywords.map((kw) => {
            const catInfo = getCategoryInfo(kw.category);
            const weightInfo = getWeightDisplay(kw.weight);
            return (
              <Card key={kw.id} className="group border-slate-800 bg-slate-900/50 transition-all hover:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", catInfo.color)} />
                        <span className="text-xs text-slate-500">{catInfo.label}</span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-white">{kw.keyword}</p>
                      <Badge className={cn("mt-2 text-xs", weightInfo.bg, weightInfo.color)}>
                        Weight: {kw.weight} • {weightInfo.label}
                      </Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(kw)}
                        className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(kw.id)}
                        className="h-8 w-8 text-slate-400 hover:bg-red-600/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredKeywords.length === 0 && (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="py-16 text-center">
              <Tags className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-500">No keywords found</p>
              <p className="mt-1 text-sm text-slate-600">Add keywords to start matching against resumes</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
