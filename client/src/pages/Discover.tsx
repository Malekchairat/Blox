import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AssociationCard } from "@/components/social/AssociationCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, ArrowLeft, Search, Rss, Loader2, Users } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function Discover() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: associations, isLoading } =
    trpc.socialFollows.searchAssociations.useQuery(
      { query: searchQuery || undefined },
      { placeholderData: (prev) => prev }
    );

  // Get which ones we follow
  const { data: followingIds } = trpc.socialFollows.followingIds.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const followingSet = new Set(followingIds || []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">{t("social.discover")}</h1>
          </div>
          <div className="flex items-center gap-1">
            {isAuthenticated && (
              <Link href="/feed">
                <Button variant="ghost" size="icon" title={t("social.feed")}>
                  <Rss className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <LanguageSwitcher />
            <AccessibilityMenu />
            {isAuthenticated && (
              <Link href="/profile">
                <Avatar className="h-7 w-7 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  {user?.avatar && <AvatarImage src={user.avatar} alt={user.name || ""} />}
                  <AvatarFallback className="text-[10px] font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("social.searchAssociations")}
            className="pl-9"
          />
        </div>
      </div>

      {/* Associations list */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !associations || associations.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">{t("social.noAssociations")}</h2>
            <p className="text-muted-foreground">
              {searchQuery
                ? t("social.noSearchResults")
                : t("social.noAssociationsYet")}
            </p>
          </div>
        ) : (
          associations.map((assoc: any) => (
            <AssociationCard
              key={assoc.id}
              association={assoc}
              isFollowing={followingSet.has(assoc.id)}
              isAuthenticated={isAuthenticated}
              followersCount={assoc.followersCount}
            />
          ))
        )}
      </main>
    </div>
  );
}
