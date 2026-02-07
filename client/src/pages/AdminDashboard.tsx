import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Heart, Moon, Sun, Users, BarChart3, CheckCircle, XCircle,
  AlertCircle, ArrowLeft, Shield,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { TranslatedText } from "@/components/TranslatedText";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { theme, toggleTheme } = useTheme();

  const { data: allCases, isLoading: casesLoading } = trpc.cases.list.useQuery({});
  const { data: allUsers } = trpc.admin.listUsers.useQuery(undefined, {
    retry: false,
  });
  const updateStatusMutation = trpc.admin.updateCaseStatus.useMutation();
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation();
  const utils = trpc.useUtils();

  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("common.accessDenied")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("admin.onlyAdmins")}
          </p>
          <Button asChild>
            <Link href="/">{t("common.backToHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const pendingCases = allCases?.filter(c => c.status === "pending") ?? [];
  const approvedCases = allCases?.filter(c => c.status === "approved") ?? [];

  const handleStatusChange = async (caseId: number, status: "approved" | "rejected") => {
    try {
      await updateStatusMutation.mutateAsync({ caseId, status });
      toast.success(status === "approved" ? t("admin.caseApproved") : t("admin.caseRejected"));
      await utils.cases.list.invalidate();
      await utils.admin.listUsers.invalidate();
    } catch {
      toast.error(t("admin.updateError"));
    }
  };

  const handleRoleChange = async (userId: number, role: "donor" | "association" | "admin") => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
      toast.success(t("admin.roleUpdated"));
      await utils.admin.listUsers.invalidate();
    } catch {
      toast.error(t("admin.roleUpdateError"));
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      association: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      donor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return <Badge className={variants[role] || ""}>{t(`roles.${role}`)}</Badge>;
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
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{t("admin.title")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{allCases?.length ?? 0}</div>
                    <p className="text-sm text-muted-foreground">{t("admin.totalCases")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">{pendingCases.length}</div>
                    <p className="text-sm text-muted-foreground">{t("admin.pending")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{approvedCases.length}</div>
                    <p className="text-sm text-muted-foreground">{t("admin.approved")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{allUsers?.length ?? 0}</div>
                    <p className="text-sm text-muted-foreground">{t("admin.users")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                {t("admin.pendingApproval")}
              </CardTitle>
              <CardDescription>
                {t("admin.pendingApprovalDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
              ) : pendingCases.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">{t("admin.noPending")}</p>
              ) : (
                <div className="space-y-4">
                  {pendingCases.map(c => (
                    <div key={c.id} className="flex items-start justify-between p-4 border rounded-lg gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate"><TranslatedText text={c.title} /></h3>
                          {c.isUrgent && (
                            <Badge variant="destructive" className="shrink-0">{t("common.urgent")}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2"><TranslatedText text={c.description} /></p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{t(`categories.${c.category}`)}</Badge>
                          <span className="text-sm text-muted-foreground">{c.targetAmount.toLocaleString()} {t("common.currency")}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                          onClick={() => handleStatusChange(c.id, "approved")}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t("admin.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => handleStatusChange(c.id, "rejected")}
                          disabled={updateStatusMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {t("admin.reject")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                {t("admin.userManagement")}
              </CardTitle>
              <CardDescription>
                {t("admin.userManagementDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!allUsers ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
              ) : allUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">{t("admin.noUsers")}</p>
              ) : (
                <div className="space-y-3">
                  {allUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {u.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.name || t("common.noName")}</p>
                          <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {getRoleBadge(u.role)}
                        {u.id !== user?.id && (
                          <select
                            className="text-sm border rounded px-2 py-1 bg-background"
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <option value="donor">{t("roles.donor")}</option>
                            <option value="association">{t("roles.association")}</option>
                            <option value="admin">{t("roles.admin")}</option>
                          </select>
                        )}
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
