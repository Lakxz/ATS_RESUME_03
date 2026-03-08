import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function AdminKeywords() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("general");
  const [weight, setWeight] = useState(5);

  const fetchKeywords = async () => {
    const { data } = await supabase.from("keywords").select("*").order("weight", { ascending: false });
    setKeywords(data || []);
  };

  useEffect(() => { fetchKeywords(); }, []);

  const handleSave = async () => {
    if (!keyword.trim()) return;
    if (editing) {
      const { error } = await supabase.from("keywords").update({ keyword, category, weight }).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("keywords").insert({ keyword, category, weight, created_by: user?.id });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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

  const weightColor = (w: number) => {
    if (w >= 8) return "bg-destructive/10 text-destructive";
    if (w >= 5) return "bg-warning/10 text-warning";
    return "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">ATS Keywords</h1>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Keyword</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Keyword" : "Add Keyword"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Keyword</Label>
                  <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. React" maxLength={50} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="soft-skill">Soft Skill</SelectItem>
                      <SelectItem value="certification">Certification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Weight (1-10)</Label>
                  <Input type="number" min={1} max={10} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
                </div>
                <Button className="w-full" onClick={handleSave}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((kw) => (
                  <TableRow key={kw.id}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell><Badge variant="outline">{kw.category}</Badge></TableCell>
                    <TableCell><Badge className={weightColor(kw.weight)}>{kw.weight}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(kw)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(kw.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {keywords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No keywords configured yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
