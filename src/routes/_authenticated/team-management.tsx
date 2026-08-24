import { TeamManagementSkeleton } from "@/components/app/skeletons";
import { useLocationScopeKey } from "@/components/app/location/LocationScope";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Mail,
  Loader2,
  X,
  Calendar,
  Phone,
  AtSign,
  Warehouse,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getMyRole } from "@/lib/roles.functions";
import {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
  getTeamMemberDetail,
  assignTechnicianToBatch,
} from "@/lib/team-settings-insurance.functions";
import { listSilos, listGrainBatches } from "@/lib/operations.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

export const Route = createFileRoute("/_authenticated/team-management")({
  head: () => ({
    meta: [
      { title: "Team Management — Grain Hero" },
      {
        name: "description",
        content:
          "Team Management workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Team Management — Grain Hero" },
      {
        property: "og:description",
        content: "Team Management workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TeamPage,
});

type Role = "admin" | "manager" | "technician" | "pending";
type Member = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  blocked: boolean | null;
  email_verified: boolean | null;
  department: string | null;
  created_at: string | null;
  role: string;
};

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 border-red-200",
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  technician: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

function TeamPage() {
  const qc = useQueryClient();
  const roleFn = useServerFn(getMyRole);
  // Scope every location-dependent query to the active city — in the key as
  // well as the request, so one city's rows are never served for another.
  const loc = useLocationScopeKey();
  const listFn = useServerFn(listTeamMembers);
  const inviteFn = useServerFn(inviteTeamMember);
  const updateFn = useServerFn(updateTeamMember);
  const removeFn = useServerFn(removeTeamMember);
  const getMemberDetailFn = useServerFn(getTeamMemberDetail);
  const assignBatchFn = useServerFn(assignTechnicianToBatch);
  const listSilosFn = useServerFn(listSilos);
  const listBatchesFn = useServerFn(listGrainBatches);

  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn() });
  const currentRole = me?.role ?? "pending";
  const canInvite = ["super_admin", "admin", "manager"].includes(currentRole);

  // Debug logging for manager invite issues
  useEffect(() => {
    if (currentRole === "manager") {
      console.log(
        "[TeamManagement] Manager loaded - canInvite:",
        canInvite,
        "currentRole:",
        currentRole,
      );
    }
  }, [currentRole, canInvite]);
  const canManageMember = (targetRole: string) => {
    if (currentRole === "super_admin") return true;
    if (currentRole === "admin") return targetRole !== "super_admin";
    if (currentRole === "manager") return targetRole === "technician" || targetRole === "pending";
    return false;
  };

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listFn() as Promise<Member[]>,
  });

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "technician" as Role });
  const [viewing, setViewing] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "technician" as Role,
  });
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [assignSiloId, setAssignSiloId] = useState<string>("none");
  const [assignBatchId, setAssignBatchId] = useState<string>("none");

  // Fetch detail when viewing a member
  const { data: memberDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["member-detail", viewing?.id],
    queryFn: () => getMemberDetailFn({ data: { memberId: viewing!.id } }),
    enabled: !!viewing,
  });

  // Fetch silos & batches for manager assignment
  const isManagerOrAdmin = ["super_admin", "admin", "manager"].includes(currentRole);
  const { data: allSilos } = useQuery({
    queryKey: ["silos", loc],
    queryFn: () => listSilosFn({ data: { loc: loc ?? undefined } }),
    enabled: isManagerOrAdmin,
  });
  const { data: allBatches } = useQuery({
    queryKey: ["grain-batches", loc],
    queryFn: () => listBatchesFn({ data: { loc: loc ?? undefined } }),
    enabled: isManagerOrAdmin,
  });

  // All active batches for assignment
  const activeBatches = useMemo(() => {
    if (!allBatches) return [];
    return (allBatches as any[]).filter(
      (b: any) => !["dispatched", "sold", "rejected"].includes(b.status),
    );
  }, [allBatches]);

  type SectionTab = "all" | "active" | "pending";
  const [activeSection, setActiveSection] = useState<SectionTab>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("all");

  const isPendingMember = (m: Member) => {
    if (m.blocked) return false;
    // Only technicians or pending role members require verification
    const isTechOrPendingRole = m.role === "technician" || m.role === "pending";
    return isTechOrPendingRole && !m.email_verified;
  };

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        if (m.blocked) return false; // Hide completely

        const t = q.toLowerCase();
        const hit =
          !t ||
          (m.name ?? "").toLowerCase().includes(t) ||
          (m.email ?? "").toLowerCase().includes(t);
        const rf = roleFilter === "all" || m.role === roleFilter;

        let dateMatch = true;
        if (dateFilter && m.created_at) {
          const mDate = new Date(m.created_at).toISOString().split("T")[0];
          dateMatch = mDate === dateFilter;
        }

        let dayMatch = true;
        if (dayFilter !== "all" && m.created_at) {
          const dayOfWeek = new Date(m.created_at).toLocaleDateString("en-US", { weekday: "long" });
          dayMatch = dayOfWeek === dayFilter;
        }

        let sectionMatch = true;
        if (activeSection === "active") {
          sectionMatch = !isPendingMember(m);
        } else if (activeSection === "pending") {
          sectionMatch = isPendingMember(m);
        }

        return hit && rf && dateMatch && dayMatch && sectionMatch;
      }),
    [members, q, roleFilter, activeSection, dateFilter, dayFilter],
  );

  const stats = useMemo(() => {
    const all = members.filter((m) => !m.blocked).length;
    const pending = members.filter((m) => !m.blocked && isPendingMember(m)).length;
    const active = members.filter((m) => !m.blocked && !isPendingMember(m)).length;
    return { all, active, pending };
  }, [members]);

  const invite = useMutation({
    mutationFn: (v: {
      data: { email: string; name?: string; role: "admin" | "manager" | "technician" };
    }) => inviteFn(v),
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteOpen(false);
      setInviteForm({ email: "", name: "", role: "technician" });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (v: {
      data: { id: string; name?: string; email?: string; phone?: string; role?: Role };
    }) => updateFn(v),
    onSuccess: (_, variables) => {
      toast.success("Member updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["member-detail", variables.data.id] });
      if (viewing && viewing.id === variables.data.id) {
        setViewing((prev) => (prev ? ({ ...prev, ...variables.data } as any) : null));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const assignBatch = useMutation({
    mutationFn: (v: { data: { batchId: string; technicianId: string } }) => assignBatchFn(v),
    onSuccess: () => {
      toast.success("Batch assigned successfully");
      setAssignBatchId("none");
      setAssignSiloId("none");
      qc.invalidateQueries({ queryKey: ["member-detail", viewing?.id] });
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (v: { data: { id: string } }) => removeFn(v),
    onSuccess: (_, variables) => {
      toast.success("Member removed");
      setDeleting(null);
      if (viewing?.id === variables.data.id) {
        setViewing(null);
      }
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const availableRoles: Role[] = useMemo(
    () =>
      currentRole === "super_admin"
        ? ["admin", "manager", "technician"]
        : currentRole === "admin"
          ? ["manager", "technician"]
          : currentRole === "manager"
            ? ["technician"]
            : [],
    [currentRole],
  );

  // Ensure form role is valid when available roles change
  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(inviteForm.role)) {
      setInviteForm((prev) => ({ ...prev, role: availableRoles[0] }));
    }
  }, [availableRoles, inviteForm.role]);

  if (isLoading) return <TeamManagementSkeleton />;

  return (
    <AdminPageShell
      title="Team management"
      subtitle="Invite teammates and manage roles across your tenant"
      actions={
        canInvite ? (
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Invite member
          </Button>
        ) : undefined
      }
    >
      <AdminSummaryTiles
        columns={4}
        active={activeSection}
        onSelect={(k) => setActiveSection(k as SectionTab)}
        tiles={[
          { key: "all", label: "Total", value: stats.all },
          { key: "active", label: "Active", value: stats.active },
          { key: "pending", label: "Pending", value: stats.pending },
        ]}
      />

      <Card>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="relative">
            <Label className="text-xs font-medium text-slate-500 mb-1 block">Name</Label>
            <Search className="absolute left-3 top-[calc(50%+8px)] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name/email"
              className="pl-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 mb-1 block">Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 mb-1 block">Date Joined</Label>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 mb-1 block">Day Joined</Label>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All days</SelectItem>
                <SelectItem value="Monday">Monday</SelectItem>
                <SelectItem value="Tuesday">Tuesday</SelectItem>
                <SelectItem value="Wednesday">Wednesday</SelectItem>
                <SelectItem value="Thursday">Thursday</SelectItem>
                <SelectItem value="Friday">Friday</SelectItem>
                <SelectItem value="Saturday">Saturday</SelectItem>
                <SelectItem value="Sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: "All members", count: stats.all },
          { key: "active", label: "Active", count: stats.active },
          { key: "pending", label: "Pending", count: stats.pending },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeSection === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(tab.key as SectionTab)}
            className={`gap-2 font-medium ${
              activeSection === tab.key
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                activeSection === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      {/* ── 1×2 Grid: Members list + Detail panel ── */}
      <div
        className={`grid gap-4 transition-all duration-300 ${viewing ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
      >
        {/* Left: Member list */}
        <AdminDataCard
          title={
            activeSection === "all"
              ? "All members"
              : activeSection === "active"
                ? "Active members"
                : "Pending invitations"
          }
          description={`Showing ${filtered.length} of ${members.length}`}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <p className="text-sm">No team members found</p>
            </div>
          ) : (
            <div>
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    viewing?.id === m.id
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-emerald-500"
                      : "hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    setViewing(m);
                    setAssignSiloId("none");
                    setAssignBatchId("none");
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                    {(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{m.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={
                        ROLE_BADGE[isPendingMember(m) ? "pending" : m.role] ?? ROLE_BADGE.pending
                      }
                      variant="outline"
                    >
                      {isPendingMember(m) ? "Pending" : m.role}
                    </Badge>
                    {m.blocked && (
                      <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
                        Deleted
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="View details"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewing(m);
                        setAssignSiloId("none");
                        setAssignBatchId("none");
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canManageMember(m.role) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(m);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminDataCard>

        {/* Right: Detail panel (shown inline when viewing) */}
        {viewing && (
          <Card className="h-fit sticky top-4 border border-border/40 dark:border-slate-800 shadow-lg">
            <CardContent className="p-0">
              {/* Header with Edit + Close */}
              <div className="p-4 border-b border-border/40 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground dark:text-slate-100">
                  Member details
                </h3>
                <div className="flex items-center gap-1">
                  {viewing.role === "technician" && canManageMember(viewing.role) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        setEditing(viewing);
                        setEditForm({
                          name: viewing.name ?? "",
                          email: viewing.email ?? "",
                          phone: viewing.phone ?? "",
                          role: viewing.role as Role,
                        });
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  <button
                    onClick={() => setViewing(null)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                  </div>
                ) : memberDetail ? (
                  <div className="p-5 space-y-5">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xl font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                        {((memberDetail.name ?? memberDetail.email ?? "?") as string)
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground dark:text-slate-100 text-base">
                          {memberDetail.name ?? "—"}
                        </div>
                        <Badge
                          className={ROLE_BADGE[memberDetail.role as string] ?? ROLE_BADGE.pending}
                          variant="outline"
                        >
                          {memberDetail.role as string}
                        </Badge>
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 text-sm">
                        <AtSign className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground dark:text-muted-foreground break-all">
                          {memberDetail.email ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground dark:text-muted-foreground">
                          {(memberDetail.phone as string | null) ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground dark:text-muted-foreground">
                          Joined{" "}
                          {memberDetail.created_at
                            ? new Date(memberDetail.created_at as string).toLocaleString()
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Assigned work */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                        Assigned Work
                      </p>
                      {memberDetail.assignedBatches.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active batches assigned.</p>
                      ) : (
                        <div className="space-y-2">
                          {memberDetail.assignedBatches.map((b) => (
                            <div
                              key={b.id}
                              className="rounded-lg border-border/40 dark:border-slate-700 p-3 space-y-1"
                            >
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-slate-200">
                                <Package className="w-3.5 h-3.5 text-emerald-500" />
                                {b.batch_id}
                                <Badge
                                  className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                                  variant="outline"
                                >
                                  {b.status}
                                </Badge>
                              </div>
                              {b.silos && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Warehouse className="w-3 h-3" />
                                  {b.silos.name} ({b.silos.silo_id})
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Manager: Assign silo/batch to technician */}
                    {isManagerOrAdmin && viewing?.role === "technician" && (
                      <div className="border-t border-border/40 dark:border-slate-700 pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                          Assign Work
                        </p>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Silo
                            </Label>
                            <Select
                              value={assignSiloId}
                              onValueChange={(v) => {
                                setAssignSiloId(v);
                                setAssignBatchId("none");
                              }}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select a silo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Select silo —</SelectItem>
                                {((allSilos as any[]) ?? []).map((s: any) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} ({s.silo_id})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Batch
                            </Label>
                            <Select value={assignBatchId} onValueChange={setAssignBatchId}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select batch" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Select batch —</SelectItem>
                                {activeBatches.map((b: any) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.batch_id} · {b.grain_type ?? b.status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={() =>
                              viewing &&
                              assignBatchId !== "none" &&
                              assignBatch.mutate({
                                data: { batchId: assignBatchId, technicianId: viewing.id },
                              })
                            }
                            disabled={assignBatchId === "none" || assignBatch.isPending}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {assignBatch.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Assign
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Invite Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>Send an email invitation to join your tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                invite.mutate({
                  data: {
                    email: inviteForm.email.trim(),
                    name: inviteForm.name || undefined,
                    role: inviteForm.role as "admin" | "manager" | "technician",
                  },
                });
              }}
              disabled={
                invite.isPending ||
                !inviteForm.email.trim() ||
                !availableRoles.includes(inviteForm.role)
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {invite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Member Pop-up Dialog ── */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Update team member profile details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            {availableRoles.length > 1 && (
              <div>
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editing &&
                update.mutate({
                  data: {
                    id: editing.id,
                    name: editForm.name,
                    email: editForm.email,
                    phone: editForm.phone,
                    ...(currentRole === "manager" ? {} : { role: editForm.role }),
                  },
                })
              }
              disabled={update.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Member Confirmation ── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.email} will lose access permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate({ data: { id: deleting.id } })}
              className="bg-red-600 hover:bg-red-700"
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
