import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PostCard } from "@/components/social/PostCard";
import { FollowButton } from "@/components/social/FollowButton";
import { CreatePostDialog } from "@/components/social/CreatePostDialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, ArrowLeft, Loader2, Grid3X3, Users, Video, Crown, Clock } from "lucide-react";
import { Link, useParams } from "wouter";
import { useTranslation } from "react-i18next";

export default function AssociationProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const associationId = parseInt(id, 10);
  const isOwner = user?.id === associationId;

  const { data: profile, isLoading: profileLoading } =
    trpc.socialFollows.getAssociationProfile.useQuery(
      { associationId },
      { enabled: !isNaN(associationId) }
    );

  const { data: posts, isLoading: postsLoading } =
    trpc.socialPosts.listByAssociation.useQuery(
      { associationId },
      { enabled: !isNaN(associationId) }
    );

  const { data: isFollowing } = trpc.socialFollows.isFollowing.useQuery(
    { associationId },
    { enabled: isAuthenticated && !isNaN(associationId) }
  );

  const { data: followersCount } = trpc.socialFollows.followersCount.useQuery(
    { userId: associationId },
    { enabled: !isNaN(associationId) }
  );

  const { data: membershipStatus } = trpc.memberships.getStatus.useQuery(
    { associationId },
    { enabled: isAuthenticated && !isNaN(associationId) && !isOwner }
  );

  const { data: memberCount } = trpc.memberships.getMemberCount.useQuery(
    { associationId },
    { enabled: !isNaN(associationId) }
  );

  const utils = trpc.useUtils();
  const joinMembership = trpc.memberships.join.useMutation({
    onSuccess: () => {
      utils.memberships.getStatus.invalidate({ associationId });
      utils.memberships.getMemberCount.invalidate({ associationId });
    },
  });
  const leaveMembership = trpc.memberships.leave.useMutation({
    onSuccess: () => {
      utils.memberships.getStatus.invalidate({ associationId });
      utils.memberships.getMemberCount.invalidate({ associationId });
    },
  });

  if (isNaN(associationId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
      </div>
    );
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
            <h1 className="text-lg font-bold truncate">
              {profile?.name || t("social.association")}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <LanguageSwitcher />
            <AccessibilityMenu />
          </div>
        </div>
      </header>

      {profileLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : profile ? (
        <>
          {/* Profile header section */}
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                {profile.avatar && <AvatarImage src={profile.avatar} alt={profile.name || ""} />}
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {profile.name?.charAt(0)?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold">{profile.name}</h2>
                  <Badge variant="secondary">{t("social.association")}</Badge>
                </div>

                {/* Stats row */}
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <span className="font-bold block">{posts?.length || 0}</span>
                    <span className="text-muted-foreground">{t("social.posts")}</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold block">{followersCount || 0}</span>
                    <span className="text-muted-foreground">{t("social.followers")}</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold block">{memberCount || 0}</span>
                    <span className="text-muted-foreground">Members</span>
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {isOwner ? (
                    <>
                      <CreatePostDialog />
                      <Button asChild variant="outline" size="sm">
                        <Link href="/meetings">
                          <Video className="h-4 w-4 mr-1" /> Meetings
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <FollowButton
                        associationId={associationId}
                        initialFollowing={isFollowing || false}
                        isAuthenticated={isAuthenticated}
                      />
                      {isAuthenticated && (
                        membershipStatus?.status === "approved" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => leaveMembership.mutate({ associationId })}
                            disabled={leaveMembership.isPending}
                          >
                            <Crown className="h-4 w-4 text-amber-500" />
                            Member ({membershipStatus.tier})
                          </Button>
                        ) : membershipStatus?.status === "pending" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 cursor-default opacity-80"
                            disabled
                          >
                            <Clock className="h-4 w-4 text-yellow-500" />
                            Request Pending
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1"
                            onClick={() => joinMembership.mutate({ associationId })}
                            disabled={joinMembership.isPending}
                          >
                            <Users className="h-4 w-4" />
                            Request to Join
                          </Button>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Posts section */}
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Grid3X3 className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                {t("social.posts")}
              </span>
            </div>

            {postsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">{t("social.noPosts")}</p>
                {isOwner && <CreatePostDialog />}
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post: any) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{t("common.notFound")}</p>
        </div>
      )}
    </div>
  );
}
