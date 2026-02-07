import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Heart, ArrowLeft, ExternalLink, AlertCircle, Moon, Sun, Eye, Calendar } from "lucide-react";
import { Link, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { TranslatedText } from "@/components/TranslatedText";

export default function CaseDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const caseId = parseInt(id || "0");
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { data: caseData, isLoading } = trpc.cases.getById.useQuery({ id: caseId });
  const { data: donations } = trpc.donations.getByCase.useQuery({ caseId });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      health: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      disability: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      children: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      education: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      renovation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      emergency: "bg-destructive/20 text-destructive dark:bg-destructive/30",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">{t("caseDetail.loadingCase")}</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("caseDetail.notFoundTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("caseDetail.notFoundSubtitle")}</p>
          <Button asChild>
            <Link href="/">{t("common.backToHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.min(
    (caseData.currentAmount / caseData.targetAmount) * 100,
    100
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip to content */}
      <a href="#case-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded">
        {t("home.skipToContent")}
      </a>

      {/* Header */}
      <header role="banner" className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                {t("common.appName")}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <AccessibilityMenu />
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
            
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user?.name}
                </span>
                <Button variant="outline" onClick={logout}>
                  {t("common.logout")}
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/login">{t("common.login")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="case-content" role="main" className="flex-1 py-8">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Case Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <Badge className={getCategoryColor(caseData.category)}>
                      {t(`categories.${caseData.category}`)}
                    </Badge>
                    {caseData.isUrgent && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {t("common.urgent")}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-3xl"><TranslatedText text={caseData.title} /></CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm pt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(caseData.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {caseData.viewCount} {t("caseDetail.views")}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cover Image */}
                  {caseData.coverImage && (
                    <div className="rounded-lg overflow-hidden">
                      <img
                        src={caseData.coverImage}
                        alt={caseData.title}
                        className="w-full h-64 sm:h-80 object-cover"
                      />
                    </div>
                  )}

                  {/* Photos Gallery */}
                  {caseData.photos && caseData.photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {caseData.photos.map((photo: any) => (
                        <img
                          key={photo.id}
                          src={photo.photoUrl}
                          alt={`Photo ${photo.displayOrder + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">
                      {t("caseDetail.fullStory")}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      <TranslatedText text={caseData.description} />
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Donations List */}
              {donations && donations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("caseDetail.recentDonations")}</CardTitle>
                    <CardDescription>
                      {t("caseDetail.donationsCount", { count: donations.length })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {donations.slice(0, 5).map((donation: any) => (
                        <div
                          key={donation.id}
                          className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">
                              {donation.isAnonymous ? t("caseDetail.anonymousDonor") : t("caseDetail.donorLabel")}
                            </p>
                            {donation.message && (
                              <p className="text-sm text-muted-foreground mt-1">
                                "{donation.message}"
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(donation.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-bold text-primary">
                            {donation.amount.toLocaleString()} {t("common.currency")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Donation Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>{t("caseDetail.supportCase")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("caseDetail.collected")}</span>
                      <span className="font-bold text-primary">
                        {caseData.currentAmount.toLocaleString()} {t("common.currency")}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                        role="progressbar"
                        aria-valuenow={caseData.currentAmount}
                        aria-valuemin={0}
                        aria-valuemax={caseData.targetAmount}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("caseDetail.goal")}</span>
                      <span className="font-semibold text-foreground">
                        {caseData.targetAmount.toLocaleString()} {t("common.currency")}
                      </span>
                    </div>
                    <div className="text-center pt-2">
                      <span className="text-2xl font-bold text-foreground">
                        {progressPercentage.toFixed(0)}%
                      </span>
                      <p className="text-xs text-muted-foreground">{t("caseDetail.goalReached")}</p>
                    </div>
                  </div>

                  {/* Donate Button */}
                  <Button
                    asChild
                    size="lg"
                    className="w-full"
                  >
                    <a
                      href={caseData.cha9a9aLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <Heart className="h-5 w-5" fill="currentColor" />
                      {t("caseDetail.supportNow")}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {t("caseDetail.redirectInfo")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
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
