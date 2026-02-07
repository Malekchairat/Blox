import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { HearingAccessibilityPanel } from "@/components/HearingAccessibilityPanel";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Moon, Sun, ArrowLeft, Crown, Shield, Award, Star,
  Users, Heart, LogOut, Building2, Sparkles, Video,
  Clock, CheckCircle, XCircle, UserCheck, UserX,
} from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIER_CONFIG = {
  bronze: {
    label: "Bronze",
    icon: Shield,
    color: "text-amber-700 dark:text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    badgeCls: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    gradient: "from-amber-600 to-amber-800",
    nextTier: "silver" as const,
    nextAmount: 5000,
    perks: ["Access to community feed", "Join open meetings", "Membership badge"],
  },
  silver: {
    label: "Silver",
    icon: Award,
    color: "text-slate-500 dark:text-slate-300",
    bg: "bg-slate-50 dark:bg-slate-900/30 border-slate-300 dark:border-slate-700",
    badgeCls: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    gradient: "from-slate-400 to-slate-600",
    nextTier: "gold" as const,
    nextAmount: 20000,
    perks: ["All Bronze perks", "Priority meeting access", "Monthly newsletter", "Silver badge"],
  },
  gold: {
    label: "Gold",
    icon: Star,
    color: "text-yellow-500 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700",
    badgeCls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    gradient: "from-yellow-400 to-yellow-600",
    nextTier: "platinum" as const,
    nextAmount: 50000,
    perks: ["All Silver perks", "Exclusive events", "Direct association contact", "Gold badge"],
  },
  platinum: {
    label: "Platinum",
    icon: Crown,
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700",
    badgeCls: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    gradient: "from-purple-500 to-purple-700",
    nextTier: null,
    nextAmount: null,
    perks: ["All Gold perks", "VIP access to all events", "Annual appreciation ceremony", "Platinum badge"],
  },
} as const;

function getTierProgress(tier: keyof typeof TIER_CONFIG, totalDonated: number) {
  const config = TIER_CONFIG[tier];
  if (!config.nextAmount) return 100;
  const prevAmount = tier === "bronze" ? 0 : tier === "silver" ? 5000 : tier === "gold" ? 20000 : 50000;
  const progress = ((totalDonated - prevAmount) / (config.nextAmount - prevAmount)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

export default function Memberships() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { theme, toggleTheme } = useTheme();

  const isAssociation = user?.role === "association" || user?.role === "admin";

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
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                {isAssociation ? "Member Management" : "My Memberships"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/meetings" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Meetings
              </Link>
            </Button>
            <LanguageSwitcher />
            <NeurodivergentPanel />
            <AccessibilityMenu />
            <HearingAccessibilityPanel />
            <Button variant="outline" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container">
          {isAssociation ? <AssociationMembershipsView /> : <DonorMembershipsView />}
        </div>
      </main>
    </div>
  );
}

// ── Association View: manage incoming requests ──────────────

function AssociationMembershipsView() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: pendingRequests, isLoading: pendingLoading } = trpc.memberships.getPendingRequests.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const { data: members, isLoading: membersLoading } = trpc.memberships.getMembers.useQuery(
    { associationId: user!.id },
    { retry: false, enabled: !!user }
  );

  const approveMutation = trpc.memberships.approve.useMutation({
    onSuccess: () => {
      utils.memberships.getPendingRequests.invalidate();
      utils.memberships.getMembers.invalidate();
      utils.memberships.getMemberCount.invalidate();
    },
  });

  const rejectMutation = trpc.memberships.reject.useMutation({
    onSuccess: () => {
      utils.memberships.getPendingRequests.invalidate();
    },
  });

  const approvedMembers = members?.filter((m: any) => m.status === "approved") ?? [];

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{approvedMembers.length}</div>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{pendingRequests?.length ?? 0}</div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Heart className="h-8 w-8 text-red-500" fill="currentColor" />
              <div>
                <div className="text-2xl font-bold">
                  {(approvedMembers.reduce((s: number, m: any) => s + m.totalDonated, 0)).toLocaleString()} MAD
                </div>
                <p className="text-sm text-muted-foreground">Total Contributions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Pending Requests
            {(pendingRequests?.length ?? 0) > 0 && (
              <Badge className="ml-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs px-1.5">
                {pendingRequests!.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5">
            <UserCheck className="h-4 w-4" />
            Active Members ({approvedMembers.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="mt-6">
          {pendingLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
              <p className="mt-4 text-muted-foreground">Loading requests...</p>
            </div>
          ) : !pendingRequests || pendingRequests.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">
                  All membership requests have been reviewed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req: any) => (
                <Card key={req.id} className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {req.memberAvatar && <AvatarImage src={req.memberAvatar} />}
                          <AvatarFallback>{req.memberName?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{req.memberName || "User"}</p>
                          <p className="text-sm text-muted-foreground">{req.memberEmail}</p>
                          <p className="text-xs text-muted-foreground">
                            Requested {new Date(req.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          onClick={() => approveMutation.mutate({ membershipId: req.id })}
                          disabled={approveMutation.isPending}
                        >
                          <UserCheck className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => rejectMutation.mutate({ membershipId: req.id })}
                          disabled={rejectMutation.isPending}
                        >
                          <UserX className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Members Tab */}
        <TabsContent value="members" className="mt-6">
          {membersLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
              <p className="mt-4 text-muted-foreground">Loading members...</p>
            </div>
          ) : approvedMembers.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Members Yet</h3>
                <p className="text-muted-foreground">
                  Once donors request to join and you approve them, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvedMembers.map((member: any) => {
                const tier = TIER_CONFIG[member.tier as keyof typeof TIER_CONFIG];
                const TierIcon = tier.icon;
                return (
                  <Card key={member.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {member.memberAvatar && <AvatarImage src={member.memberAvatar} />}
                            <AvatarFallback>{member.memberName?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{member.memberName || "User"}</p>
                            <p className="text-sm text-muted-foreground">
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <p className="font-medium">{member.totalDonated.toLocaleString()} MAD</p>
                            <p className="text-muted-foreground">donated</p>
                          </div>
                          <div className={`flex items-center gap-1 ${tier.color}`}>
                            <TierIcon className="h-5 w-5" />
                            <Badge className={tier.badgeCls}>{tier.label}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Donor View: see my memberships + discover ──────────────

function DonorMembershipsView() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: memberships, isLoading } = trpc.memberships.getMy.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const { data: associations } = trpc.socialFollows.searchAssociations.useQuery(undefined, {
    retry: false,
  });

  const joinMutation = trpc.memberships.join.useMutation({
    onSuccess: () => utils.memberships.getMy.invalidate(),
  });

  const leaveMutation = trpc.memberships.leave.useMutation({
    onSuccess: () => utils.memberships.getMy.invalidate(),
  });

  const memberAssociationIds = new Set(memberships?.map(m => m.associationId) ?? []);
  const approvedMemberships = memberships?.filter(m => m.status === "approved") ?? [];
  const pendingMemberships = memberships?.filter(m => m.status === "pending") ?? [];

  // Only show associations not already requested/joined
  const joinableAssociations = associations?.filter(a => !memberAssociationIds.has(a.id) && a.id !== user?.id) ?? [];

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{approvedMemberships.length}</div>
                <p className="text-sm text-muted-foreground">Active Memberships</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Heart className="h-8 w-8 text-red-500" fill="currentColor" />
              <div>
                <div className="text-2xl font-bold">
                  {(approvedMemberships.reduce((s, m) => s + m.totalDonated, 0)).toLocaleString()} MAD
                </div>
                <p className="text-sm text-muted-foreground">Total Contributed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Crown className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {approvedMemberships.length > 0
                    ? TIER_CONFIG[approvedMemberships.reduce((best, m) => {
                        const order = ["bronze", "silver", "gold", "platinum"] as const;
                        return order.indexOf(m.tier) > order.indexOf(best) ? m.tier : best;
                      }, approvedMemberships[0].tier)].label
                    : "—"}
                </div>
                <p className="text-sm text-muted-foreground">Highest Tier</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingMemberships.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Requests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingMemberships.map(m => (
              <Card key={m.id} className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {m.associationAvatar && <AvatarImage src={m.associationAvatar} />}
                        <AvatarFallback><Building2 className="h-5 w-5" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{m.associationName || "Association"}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(m.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting Approval
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => leaveMutation.mutate({ associationId: m.associationId })}
                        disabled={leaveMutation.isPending}
                        title="Cancel request"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved Memberships */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Your Memberships
        </h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <p className="mt-4 text-muted-foreground">Loading memberships...</p>
          </div>
        ) : approvedMemberships.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Memberships</h3>
              <p className="text-muted-foreground mb-4">
                {pendingMemberships.length > 0
                  ? "Your requests are awaiting approval from the associations."
                  : "Request to join an association below to become a member!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedMemberships.map(m => {
              const tier = TIER_CONFIG[m.tier];
              const TierIcon = tier.icon;
              const progress = getTierProgress(m.tier, m.totalDonated);

              return (
                <Card key={m.id} className={`border-2 ${tier.bg} transition-all hover:shadow-lg`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          {m.associationAvatar && <AvatarImage src={m.associationAvatar} />}
                          <AvatarFallback><Building2 className="h-6 w-6" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{m.associationName || "Association"}</CardTitle>
                          <CardDescription>
                            Member since {new Date(m.joinedAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 ${tier.color}`}>
                        <TierIcon className="h-6 w-6" />
                        <Badge className={tier.badgeCls}>{tier.label}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">
                          Contributed: {m.totalDonated.toLocaleString()} MAD
                        </span>
                        {tier.nextAmount && (
                          <span className="text-muted-foreground">
                            → {TIER_CONFIG[tier.nextTier!].label} at {tier.nextAmount.toLocaleString()} MAD
                          </span>
                        )}
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Perks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tier.perks.map(perk => (
                          <Badge key={perk} variant="outline" className="text-xs">{perk}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button asChild variant="default" size="sm" className="flex-1">
                      <Link href={`/association/${m.associationId}`}>
                        View Association
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/meetings">
                        <Video className="h-4 w-4 mr-1" /> Meetings
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => leaveMutation.mutate({ associationId: m.associationId })}
                      disabled={leaveMutation.isPending}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Discover Associations — donors only */}
      {joinableAssociations.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Discover Associations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinableAssociations.map(a => (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {a.avatar && <AvatarImage src={a.avatar} />}
                      <AvatarFallback><Building2 className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{a.name || "Association"}</CardTitle>
                      {a.bio && (
                        <CardDescription className="line-clamp-2 text-xs">{a.bio}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardFooter>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => joinMutation.mutate({ associationId: a.id })}
                    disabled={joinMutation.isPending}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Request to Join
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tier Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Membership Tiers
          </CardTitle>
          <CardDescription>
            Your tier upgrades automatically as you donate to the association's cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["bronze", "silver", "gold", "platinum"] as const).map(tierKey => {
              const config = TIER_CONFIG[tierKey];
              const Icon = config.icon;
              return (
                <div key={tierKey} className={`rounded-xl border-2 p-4 ${config.bg}`}>
                  <div className={`flex items-center gap-2 mb-3 ${config.color}`}>
                    <Icon className="h-6 w-6" />
                    <span className="font-bold text-lg">{config.label}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {config.perks.map(perk => (
                      <li key={perk} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    {tierKey === "bronze" && "0 – 4,999 MAD"}
                    {tierKey === "silver" && "5,000 – 19,999 MAD"}
                    {tierKey === "gold" && "20,000 – 49,999 MAD"}
                    {tierKey === "platinum" && "50,000+ MAD"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
