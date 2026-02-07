import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SaveButton } from "@/components/SaveButton";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Heart, ArrowLeft, AlertCircle, Moon, Sun, Bookmark } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { TranslatedText } from "@/components/TranslatedText";

export default function SavedCases() {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { theme, toggleTheme } = useTheme();

  const { data: savedCases, isLoading } = trpc.favorites.listWithCases.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

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
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Bookmark className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{t("savedCases.title")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NeurodivergentPanel />
            <AccessibilityMenu />
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={t("common.toggleTheme")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {isAuthenticated && (
              <>
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
                <Button variant="outline" onClick={logout}>{t("common.logout")}</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container">
          <div className="mb-6">
            <p className="text-muted-foreground">{t("savedCases.subtitle")}</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
              <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : savedCases && savedCases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCases.map((item) => (
                <Card key={item.favoriteId} className="flex flex-col hover:shadow-lg transition-shadow overflow-hidden">
                  {item.coverImage && (
                    <div className="relative w-full h-48">
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {item.isUrgent && (
                        <Badge variant="destructive" className="absolute top-3 right-3 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {t("common.urgent")}
                        </Badge>
                      )}
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge className={getCategoryColor(item.category)}>
                        {t(`categories.${item.category}`)}
                      </Badge>
                      <SaveButton caseId={item.caseId} />
                    </div>
                    <CardTitle className="line-clamp-2"><TranslatedText text={item.title} /></CardTitle>
                    <CardDescription className="line-clamp-3">
                      <TranslatedText text={item.description} />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("home.goal")}</span>
                        <span className="font-semibold text-foreground">
                          {item.targetAmount.toLocaleString()} {t("common.currency")}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((item.currentAmount / item.targetAmount) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("home.collected")}</span>
                        <span className="font-semibold text-primary">
                          {item.currentAmount.toLocaleString()} {t("common.currency")}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      {t("savedCases.savedOn", { date: new Date(item.savedAt).toLocaleDateString() })}
                    </p>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/case/${item.caseId}`}>{t("home.viewDetails")}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t("savedCases.empty")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("savedCases.emptyDesc")}
              </p>
              <Button asChild>
                <Link href="/">{t("donor.exploreCases")}</Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">{t("common.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
