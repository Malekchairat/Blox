import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Loader2, Eye, EyeOff, AlertCircle, ScanFace } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { validateEmail } from "@/lib/validation";
import { FaceCamera } from "@/components/FaceCamera";

export default function Login() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);

  const redirectToDashboard = (role: string) => {
    const path = role === "admin" ? "/dashboard/admin"
      : role === "association" ? "/dashboard/association"
      : "/";
    navigate(path);
  };

  // Check for error from Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error");
    if (urlError) {
      setError(urlError);
      // Clean up URL
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const errors: Record<string, string> = {};

    // Client-side validation
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = t(`validation.email.${emailErr}`);
    if (!password) errors.password = t("validation.password.required");

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error });
        } else {
          setError(data.error || t("auth.errorConnection"));
        }
        return;
      }

      await utils.auth.me.invalidate();
      redirectToDashboard(data.user?.role);
    } catch {
      setError(t("auth.errorServer"));
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLogin = useCallback(async (descriptor: number[]) => {
    setFaceCameraOpen(false);
    setError("");
    setFaceIdLoading(true);
    try {
      const res = await fetch("/api/auth/face/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Visage non reconnu.");
        return;
      }
      await utils.auth.me.invalidate();
      redirectToDashboard(data.user?.role);
    } catch {
      setError("Erreur lors de l'authentification faciale.");
    } finally {
      setFaceIdLoading(false);
    }
  }, [utils, navigate]);

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
            {t("home.connectToAccount")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.loginTitle")}</CardTitle>
            <CardDescription>
              {t("auth.loginSubtitle")}
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

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
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

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); }}
                      required
                      autoComplete="current-password"
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
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading || faceIdLoading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.loggingIn")}
                  </>
                ) : (
                  t("auth.loginButton")
                )}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Connexion rapide</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all"
                disabled={loading || faceIdLoading}
                onClick={() => setFaceCameraOpen(true)}
              >
                {faceIdLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ScanFace className="h-5 w-5 text-primary" />
                )}
                <span className="font-medium">
                  {faceIdLoading ? "Vérification..." : "Connexion par reconnaissance faciale"}
                </span>
              </Button>

              <FaceCamera
                open={faceCameraOpen}
                onClose={() => setFaceCameraOpen(false)}
                onCapture={handleFaceLogin}
                title="Connexion faciale"
                description="Regardez la caméra pour vous connecter"
              />

              <GoogleAuthButton mode="login" disabled={loading || faceIdLoading} />

              <p className="text-sm text-muted-foreground text-center">
                {t("auth.noAccount")}{" "}
                <Link
                  href="/register"
                  className="text-primary font-medium hover:underline"
                >
                  {t("auth.createAccount")}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
