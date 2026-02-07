import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { HearingAccessibilityPanel } from "@/components/HearingAccessibilityPanel";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Heart, Search, AlertCircle, Moon, Sun, Users, TrendingUp, Plus, LayoutDashboard, UserCircle, Rss, Compass, Bookmark, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { TranslatedText } from "@/components/TranslatedText";
import { SaveButton } from "@/components/SaveButton";

export default function Home() {
  const { t } = useTranslation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Redirect associations directly to their dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && user?.role === "association") {
      navigate("/dashboard/association");
    }
  }, [loading, isAuthenticated, user?.role, navigate]);

  const { data: cases, isLoading: casesLoading } = trpc.cases.list.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  const categoryKeys = ["health", "disability", "children", "education", "renovation", "emergency"] as const;

  const categories = [
    { value: "all", label: t("home.allCategories") },
    ...categoryKeys.map((key) => ({ value: key, label: t(`categories.${key}`) })),
  ];

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip to content link for keyboard / screen reader users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded">
        {t("home.skipToContent")}
      </a>

      {/* Header */}
      <header role="banner" className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" fill="currentColor" />
            <h1 className="text-xl font-bold text-foreground">
              {t("common.appName")}
            </h1>
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
            
            {isAuthenticated ? (
              <>
                <Button asChild variant="ghost" size="icon" title={t("social.feed")}>
                  <Link href="/feed">
                    <Rss className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title={t("social.discover")}>
                  <Link href="/discover">
                    <Compass className="h-5 w-5" />
                  </Link>
                </Button>
                {user?.role === "donor" && (
                  <Button asChild variant="ghost" size="icon" title={t("savedCases.title")}>
                    <Link href="/saved-cases">
                      <Bookmark className="h-5 w-5" />
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="icon" title="Memberships">
                  <Link href="/memberships">
                    <Users className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title="Meetings">
                  <Link href="/meetings">
                    <Video className="h-5 w-5" />
                  </Link>
                </Button>
                {(user?.role === "association" || user?.role === "admin") && (
                  <Button asChild variant="default">
                    <Link href="/create-case">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("common.newCase")}
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href={`/dashboard/${user?.role === "admin" ? "admin" : user?.role === "association" ? "association" : "donor"}`}>
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    {t("common.dashboard")}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/profile" className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {user?.avatar && <AvatarImage src={user.avatar} alt={user.name || ""} />}
                      <AvatarFallback className="text-[10px] font-medium">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {user?.name || t("profile.title")}
                  </Link>
                </Button>
                <Button variant="outline" onClick={logout}>
                  {t("common.logout")}
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="icon" title={t("social.discover")}>
                  <Link href="/discover">
                    <Compass className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/login">{t("common.login")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="main-content" role="main">
      <section aria-label={t("home.presentation")} className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
              {t("home.heroTitle")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("home.heroSubtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-8 pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">+300 000</div>
                  <div className="text-sm text-muted-foreground">{t("home.beneficiaries")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-8 w-8 text-secondary" fill="currentColor" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">44</div>
                  <div className="text-sm text-muted-foreground">{t("home.activeMembers")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">100%</div>
                  <div className="text-sm text-muted-foreground">{t("home.transparency")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section aria-label={t("home.searchFilters")} className="py-8 border-b bg-card">
        <div className="container">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("home.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label={t("home.searchPlaceholder")}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[240px]" aria-label={t("home.filterCategory")}>
                <SelectValue placeholder={t("home.filterCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Cases Grid */}
      <section aria-label={t("home.socialCases")} className="py-12 flex-1">
        <div className="container">
          {casesLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">{t("home.loadingCases")}</p>
            </div>
          ) : cases && cases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.map((caseItem) => (
                <Card key={caseItem.id} className="flex flex-col hover:shadow-lg transition-shadow overflow-hidden" role="article" aria-label={caseItem.title}>
                  {caseItem.coverImage && (
                    <div className="relative w-full h-48">
                      <img
                        src={caseItem.coverImage}
                        alt={caseItem.title}
                        className="w-full h-full object-cover"
                      />
                      {caseItem.isUrgent && (
                        <Badge variant="destructive" className="absolute top-3 right-3 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {t("common.urgent")}
                        </Badge>
                      )}
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge className={getCategoryColor(caseItem.category)}>
                        {t(`categories.${caseItem.category}`)}
                      </Badge>
                      {!caseItem.coverImage && caseItem.isUrgent && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {t("common.urgent")}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2"><TranslatedText text={caseItem.title} /></CardTitle>
                    {caseItem.associationName && (
                      <p className="text-xs text-primary font-medium mt-1">
                        {t("caseDetail.by", "Par")} {caseItem.associationName}
                      </p>
                    )}
                    <CardDescription className="line-clamp-3">
                      <TranslatedText text={caseItem.description} />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("home.goal")}</span>
                        <span className="font-semibold text-foreground">
                          {caseItem.targetAmount.toLocaleString()} {t("common.currency")}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (caseItem.currentAmount / caseItem.targetAmount) * 100,
                              100
                            )}%`,
                          }}
                          role="progressbar"
                          aria-valuenow={caseItem.currentAmount}
                          aria-valuemin={0}
                          aria-valuemax={caseItem.targetAmount}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("home.collected")}</span>
                        <span className="font-semibold text-primary">
                          {caseItem.currentAmount.toLocaleString()} {t("common.currency")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/case/${caseItem.id}`}>{t("home.viewDetails")}</Link>
                    </Button>
                    {isAuthenticated && user?.role === "donor" && (
                      <SaveButton caseId={caseItem.id} />
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t("home.noCasesTitle")}
              </h3>
              <p className="text-muted-foreground">
                {t("home.noCasesSubtitle")}
              </p>
            </div>
          )}
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer role="contentinfo" className="border-t py-8 bg-card">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            {t("common.footer")}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t("common.footerQuote")}
          </p>
        </div>
      </footer>
    </div>
  );
}
