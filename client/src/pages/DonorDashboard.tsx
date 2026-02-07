import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { HearingAccessibilityPanel } from "@/components/HearingAccessibilityPanel";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Heart, Moon, Sun, ArrowLeft, HandHeart, Eye, UserCircle, Bookmark, Users, Video,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function DonorDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { theme, toggleTheme } = useTheme();

  const { data: myDonations, isLoading } = trpc.donations.getMyDonations.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const { data: favorites } = trpc.favorites.list.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const totalDonated = myDonations?.reduce((sum, d) => sum + d.amount, 0) ?? 0;

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
              <HandHeart className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{t("donor.title")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NeurodivergentPanel />
            <AccessibilityMenu />
            <HearingAccessibilityPanel />
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={t("common.toggleTheme")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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
                  <Heart className="h-8 w-8 text-primary" fill="currentColor" />
                  <div>
                    <div className="text-2xl font-bold">{totalDonated.toLocaleString()} {t("common.currency")}</div>
                    <p className="text-sm text-muted-foreground">{t("donor.totalDonated")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <HandHeart className="h-8 w-8 text-secondary" />
                  <div>
                    <div className="text-2xl font-bold">{myDonations?.length ?? 0}</div>
                    <p className="text-sm text-muted-foreground">{t("donor.donationsMade")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = "/saved-cases"}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Bookmark className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{favorites?.length ?? 0}</div>
                    <p className="text-sm text-muted-foreground">{t("donor.followedCases")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/20" onClick={() => window.location.href = "/memberships"}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">My Memberships</p>
                    <p className="text-sm text-muted-foreground">View your association memberships & tiers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/20" onClick={() => window.location.href = "/meetings"}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Video className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="font-semibold">Meetings</p>
                    <p className="text-sm text-muted-foreground">Join upcoming video meetings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donation History */}
          <Card>
            <CardHeader>
              <CardTitle>{t("donor.donationHistory")}</CardTitle>
              <CardDescription>
                {t("donor.donationHistoryDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
                </div>
              ) : !myDonations || myDonations.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{t("donor.noDonations")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("donor.noDonationsHelp")}
                  </p>
                  <Button asChild size="sm">
                    <Link href="/">{t("donor.exploreCases")}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myDonations.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t("donor.donationId", { id: d.id })}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("donor.caseId", { id: d.caseId })}
                          {d.message && ` — ${d.message}`}
                        </p>
                      </div>
                      <Badge className="shrink-0 bg-primary/10 text-primary">
                        {d.amount.toLocaleString()} {t("common.currency")}
                      </Badge>
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
