import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Clock,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  Loader2,
  Moon,
  Save,
  ScanFace,
  Shield,
  Sun,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FaceCamera } from "@/components/FaceCamera";

export default function Profile() {
  const { t } = useTranslation();
  const { user, loading, isAuthenticated, refresh } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();

  // Profile form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Face recognition state
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [faceLabel, setFaceLabel] = useState<string | null>(null);
  const [faceCreatedAt, setFaceCreatedAt] = useState<string | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);

  const loadFaceStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/face/status");
      if (res.ok) {
        const data = await res.json();
        setFaceRegistered(data.registered);
        setFaceLabel(data.label);
        setFaceCreatedAt(data.createdAt);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Load face status on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadFaceStatus();
    }
  }, [isAuthenticated, loadFaceStatus]);

  // Initialize form values from user data
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setIsDirty(false);
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success(t("profile.profileUpdated"));
      setIsDirty(false);
      refresh();
    },
    onError: (error) => {
      toast.error(error.message || t("profile.updateError"));
    },
  });

  const changePasswordMutation = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success(t("profile.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message || t("profile.updateError"));
    },
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: name || undefined,
      phone: phone || null,
      bio: bio || null,
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.passwordMismatch"));
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleFieldChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      updateProfileMutation.mutate({ avatar: url });
    } catch {
      toast.error(t("profile.updateError"));
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleFaceCapture = useCallback(async (descriptor: number[]) => {
    setFaceLoading(true);
    setFaceCameraOpen(false);
    try {
      const res = await fetch("/api/auth/face/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor, label: "Mon visage" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Enregistrement échoué.");
        return;
      }
      toast.success("Reconnaissance faciale configurée avec succès !");
      loadFaceStatus();
    } catch {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setFaceLoading(false);
    }
  }, [loadFaceStatus]);

  const handleDeleteFace = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/face/delete", { method: "DELETE" });
      if (res.ok) {
        toast.success("Reconnaissance faciale supprimée.");
        setFaceRegistered(false);
        setFaceLabel(null);
        setFaceCreatedAt(null);
      } else {
        toast.error("Erreur lors de la suppression.");
      }
    } catch {
      toast.error("Erreur de connexion.");
    }
  }, []);

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "association":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isEmailAccount = user.loginMethod === "email";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <Heart className="h-6 w-6 text-primary" fill="currentColor" />
            <h1 className="text-xl font-bold text-foreground">
              {t("profile.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NeurodivergentPanel />
            <AccessibilityMenu />
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={t("common.toggleTheme")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Profile Header */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar
                className="h-20 w-20 border-2 border-primary/20 cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
              >
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name || ""} />}
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {/* Streak fire badge */}
              {(user as any)?.streakCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-background rounded-full px-1.5 py-0.5 text-xs font-bold shadow-lg border z-10"
                  style={{ color: '#ef4444' }}
                  title={`Série de ${(user as any).streakCount} jour${(user as any).streakCount > 1 ? 's' : ''} consécutif${(user as any).streakCount > 1 ? 's' : ''}`}
                >
                  🔥{(user as any).streakCount}
                </span>
              )}
              <div
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">{user.name || t("common.noName")}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <Badge className={getRoleBadgeColor(user.role)}>
                {t(`profile.roles.${user.role}`)}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Personal Information Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                {t("profile.personalInfo")}
              </CardTitle>
              <CardDescription>{t("profile.personalInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t("profile.name")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={handleFieldChange(setName)}
                    placeholder={t("profile.namePlaceholder")}
                  />
                </div>

                {/* Email (read only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t("profile.email")}</Label>
                  <Input
                    id="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("profile.phone")}</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={handleFieldChange(setPhone)}
                    placeholder={t("profile.phonePlaceholder")}
                    type="tel"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">{t("profile.bio")}</Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={handleFieldChange(setBio)}
                    placeholder={t("profile.bioPlaceholder")}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!isDirty || updateProfileMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("profile.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t("common.save")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("profile.accountInfo")}
              </CardTitle>
              <CardDescription>{t("profile.accountInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    {t("profile.role")}
                  </p>
                  <p className="text-sm font-semibold">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {t(`profile.roles.${user.role}`)}
                    </Badge>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    {t("profile.loginMethod")}
                  </p>
                  <p className="text-sm font-semibold capitalize">
                    {user.loginMethod || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t("profile.memberSince")}
                  </p>
                  <p className="text-sm font-semibold">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {t("profile.lastLogin")}
                  </p>
                  <p className="text-sm font-semibold">
                    {formatDateTime(user.lastSignedIn)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change - only for email accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                {t("profile.security")}
              </CardTitle>
              <CardDescription>{t("profile.securityDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isEmailAccount ? (
                <form onSubmit={handlePasswordChange} className="space-y-5">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t("profile.currentPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t("profile.newPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t("profile.confirmPassword")}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-sm text-destructive">
                        {t("profile.passwordMismatch")}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="outline"
                    disabled={
                      !currentPassword ||
                      !newPassword ||
                      newPassword !== confirmPassword ||
                      changePasswordMutation.isPending
                    }
                    className="w-full sm:w-auto"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("profile.saving")}
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4 mr-2" />
                        {t("profile.changePassword")}
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 text-muted-foreground">
                  <Shield className="h-5 w-5 shrink-0" />
                  <p className="text-sm">{t("profile.oauthPasswordNote")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Face Recognition via Camera */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanFace className="h-5 w-5" />
                Reconnaissance faciale
              </CardTitle>
              <CardDescription>
                Utilisez la caméra de votre PC pour vous connecter instantanément par reconnaissance faciale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faceRegistered ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <ScanFace className="h-6 w-6 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Reconnaissance faciale active
                        </p>
                        {faceCreatedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Configuré le{" "}
                            {new Date(faceCreatedAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFaceCameraOpen(true)}
                        disabled={faceLoading}
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Recalibrer
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDeleteFace}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4 py-6 px-4 rounded-lg border-2 border-dashed border-muted-foreground/20">
                    <ScanFace className="h-12 w-12 text-muted-foreground/60" />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">Aucune reconnaissance faciale configurée</p>
                      <p className="text-xs text-muted-foreground">
                        Configurez votre visage pour vous connecter rapidement via la caméra.
                      </p>
                    </div>
                    <Button
                      onClick={() => setFaceCameraOpen(true)}
                      disabled={faceLoading}
                      className="gap-2"
                    >
                      {faceLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {faceLoading ? "En cours..." : "Configurer la reconnaissance faciale"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Face Camera Dialog */}
          <FaceCamera
            open={faceCameraOpen}
            onClose={() => setFaceCameraOpen(false)}
            onCapture={handleFaceCapture}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="container text-center text-sm text-muted-foreground">
          {t("common.footer")}
        </div>
      </footer>
    </div>
  );
}
