import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Loader2, AlertCircle, Eye, EyeOff, CheckCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setError("Lien de réinitialisation invalide. Aucun token trouvé.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errors: Record<string, string> = {};

    if (!password) {
      errors.password = "Le mot de passe est requis.";
    } else if (password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères.";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Le mot de passe doit contenir au moins une majuscule.";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Le mot de passe doit contenir au moins une minuscule.";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Le mot de passe doit contenir au moins un chiffre.";
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      errors.password = "Le mot de passe doit contenir au moins un caractère spécial.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error });
        } else {
          setError(data.error || "Une erreur est survenue.");
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col items-center gap-2">
          <Heart className="h-10 w-10 text-primary" fill="currentColor" />
          <h1 className="text-2xl font-bold text-foreground">Universelle</h1>
        </div>

        <Card>
          {success ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Mot de passe réinitialisé !</CardTitle>
                <CardDescription>
                  Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button className="w-full" onClick={() => navigate("/login")}>
                  Se connecter
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Nouveau mot de passe
                </CardTitle>
                <CardDescription>
                  Créez un nouveau mot de passe pour votre compte.
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

                  {!token && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Lien de réinitialisation invalide. <Link href="/forgot-password" className="underline font-medium">Refaire une demande</Link>.</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
                        required
                        disabled={loading || !token}
                        className={fieldErrors.password ? "border-destructive" : ""}
                        autoFocus
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
                    {fieldErrors.password && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {fieldErrors.password}
                      </p>
                    )}
                    <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      <li className={password.length >= 8 ? "text-green-600 dark:text-green-400" : ""}>• Au moins 8 caractères</li>
                      <li className={/[A-Z]/.test(password) ? "text-green-600 dark:text-green-400" : ""}>• Une majuscule</li>
                      <li className={/[a-z]/.test(password) ? "text-green-600 dark:text-green-400" : ""}>• Une minuscule</li>
                      <li className={/[0-9]/.test(password) ? "text-green-600 dark:text-green-400" : ""}>• Un chiffre</li>
                      <li className={/[^A-Za-z0-9]/.test(password) ? "text-green-600 dark:text-green-400" : ""}>• Un caractère spécial (!@#$%...)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: "" })); }}
                      required
                      disabled={loading || !token}
                      className={fieldErrors.confirmPassword ? "border-destructive" : ""}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={loading || !token}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Réinitialisation...
                      </>
                    ) : (
                      "Réinitialiser le mot de passe"
                    )}
                  </Button>
                  <Link href="/login" className="text-sm text-primary hover:underline text-center">
                    <ArrowLeft className="h-3 w-3 inline mr-1" />
                    Retour à la connexion
                  </Link>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
