import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { HearingAccessibilityPanel } from "@/components/HearingAccessibilityPanel";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Heart, ArrowLeft, Moon, Sun, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { validateTitle, validateDescription, validateUrl, validateAmount } from "@/lib/validation";

export default function CreateCase() {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    coverImage: "",
    cha9a9aLink: "",
    targetAmount: "",
    isUrgent: false,
    associationId: "", // only used by admin
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load associations list for admin
  const { data: allUsers } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });
  const associations = allUsers?.filter((u: any) => u.role === "association") ?? [];

  const clearFieldError = (field: string) => {
    setFieldErrors((p) => ({ ...p, [field]: "" }));
  };

  const createCaseMutation = trpc.cases.create.useMutation({
    onSuccess: () => {
      toast.success(t("createCase.success"));
      setLocation("/");
    },
    onError: (error) => {
      toast.error(`${t("auth.errorConnection")}: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const titleErr = validateTitle(formData.title);
    if (titleErr) errors.title = t(`validation.field.${titleErr}`);

    const descErr = validateDescription(formData.description);
    if (descErr) errors.description = t(`validation.field.${descErr === "tooShort" ? "descriptionTooShort" : descErr}`);

    if (!formData.category) errors.category = t("validation.field.required");

    const linkErr = validateUrl(formData.cha9a9aLink);
    if (linkErr) errors.cha9a9aLink = t(`validation.field.${linkErr}`);

    const amountErr = validateAmount(formData.targetAmount);
    if (amountErr) errors.targetAmount = t(`validation.field.${amountErr}`);

    // Admin must select an association
    if (user?.role === "admin" && !formData.associationId) {
      errors.associationId = t("createCase.selectAssociationRequired", "Veuillez sélectionner une association");
    }

    if (formData.coverImage) {
      const imgErr = validateUrl(formData.coverImage);
      if (imgErr) errors.coverImage = t(`validation.field.${imgErr}`);
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(t("createCase.fillRequired"));
      return;
    }

    try {
      await createCaseMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        category: formData.category as any,
        coverImage: formData.coverImage || undefined,
        cha9a9aLink: formData.cha9a9aLink,
        targetAmount: parseInt(formData.targetAmount),
        isUrgent: formData.isUrgent,
        ...(user?.role === "admin" && formData.associationId ? { associationId: parseInt(formData.associationId) } : {}),
      });
    } catch (error) {
      console.error("Error creating case:", error);
    }
  };

  // Redirect if not association or admin
  if (isAuthenticated && user && user.role !== "association" && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("common.accessDenied")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("createCase.onlyAssociations")}
          </p>
          <Button asChild>
            <Link href="/">{t("common.backToHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("common.loginRequired")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("createCase.mustBeAssociation")}
          </p>
          <Button asChild>
            <Link href="/login">{t("auth.loginButton")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const categoryKeys = ["health", "disability", "children", "education", "renovation", "emergency"] as const;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" fill="currentColor" />
              <h1 className="text-xl font-bold text-foreground">
                {t("createCase.pageTitle")}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NeurodivergentPanel />
            <AccessibilityMenu />
            <HearingAccessibilityPanel />
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={t("common.toggleTheme")}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            <Link href="/profile">
              <Avatar className="h-7 w-7 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                {user?.avatar && <AvatarImage src={user.avatar} alt={user.name || ""} />}
                <AvatarFallback className="text-[10px] font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Button variant="outline" onClick={logout}>
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{t("createCase.formTitle")}</CardTitle>
              <CardDescription>
                {t("createCase.formSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    {t("createCase.title")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder={t("createCase.titlePlaceholder")}
                    value={formData.title}
                    onChange={(e) => { setFormData({ ...formData, title: e.target.value }); clearFieldError("title"); }}
                    required
                    className={fieldErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                    aria-invalid={!!fieldErrors.title}
                  />
                  {fieldErrors.title && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.title}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("createCase.description")} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t("createCase.descriptionPlaceholder")}
                    rows={8}
                    value={formData.description}
                    onChange={(e) => { setFormData({ ...formData, description: e.target.value }); clearFieldError("description"); }}
                    required
                    className={fieldErrors.description ? "border-destructive focus-visible:ring-destructive" : ""}
                    aria-invalid={!!fieldErrors.description}
                  />
                  {fieldErrors.description ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("createCase.descriptionHelp")}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">
                    {t("createCase.category")} <span className="text-destructive">*</span>
                  </Label>
                  {fieldErrors.category && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.category}
                    </p>
                  )}
                  <Select
                    value={formData.category}
                    onValueChange={(value) => { setFormData({ ...formData, category: value }); clearFieldError("category"); }}
                    required
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder={t("createCase.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryKeys.map((key) => (
                        <SelectItem key={key} value={key}>{t(`categories.${key}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Association Picker (Admin only) */}
                {user?.role === "admin" && (
                  <div className="space-y-2">
                    <Label htmlFor="associationId">
                      {t("createCase.association", "Association")} <span className="text-destructive">*</span>
                    </Label>
                    {fieldErrors.associationId && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {fieldErrors.associationId}
                      </p>
                    )}
                    <Select
                      value={formData.associationId}
                      onValueChange={(value) => { setFormData({ ...formData, associationId: value }); clearFieldError("associationId"); }}
                    >
                      <SelectTrigger id="associationId">
                        <SelectValue placeholder={t("createCase.selectAssociation", "Sélectionner une association")} />
                      </SelectTrigger>
                      <SelectContent>
                        {associations.map((assoc: any) => (
                          <SelectItem key={assoc.id} value={String(assoc.id)}>
                            {assoc.name || assoc.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t("createCase.selectAssociationHelp", "Le cas sera créé au nom de cette association")}
                    </p>
                  </div>
                )}

                {/* Cha9a9a Link */}
                <div className="space-y-2">
                  <Label htmlFor="cha9a9aLink">
                    {t("createCase.cha9a9aLink")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cha9a9aLink"
                    type="url"
                    placeholder="https://cha9a9a.tn/donate/..."
                    value={formData.cha9a9aLink}
                    onChange={(e) => { setFormData({ ...formData, cha9a9aLink: e.target.value }); clearFieldError("cha9a9aLink"); }}
                    required
                    className={fieldErrors.cha9a9aLink ? "border-destructive focus-visible:ring-destructive" : ""}
                    aria-invalid={!!fieldErrors.cha9a9aLink}
                  />
                  {fieldErrors.cha9a9aLink ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.cha9a9aLink}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("createCase.cha9a9aLinkHelp")}
                    </p>
                  )}
                </div>

                {/* Target Amount */}
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">
                    {t("createCase.targetAmount")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    min="1"
                    placeholder={t("createCase.targetAmountPlaceholder")}
                    value={formData.targetAmount}
                    onChange={(e) => { setFormData({ ...formData, targetAmount: e.target.value }); clearFieldError("targetAmount"); }}
                    required
                    className={fieldErrors.targetAmount ? "border-destructive focus-visible:ring-destructive" : ""}
                    aria-invalid={!!fieldErrors.targetAmount}
                  />
                  {fieldErrors.targetAmount && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.targetAmount}
                    </p>
                  )}
                </div>

                {/* Photos Upload */}
                <div className="space-y-2">
                  <Label htmlFor="coverImage">{t("createCase.coverImage")}</Label>
                  <Input
                    id="coverImage"
                    type="url"
                    placeholder={t("createCase.coverImagePlaceholder")}
                    value={formData.coverImage}
                    onChange={(e) => { setFormData({ ...formData, coverImage: e.target.value }); clearFieldError("coverImage"); }}
                    className={fieldErrors.coverImage ? "border-destructive focus-visible:ring-destructive" : ""}
                    aria-invalid={!!fieldErrors.coverImage}
                  />
                  {fieldErrors.coverImage ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.coverImage}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("createCase.coverImageHelp")}
                    </p>
                  )}
                  {formData.coverImage && (
                    <div className="relative mt-2 inline-block">
                      <img
                        src={formData.coverImage}
                        alt={t("createCase.preview")}
                        className="w-full max-w-xs h-40 object-cover rounded-lg border"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    </div>
                  )}
                </div>

                {/* Is Urgent */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isUrgent"
                    checked={formData.isUrgent}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isUrgent: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor="isUrgent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("createCase.markUrgent")}
                  </Label>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={createCaseMutation.isPending} className="flex-1">
                    {createCaseMutation.isPending ? t("createCase.publishing") : t("createCase.publish")}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/">{t("common.cancel")}</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            {t("common.footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
