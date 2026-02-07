import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { NeurodivergentPanel } from "@/components/NeurodivergentPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Edit,
  Moon,
  Plus,
  Search,
  Shield,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type UserRole = "donor" | "association" | "admin";

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  bio: string;
}

const emptyForm: UserFormData = {
  name: "",
  email: "",
  role: "donor",
  phone: "",
  bio: "",
};

export default function AdminUsers() {
  const { t } = useTranslation();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { theme, toggleTheme } = useTheme();

  // State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);

  // Queries
  const { data: allUsers, isLoading } = trpc.admin.listUsers.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      toast.success(t("admin.userCreated", "Utilisateur créé avec succès"));
      utils.admin.listUsers.invalidate();
      setCreateOpen(false);
      setFormData(emptyForm);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success(t("admin.userUpdated", "Utilisateur mis à jour avec succès"));
      utils.admin.listUsers.invalidate();
      setEditOpen(false);
      setFormData(emptyForm);
      setSelectedUserId(null);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(t("admin.userDeleted", "Utilisateur supprimé avec succès"));
      utils.admin.listUsers.invalidate();
      setDeleteOpen(false);
      setSelectedUserId(null);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Access check
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("common.accessDenied")}</h2>
          <Button asChild>
            <Link href="/">{t("common.backToHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Filter users
  const filteredUsers = (allUsers ?? []).filter((u) => {
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      association: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      donor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return <Badge className={variants[role] || ""}>{t(`roles.${role}`, role)}</Badge>;
  };

  const openEdit = (u: { id: number; name: string | null; email: string | null; role: string }) => {
    setSelectedUserId(u.id);
    setFormData({
      name: u.name || "",
      email: u.email || "",
      role: u.role as UserRole,
      phone: "",
      bio: "",
    });
    setEditOpen(true);
  };

  const openDelete = (userId: number) => {
    setSelectedUserId(userId);
    setDeleteOpen(true);
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      email: formData.email,
      role: formData.role,
      phone: formData.phone || undefined,
      bio: formData.bio || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedUserId) return;
    updateMutation.mutate({
      userId: selectedUserId,
      name: formData.name || undefined,
      email: formData.email || undefined,
      role: formData.role,
      phone: formData.phone || undefined,
      bio: formData.bio || undefined,
    });
  };

  const handleDelete = () => {
    if (!selectedUserId) return;
    deleteMutation.mutate({ userId: selectedUserId });
  };

  // ---- Render ----
  const userForm = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">{t("admin.userName", "Nom")}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("admin.userNamePlaceholder", "Nom complet")}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">{t("admin.userEmail", "Email")}</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="user@example.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">{t("admin.userRole", "Rôle")}</Label>
        <Select
          value={formData.role}
          onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="donor">{t("roles.donor", "Donateur")}</SelectItem>
            <SelectItem value="association">{t("roles.association", "Association")}</SelectItem>
            <SelectItem value="admin">{t("roles.admin", "Admin")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">{t("admin.userPhone", "Téléphone")}</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder={t("admin.userPhonePlaceholder", "+216 XX XXX XXX")}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bio">{t("admin.userBio", "Bio")}</Label>
        <Input
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder={t("admin.userBioPlaceholder", "Description courte...")}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                {t("admin.userManagement", "Gestion des utilisateurs")}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NeurodivergentPanel />
            <AccessibilityMenu />
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={t("common.toggleTheme")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button variant="outline" onClick={logout}>
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.searchUsers", "Rechercher un utilisateur...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder={t("admin.filterByRole", "Filtrer par rôle")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allRoles", "Tous les rôles")}</SelectItem>
                  <SelectItem value="donor">{t("roles.donor", "Donateur")}</SelectItem>
                  <SelectItem value="association">{t("roles.association", "Association")}</SelectItem>
                  <SelectItem value="admin">{t("roles.admin", "Admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                setFormData(emptyForm);
                setCreateOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("admin.addUser", "Ajouter un utilisateur")}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{allUsers?.length ?? 0}</div>
                <p className="text-sm text-muted-foreground">{t("admin.totalUsers", "Utilisateurs totaux")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {allUsers?.filter((u) => u.role === "association").length ?? 0}
                </div>
                <p className="text-sm text-muted-foreground">{t("roles.association", "Associations")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {allUsers?.filter((u) => u.role === "donor").length ?? 0}
                </div>
                <p className="text-sm text-muted-foreground">{t("roles.donor", "Donateurs")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                {t("admin.userList", "Liste des utilisateurs")}
              </CardTitle>
              <CardDescription>
                {t(
                  "admin.userListDesc",
                  "Gérer les utilisateurs, modifier les rôles et supprimer les comptes."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">{t("common.loading")}</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {t("admin.noUsersFound", "Aucun utilisateur trouvé")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>{t("admin.userName", "Nom")}</TableHead>
                        <TableHead>{t("admin.userEmail", "Email")}</TableHead>
                        <TableHead>{t("admin.userRole", "Rôle")}</TableHead>
                        <TableHead>{t("admin.createdAt", "Créé le")}</TableHead>
                        <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-sm">{u.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-medium text-primary">
                                  {u.name?.charAt(0).toUpperCase() || "?"}
                                </span>
                              </div>
                              <span className="font-medium">{u.name || t("common.noName", "Sans nom")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(u)}
                                title={t("admin.editUser", "Modifier")}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {u.id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => openDelete(u.id)}
                                  title={t("admin.deleteUser", "Supprimer")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.addUser", "Ajouter un utilisateur")}</DialogTitle>
            <DialogDescription>
              {t("admin.addUserDesc", "Créer un nouveau compte utilisateur.")}
            </DialogDescription>
          </DialogHeader>
          {userForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel", "Annuler")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formData.name || !formData.email}
            >
              {createMutation.isPending
                ? t("common.loading", "Chargement...")
                : t("admin.createUser", "Créer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editUser", "Modifier l'utilisateur")}</DialogTitle>
            <DialogDescription>
              {t("admin.editUserDesc", "Modifier les informations de l'utilisateur.")}
            </DialogDescription>
          </DialogHeader>
          {userForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("common.cancel", "Annuler")}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending
                ? t("common.loading", "Chargement...")
                : t("admin.saveChanges", "Enregistrer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.confirmDelete", "Confirmer la suppression")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "admin.confirmDeleteDesc",
                "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Annuler")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? t("common.loading", "Chargement...")
                : t("admin.deleteUser", "Supprimer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
