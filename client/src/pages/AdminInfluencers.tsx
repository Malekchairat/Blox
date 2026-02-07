import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Edit,
  Moon,
  Plus,
  Sun,
  Trash2,
  Star,
  CheckCircle,
  XCircle,
  Link2,
  Unlink,
  Instagram,
  Youtube,
  Globe,
  Upload,
} from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type InfluencerType = "influencer" | "sponsor";

interface InfluencerFormData {
  name: string;
  type: InfluencerType;
  photo: string;
  socialLinks: string;
  solidarityMessage: string;
  isApproved: boolean;
}

const emptyForm: InfluencerFormData = {
  name: "",
  type: "influencer",
  photo: "",
  socialLinks: JSON.stringify({ instagram: "", youtube: "", twitter: "", tiktok: "", website: "" }),
  solidarityMessage: "",
  isApproved: false,
};

interface SocialLinksObj {
  instagram?: string;
  youtube?: string;
  twitter?: string;
  tiktok?: string;
  website?: string;
}

function parseSocialLinks(raw: string | null | undefined): SocialLinksObj {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export default function AdminInfluencers() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const utils = trpc.useUtils();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formData, setFormData] = useState<InfluencerFormData>({ ...emptyForm });

  // Social links sub-fields
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialWebsite, setSocialWebsite] = useState("");

  // Case linking
  const [linkCaseId, setLinkCaseId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Queries
  const { data: allInfluencers, isLoading } = trpc.influencers.list.useQuery();
  const { data: allCases } = trpc.cases.list.useQuery();
  const { data: linkedCaseIds } = trpc.influencers.getLinkedCaseIds.useQuery(
    { influencerId: selectedId ?? 0 },
    { enabled: !!selectedId && showLinkDialog }
  );

  // Mutations
  const createMutation = trpc.influencers.create.useMutation({
    onSuccess: () => {
      utils.influencers.list.invalidate();
      setShowCreateDialog(false);
      toast.success(t("influencer.created", "Influenceur créé avec succès"));
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.influencers.update.useMutation({
    onSuccess: () => {
      utils.influencers.list.invalidate();
      setShowEditDialog(false);
      toast.success(t("influencer.updated", "Influenceur mis à jour"));
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.influencers.delete.useMutation({
    onSuccess: () => {
      utils.influencers.list.invalidate();
      setShowDeleteDialog(false);
      toast.success(t("influencer.deleted", "Influenceur supprimé"));
    },
    onError: (err) => toast.error(err.message),
  });

  const linkMutation = trpc.influencers.linkToCase.useMutation({
    onSuccess: () => {
      utils.influencers.getLinkedCaseIds.invalidate({ influencerId: selectedId ?? 0 });
      toast.success(t("influencer.linked", "Cas lié avec succès"));
      setLinkCaseId("");
    },
    onError: (err) => toast.error(err.message),
  });

  const unlinkMutation = trpc.influencers.unlinkFromCase.useMutation({
    onSuccess: () => {
      utils.influencers.getLinkedCaseIds.invalidate({ influencerId: selectedId ?? 0 });
      toast.success(t("influencer.unlinked", "Lien retiré"));
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">{t("common.accessDenied")}</p>
      </div>
    );
  }

  function buildSocialLinks(): string {
    const links: SocialLinksObj = {};
    if (socialInstagram) links.instagram = socialInstagram;
    if (socialYoutube) links.youtube = socialYoutube;
    if (socialTwitter) links.twitter = socialTwitter;
    if (socialTiktok) links.tiktok = socialTiktok;
    if (socialWebsite) links.website = socialWebsite;
    return JSON.stringify(links);
  }

  function openCreate() {
    setFormData({ ...emptyForm });
    setSocialInstagram("");
    setSocialYoutube("");
    setSocialTwitter("");
    setSocialTiktok("");
    setSocialWebsite("");
    setShowCreateDialog(true);
  }

  function openEdit(inf: any) {
    const links = parseSocialLinks(inf.socialLinks);
    setSelectedId(inf.id);
    setFormData({
      name: inf.name,
      type: inf.type,
      photo: inf.photo || "",
      socialLinks: inf.socialLinks || "",
      solidarityMessage: inf.solidarityMessage || "",
      isApproved: inf.isApproved,
    });
    setSocialInstagram(links.instagram || "");
    setSocialYoutube(links.youtube || "");
    setSocialTwitter(links.twitter || "");
    setSocialTiktok(links.tiktok || "");
    setSocialWebsite(links.website || "");
    setShowEditDialog(true);
  }

  function openDelete(id: number) {
    setSelectedId(id);
    setShowDeleteDialog(true);
  }

  function openLink(id: number) {
    setSelectedId(id);
    setLinkCaseId("");
    setShowLinkDialog(true);
  }

  function handleCreate() {
    createMutation.mutate({
      name: formData.name,
      type: formData.type,
      photo: formData.photo || undefined,
      socialLinks: buildSocialLinks(),
      solidarityMessage: formData.solidarityMessage || undefined,
      isApproved: formData.isApproved,
    });
  }

  function handleUpdate() {
    if (!selectedId) return;
    updateMutation.mutate({
      id: selectedId,
      name: formData.name,
      type: formData.type,
      photo: formData.photo || null,
      socialLinks: buildSocialLinks(),
      solidarityMessage: formData.solidarityMessage || null,
      isApproved: formData.isApproved,
    });
  }

  function handleToggleApproval(inf: any) {
    updateMutation.mutate({
      id: inf.id,
      isApproved: !inf.isApproved,
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setFormData(prev => ({ ...prev, photo: data.url }));
        toast.success(t("influencer.photoUploaded", "Photo uploadée"));
      }
    } catch {
      toast.error(t("influencer.uploadError", "Erreur d'upload"));
    } finally {
      setUploading(false);
    }
  }

  const linkedCases = allCases?.filter((c: any) => linkedCaseIds?.includes(c.id)) ?? [];
  const unlinkedCases = allCases?.filter((c: any) => !linkedCaseIds?.includes(c.id)) ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">{t("influencer.management", "Gestion des Influenceurs / Sponsors")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NeurodivergentPanel />
            <AccessibilityMenu />
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container space-y-6">
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {allInfluencers?.length ?? 0} {t("influencer.total", "influenceurs / sponsors")}
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t("influencer.add", "Ajouter")}
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("influencer.photo", "Photo")}</TableHead>
                    <TableHead>{t("influencer.nameLabel", "Nom")}</TableHead>
                    <TableHead>{t("influencer.typeLabel", "Type")}</TableHead>
                    <TableHead>{t("influencer.status", "Statut")}</TableHead>
                    <TableHead>{t("influencer.socialLabel", "Réseaux")}</TableHead>
                    <TableHead className="text-right">{t("influencer.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("common.loading")}
                      </TableCell>
                    </TableRow>
                  ) : !allInfluencers?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("influencer.empty", "Aucun influenceur ou sponsor")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allInfluencers.map((inf: any) => {
                      const links = parseSocialLinks(inf.socialLinks);
                      return (
                        <TableRow key={inf.id}>
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              {inf.photo && <AvatarImage src={inf.photo} alt={inf.name} />}
                              <AvatarFallback>{inf.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{inf.name}</TableCell>
                          <TableCell>
                            <Badge variant={inf.type === "sponsor" ? "default" : "secondary"}>
                              {inf.type === "sponsor" ? t("influencer.sponsor", "Sponsor") : t("influencer.influencer", "Influenceur")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={inf.isApproved ? "default" : "outline"}
                              className={inf.isApproved ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                            >
                              {inf.isApproved ? t("influencer.approved", "Approuvé") : t("influencer.pending", "En attente")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {links.instagram && <Instagram className="h-4 w-4 text-pink-500" />}
                              {links.youtube && <Youtube className="h-4 w-4 text-red-500" />}
                              {links.website && <Globe className="h-4 w-4 text-blue-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleApproval(inf)}
                                title={inf.isApproved ? t("influencer.unapprove", "Retirer l'approbation") : t("influencer.approve", "Approuver")}
                              >
                                {inf.isApproved ? <XCircle className="h-4 w-4 text-orange-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openLink(inf.id)} title={t("influencer.manageCases", "Gérer les cas")}>
                                <Link2 className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(inf)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDelete(inf.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* === Create / Edit Dialog === */}
      {[
        { open: showCreateDialog, setOpen: setShowCreateDialog, title: t("influencer.addTitle", "Ajouter un Influenceur / Sponsor"), onSubmit: handleCreate, loading: createMutation.isPending },
        { open: showEditDialog, setOpen: setShowEditDialog, title: t("influencer.editTitle", "Modifier l'Influenceur / Sponsor"), onSubmit: handleUpdate, loading: updateMutation.isPending },
      ].map((dlg, i) => (
        <Dialog key={i} open={dlg.open} onOpenChange={dlg.setOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dlg.title}</DialogTitle>
              <DialogDescription>{t("influencer.formDesc", "Renseignez les informations ci-dessous")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("influencer.nameLabel", "Nom")}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t("influencer.namePlaceholder", "Nom de l'influenceur ou sponsor")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("influencer.typeLabel", "Type")}</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as InfluencerType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="influencer">{t("influencer.influencer", "Influenceur")}</SelectItem>
                    <SelectItem value="sponsor">{t("influencer.sponsor", "Sponsor")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("influencer.photo", "Photo / Logo")}</Label>
                <div className="flex items-center gap-3">
                  {formData.photo && (
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={formData.photo} />
                      <AvatarFallback>{formData.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? t("social.uploading", "Envoi...") : t("influencer.uploadPhoto", "Upload photo")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("influencer.message", "Message de solidarité")}</Label>
                <Textarea
                  value={formData.solidarityMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, solidarityMessage: e.target.value }))}
                  placeholder={t("influencer.messagePlaceholder", "Message optionnel de soutien")}
                  rows={3}
                />
              </div>

              {/* Social links */}
              <div className="space-y-3">
                <Label>{t("influencer.socialLabel", "Réseaux sociaux")}</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
                    <Input value={socialInstagram} onChange={e => setSocialInstagram(e.target.value)} placeholder="Instagram URL" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500 shrink-0" />
                    <Input value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} placeholder="YouTube URL" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold w-4 h-4 flex items-center justify-center shrink-0">𝕏</span>
                    <Input value={socialTwitter} onChange={e => setSocialTwitter(e.target.value)} placeholder="X / Twitter URL" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold w-4 h-4 flex items-center justify-center shrink-0">♪</span>
                    <Input value={socialTiktok} onChange={e => setSocialTiktok(e.target.value)} placeholder="TikTok URL" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                    <Input value={socialWebsite} onChange={e => setSocialWebsite(e.target.value)} placeholder="Site web" />
                  </div>
                </div>
              </div>

              {/* Approval toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isApproved"
                  checked={formData.isApproved}
                  onChange={(e) => setFormData(prev => ({ ...prev, isApproved: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="isApproved">{t("influencer.approvedLabel", "Approuvé (visible publiquement)")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => dlg.setOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={dlg.onSubmit} disabled={!formData.name || dlg.loading}>
                {dlg.loading ? t("common.loading") : t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}

      {/* === Delete Confirmation === */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("influencer.deleteTitle", "Supprimer cet influenceur ?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("influencer.deleteDesc", "Cette action est irréversible. Tous les liens avec les cas seront également supprimés.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedId && deleteMutation.mutate({ id: selectedId })}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Link to Cases Dialog === */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("influencer.linkCases", "Associer à des cas")}</DialogTitle>
            <DialogDescription>{t("influencer.linkCasesDesc", "Liez ou retirez cet influenceur/sponsor de cas sociaux")}</DialogDescription>
          </DialogHeader>

          {/* Currently linked */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">{t("influencer.linkedCases", "Cas liés")}</h4>
            {linkedCases.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("influencer.noLinkedCases", "Aucun cas lié")}</p>
            ) : (
              <div className="space-y-2">
                {linkedCases.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <span className="text-sm font-medium">{c.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectedId && unlinkMutation.mutate({ influencerId: selectedId, caseId: c.id })}
                    >
                      <Unlink className="h-4 w-4 text-destructive mr-1" />
                      {t("influencer.unlink", "Retirer")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add link */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="font-medium text-sm text-muted-foreground">{t("influencer.addCase", "Ajouter un cas")}</h4>
            <div className="flex gap-2">
              <Select value={linkCaseId} onValueChange={setLinkCaseId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t("influencer.selectCase", "Sélectionner un cas")} />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedCases.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!linkCaseId || linkMutation.isPending}
                onClick={() => selectedId && linkCaseId && linkMutation.mutate({ influencerId: selectedId, caseId: parseInt(linkCaseId) })}
              >
                <Link2 className="h-4 w-4 mr-1" />
                {t("influencer.link", "Lier")}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
