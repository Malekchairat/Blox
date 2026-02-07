import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { validateEmail, validatePassword, validateName, getPasswordStrength } from "@/lib/validation";

export default function Register() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("donor");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
      : "/dashboard/donor";
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

      await utils.auth.me.invalidate();
      redirectToDashboard(data.user?.role);
    } catch {
      setError(t("auth.errorServer"));
    } finally {
      setLoading(false);
    }
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
        </Card>
      </div>
    </div>
  );
}
