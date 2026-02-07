import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PostCard } from "@/components/social/PostCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, ArrowLeft, Compass, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function Feed() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();

  const {
    data: posts,
    isLoading,
    refetch,
  } = trpc.socialPosts.feed.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

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
            <h1 className="text-lg font-bold">{t("social.feed")}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/discover">
              <Button variant="ghost" size="icon" title={t("social.discover")}>
                <Compass className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <LanguageSwitcher />
            <AccessibilityMenu />
            <Link href="/profile">
              <Avatar className="h-7 w-7 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                {user?.avatar && <AvatarImage src={user.avatar} alt={user.name || ""} />}
                <AvatarFallback className="text-[10px] font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Feed content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Compass className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">{t("social.emptyFeed")}</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {t("social.emptyFeedDesc")}
            </p>
            <Link href="/discover">
              <Button className="mt-2">
                <Compass className="h-4 w-4 mr-2" />
                {t("social.discoverAssociations")}
              </Button>
            </Link>
          </div>
        ) : (
          posts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              isAuthenticated={isAuthenticated}
            />
          ))
        )}
      </main>
    </div>
  );
}
