import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, Camera, ScanFace } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { validateEmail, validatePassword, validateName, getPasswordStrength } from "@/lib/validation";
import { FaceCamera } from "@/components/FaceCamera";

export default function Register() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const updateProfileMutation = trpc.profile.update.useMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("donor");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Face recognition post-registration state
  const [showFaceIdSetup, setShowFaceIdSetup] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [registeredRole, setRegisteredRole] = useState<string>("donor");
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);

  const pwStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Password requirements checklist
  const pwChecks = useMemo(() => [
    { key: "length", ok: password.length >= 8, label: t("validation.password.min8Chars") },
    { key: "upper", ok: /[A-Z]/.test(password), label: t("validation.password.hasUppercase") },
    { key: "lower", ok: /[a-z]/.test(password), label: t("validation.password.hasLowercase") },
    { key: "digit", ok: /[0-9]/.test(password), label: t("validation.password.hasDigit") },
    { key: "special", ok: /[^A-Za-z0-9]/.test(password), label: t("validation.password.hasSpecial") },
  ], [password, t]);

  const redirectToDashboard = (roleVal: string) => {
    const path = roleVal === "admin" ? "/dashboard/admin"
      : roleVal === "association" ? "/dashboard/association"
      : "/";
    navigate(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const errors: Record<string, string> = {};

    // Validate all fields
    const nameErr = validateName(name);
    if (nameErr) errors.name = t(`validation.name.${nameErr}`);

    const emailErr = validateEmail(email);
    if (emailErr) errors.email = t(`validation.email.${emailErr}`);

    const pwErr = validatePassword(password);
    if (pwErr) errors.password = t(`validation.password.${pwErr}`);

    if (!confirmPassword) {
      errors.confirmPassword = t("validation.password.required");
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t("auth.passwordMismatch");
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error });
        } else {
          setError(data.error || t("auth.errorRegister"));
        }
        return;
      }

      // Now the user is authenticated (cookie set). Upload avatar if selected.
      if (avatarFile) {
        try {
          const formData = new FormData();
          formData.append("image", avatarFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            credentials: "same-origin",
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.url) {
              await updateProfileMutation.mutateAsync({ avatar: uploadData.url });
            }
          }
        } catch {
          // Non-critical: user can set avatar later from profile page
        }
      }

      await utils.auth.me.invalidate();

      // Show the Face ID setup step after registration
      setRegisteredRole(data.user?.role || role);
      setShowFaceIdSetup(true);
      setLoading(false);
      return;
    } catch {
      setError(t("auth.errorServer"));
    } finally {
      setLoading(false);
    }
  };

  const handleSetupFaceId = async (descriptor: number[]) => {
    setFaceCameraOpen(false);
    setFaceIdLoading(true);
    try {
      await fetch("/api/auth/face/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor, label: "Mon visage" }),
      });
      // Whether success or failure, redirect to dashboard
      redirectToDashboard(registeredRole);
    } catch {
      redirectToDashboard(registeredRole);
    } finally {
      setFaceIdLoading(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((p) => ({ ...p, [field]: "" }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Language Switcher */}
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <Heart className="h-10 w-10 text-primary" fill="currentColor" />
          <h1 className="text-2xl font-bold text-foreground">
            {t("common.appName")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.registerIntro")}
          </p>
        </div>

        <Card>
          {showFaceIdSetup ? (
            /* ── Face Recognition Setup Step ── */
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Compte créé avec succès !</CardTitle>
                <CardDescription>
                  Configurez la reconnaissance faciale pour vous connecter instantanément la prochaine fois.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-4">
                  <ScanFace className="h-12 w-12 mx-auto text-primary" />
                  <div>
                    <p className="font-medium">Reconnaissance faciale</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Utilisez la caméra de votre PC pour un accès rapide et sécurisé.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  className="w-full gap-2"
                  onClick={() => setFaceCameraOpen(true)}
                  disabled={faceIdLoading}
                >
                  {faceIdLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanFace className="h-4 w-4" />
                  )}
                  {faceIdLoading ? "Configuration..." : "Configurer la reconnaissance faciale"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => redirectToDashboard(registeredRole)}
                  disabled={faceIdLoading}
                >
                  Passer cette étape
                </Button>

                <FaceCamera
                  open={faceCameraOpen}
                  onClose={() => setFaceCameraOpen(false)}
                  onCapture={handleSetupFaceId}
                  title="Enregistrer votre visage"
                  description="Regardez la caméra pour configurer la reconnaissance faciale"
                />
              </CardFooter>
            </>
          ) : (
          /* ── Registration Form ── */
          <>
          <CardHeader>
            <CardTitle>{t("auth.registerTitle")}</CardTitle>
            <CardDescription>
              {t("auth.registerSubtitle")}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                <Label>{t("auth.profilePhoto")}</Label>
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
                    {avatarPreview && <AvatarImage src={avatarPreview} alt="Avatar preview" />}
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <Camera className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  {avatarPreview && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("auth.profilePhotoHint")}</p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("auth.namePlaceholder")}
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                    required
                    autoComplete="name"
                    disabled={loading}
                    className={`flex-1 ${fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    aria-invalid={!!fieldErrors.name}
                  />
                  <VoiceInputButton
                    onResult={(text) => setName(text)}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                    required
                    autoComplete="email"
                    disabled={loading}
                    className={`flex-1 ${fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    aria-invalid={!!fieldErrors.email}
                  />
                  <VoiceInputButton
                    onResult={(text) => setEmail(text.replace(/\s+/g, "").toLowerCase())}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">{t("auth.iAm")}</Label>
                <Select value={role} onValueChange={setRole} disabled={loading}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder={t("auth.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="donor">{t("auth.donor")}</SelectItem>
                    <SelectItem value="association">{t("auth.association")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {role === "donor" ? t("auth.donorHelp") : t("auth.associationHelp")}
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      disabled={loading}
                      className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                      aria-invalid={!!fieldErrors.password}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <VoiceInputButton
                    onResult={(text) => setPassword(text.replace(/\s+/g, ""))}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.password}
                  </p>
                )}

                {/* Password strength bar */}
                {password && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-colors ${i < pwStrength.score ? pwStrength.color : "bg-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[4rem] text-right">
                        {t(`validation.password.strength.${pwStrength.label}`)}
                      </span>
                    </div>

                    {/* Requirements checklist */}
                    <ul className="space-y-0.5">
                      {pwChecks.map((c) => (
                        <li key={c.key} className={`text-xs flex items-center gap-1.5 ${c.ok ? "text-green-600" : "text-muted-foreground"}`}>
                          {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border inline-block" />}
                          {c.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={loading}
                    className={`flex-1 ${fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    aria-invalid={!!fieldErrors.confirmPassword}
                  />
                  <VoiceInputButton
                    onResult={(text) => setConfirmPassword(text.replace(/\s+/g, ""))}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.registering")}
                  </>
                ) : (
                  t("auth.registerButton")
                )}
              </Button>

              <GoogleAuthButton mode="register" role={role} disabled={loading} />

              <p className="text-sm text-muted-foreground text-center">
                {t("auth.hasAccount")}{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium hover:underline"
                >
                  {t("auth.loginLink")}
                </Link>
              </p>
            </CardFooter>
          </form>
          </>
          )}
        </Card>
      </div>
    </div>
  );
}
