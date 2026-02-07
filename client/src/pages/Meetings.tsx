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
  Moon, Sun, ArrowLeft, Video, VideoOff, Plus, Calendar,
  Clock, Users, Building2, Radio, PlayCircle, XCircle,
  ExternalLink, Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useCallback } from "react";

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: typeof Radio }> = {
  scheduled: {
    label: "Scheduled",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: Calendar,
  },
  live: {
    label: "Live Now",
    cls: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse",
    icon: Radio,
  },
  ended: {
    label: "Ended",
    cls: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    icon: VideoOff,
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: XCircle,
  },
};

function JitsiMeetFrame({ roomName, displayName, onClose }: { roomName: string; displayName: string; onClose: () => void }) {
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinConfig.enabled=false`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-red-500" />
          <span className="font-semibold">Live Meeting</span>
          <Badge className="bg-red-100 text-red-800 animate-pulse">LIVE</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.open(jitsiUrl, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-1" /> Open in New Tab
          </Button>
          <Button variant="destructive" size="sm" onClick={onClose}>
            Leave Meeting
          </Button>
        </div>
      </div>
      <iframe
        src={jitsiUrl}
        className="flex-1 w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        title="Jitsi Meeting"
      />
    </div>
  );
}

function CreateMeetingDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [membersOnly, setMembersOnly] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(50);

  const createMutation = trpc.meetings.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setDuration(60);
      setMembersOnly(true);
      setMaxParticipants(50);
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Schedule a Meeting
          </DialogTitle>
          <DialogDescription>
            Create a Jitsi video meeting for your members
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              placeholder="e.g. Monthly Community Check-in"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What will be discussed..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date & Time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                max={480}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="membersOnly" className="text-sm font-medium">Members Only</Label>
                <p className="text-xs text-muted-foreground">Restrict to members</p>
              </div>
              <Switch
                id="membersOnly"
                checked={membersOnly}
                onCheckedChange={setMembersOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={2}
                max={200}
                value={maxParticipants}
                onChange={e => setMaxParticipants(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({
              title,
              description: description || undefined,
              scheduledAt,
              duration,
              membersOnly,
              maxParticipants,
            })}
            disabled={!title || !scheduledAt || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Schedule Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Meetings() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { theme, toggleTheme } = useTheme();
  const [activeJitsi, setActiveJitsi] = useState<{ roomName: string } | null>(null);

  const isAssociation = user?.role === "association" || user?.role === "admin";

  // For associations: their own meetings
  const { data: myMeetings, refetch: refetchMy } = trpc.meetings.listByAssociation.useQuery(
    isAssociation ? undefined : { associationId: 0 },
    { retry: false, enabled: !!user && isAssociation }
  );

  // For donors: upcoming meetings from associations they're members of
  const { data: upcomingMeetings, isLoading, refetch: refetchUpcoming } = trpc.meetings.upcoming.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const utils = trpc.useUtils();

  const joinMutation = trpc.meetings.join.useMutation();
  const statusMutation = trpc.meetings.updateStatus.useMutation({
    onSuccess: () => { refetchMy(); refetchUpcoming(); },
  });
  const deleteMutation = trpc.meetings.delete.useMutation({
    onSuccess: () => { refetchMy(); refetchUpcoming(); },
  });

  const handleJoinMeeting = useCallback((roomName: string, meetingId: number) => {
    joinMutation.mutate({ meetingId });
    setActiveJitsi({ roomName });
  }, [joinMutation]);

  const handleCloseMeeting = useCallback(() => {
    setActiveJitsi(null);
  }, []);

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const isUpcoming = (date: string | Date) => new Date(date) > new Date();

  const renderMeetingCard = (meeting: any, showAssociation = false, canManage = false) => {
    const status = STATUS_STYLES[meeting.status] || STATUS_STYLES.scheduled;
    const StatusIcon = status.icon;

    return (
      <Card key={meeting.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {showAssociation && (
                <Avatar className="h-10 w-10 shrink-0">
                  {meeting.associationAvatar && <AvatarImage src={meeting.associationAvatar} />}
                  <AvatarFallback><Building2 className="h-5 w-5" /></AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{meeting.title}</CardTitle>
                {showAssociation && (
                  <CardDescription className="truncate">
                    {meeting.associationName || "Association"}
                  </CardDescription>
                )}
              </div>
            </div>
            <Badge className={`shrink-0 ${status.cls}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {meeting.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{meeting.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(meeting.scheduledAt)}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatTime(meeting.scheduledAt)} · {meeting.duration}min
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Max {meeting.maxParticipants}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {meeting.membersOnly && (
              <Badge variant="outline" className="text-xs">Members Only</Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 flex-wrap">
          {(meeting.status === "live" || (meeting.status === "scheduled" && !isUpcoming(meeting.scheduledAt))) && (
            <Button
              size="sm"
              className="gap-1.5 bg-red-600 hover:bg-red-700"
              onClick={() => handleJoinMeeting(meeting.roomName, meeting.id)}
            >
              <Video className="h-4 w-4" />
              Join Now
            </Button>
          )}
          {meeting.status === "scheduled" && isUpcoming(meeting.scheduledAt) && (
            <Button size="sm" variant="outline" disabled className="gap-1.5">
              <Clock className="h-4 w-4" />
              Starts {formatDate(meeting.scheduledAt)} at {formatTime(meeting.scheduledAt)}
            </Button>
          )}
          {canManage && (
            <>
              {meeting.status === "scheduled" && (
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5"
                  onClick={() => statusMutation.mutate({ meetingId: meeting.id, status: "live" })}
                >
                  <PlayCircle className="h-4 w-4" />
                  Go Live
                </Button>
              )}
              {meeting.status === "live" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => statusMutation.mutate({ meetingId: meeting.id, status: "ended" })}
                >
                  <VideoOff className="h-4 w-4" />
                  End
                </Button>
              )}
              {(meeting.status === "scheduled" || meeting.status === "ended") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate({ meetingId: meeting.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Jitsi fullscreen overlay */}
      {activeJitsi && (
        <JitsiMeetFrame
          roomName={activeJitsi.roomName}
          displayName={user?.name || "User"}
          onClose={handleCloseMeeting}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Meetings</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/memberships" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Memberships
              </Link>
            </Button>
            {isAssociation && (
              <CreateMeetingDialog onCreated={() => { refetchMy(); }} />
            )}
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
        <div className="container space-y-8">
          {isAssociation ? (
            /* Association View: tabs for My Meetings and Member Meetings */
            <Tabs defaultValue="my-meetings">
              <TabsList>
                <TabsTrigger value="my-meetings" className="gap-1.5">
                  <Building2 className="h-4 w-4" />
                  My Meetings
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Upcoming (as Member)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-meetings" className="mt-6">
                {!myMeetings || myMeetings.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Meetings Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Schedule your first meeting and invite your members!
                      </p>
                      <CreateMeetingDialog onCreated={() => refetchMy()} />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myMeetings.map(m => renderMeetingCard(m, false, true))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="mt-6">
                {!upcomingMeetings || upcomingMeetings.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Upcoming Meetings</h3>
                      <p className="text-muted-foreground">
                        Join associations as a member to see their meetings here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingMeetings.map(m => renderMeetingCard(m, true))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            /* Donor View: upcoming meetings from memberships */
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Upcoming Meetings
              </h2>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  <p className="mt-4 text-muted-foreground">Loading meetings...</p>
                </div>
              ) : !upcomingMeetings || upcomingMeetings.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Upcoming Meetings</h3>
                    <p className="text-muted-foreground mb-4">
                      Join associations to see their scheduled meetings here.
                    </p>
                    <Button asChild>
                      <Link href="/memberships">
                        <Users className="h-4 w-4 mr-2" />
                        Browse Memberships
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingMeetings.map(m => renderMeetingCard(m, true))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
