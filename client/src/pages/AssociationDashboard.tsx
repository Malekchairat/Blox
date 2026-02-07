import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Heart, Moon, Sun, Plus, ArrowLeft, Building2,
  AlertCircle, Eye, BarChart3,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { TranslatedText } from "@/components/TranslatedText";

export default function AssociationDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { theme, toggleTheme } = useTheme();

  const { data: myCases, isLoading } = trpc.cases.listByAssociation.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  if (user && user.role !== "association" && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("common.accessDenied")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("association.onlyAssociations")}
          </p>
          <Button asChild>
            <Link href="/">{t("common.backToHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    return <Badge className={styles[status] || ""}>{t(`status.${status}`)}</Badge>;
  };

  const totalRaised = myCases?.reduce((sum, c) => sum + c.currentAmount, 0) ?? 0;
  const totalTarget = myCases?.reduce((sum, c) => sum + c.targetAmount, 0) ?? 0;
  const totalViews = myCases?.reduce((sum, c) => sum + c.viewCount, 0) ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{t("association.title")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NeurodivergentPanel />
            <AccessibilityMenu />
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={t("common.toggleTheme")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button variant="outline" onClick={logout}>{t("common.logout")}</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{myCases?.length ?? 0}</div>
                    <p className="text-sm text-muted-foreground">{t("association.publishedCases")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Heart className="h-8 w-8 text-secondary" fill="currentColor" />
                  <div>
                    <div className="text-2xl font-bold">{totalRaised.toLocaleString()} {t("common.currency")}</div>
                    <p className="text-sm text-muted-foreground">
                      {t("association.collectedOf", { total: totalTarget.toLocaleString() })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Eye className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">{t("association.totalViews")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/create-case">
                <Plus className="h-4 w-4 mr-2" />
                {t("association.newSocialCase")}
              </Link>
            </Button>
          </div>

          {/* My Cases */}
          <Card>
            <CardHeader>
              <CardTitle>{t("association.myCases")}</CardTitle>
              <CardDescription>
                {t("association.myCasesDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
                </div>
              ) : !myCases || myCases.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{t("association.noCases")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("association.startCreating")}
                  </p>
                  <Button asChild size="sm">
                    <Link href="/create-case">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("association.createCase")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myCases.map(c => (
                    <div key={c.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold"><TranslatedText text={c.title} /></h3>
                            {getStatusBadge(c.status)}
                            {c.isUrgent && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {t("common.urgent")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3"><TranslatedText text={c.description} /></p>
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline">{t(`categories.${c.category}`)}</Badge>
                            <span className="text-muted-foreground">{c.viewCount} {t("association.views")}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                          <Link href={`/case/${c.id}`}>{t("common.view")}</Link>
                        </Button>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {c.currentAmount.toLocaleString()} / {c.targetAmount.toLocaleString()} {t("common.currency")}
                          </span>
                          <span className="font-medium text-primary">
                            {Math.round((c.currentAmount / c.targetAmount) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((c.currentAmount / c.targetAmount) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
