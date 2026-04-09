import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  UserPlus,
  UserMinus,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  ShieldOff,
} from "lucide-react";
import { onboardingApi } from "@/services/api";;

/* ================= TYPES ================= */

type Task = {
  _id: string;
  task: string;
  completed: boolean;
  completedAt?: string;
};

type OnboardingItem = {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    isActive: boolean;
  };
  assignedBy: { name: string; role: string };
  role: string;
  startDate: string;
  status: "in-progress" | "completed";
  tasks: Task[];
  createdAt: string;
};

type ClearanceStatus = {
  hr: boolean;
  it: boolean;
  finance: boolean;
  product: boolean;
};

type OffboardingItem = {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    isActive: boolean;
  };
  initiatedBy: { name: string; role: string };
  lastWorkingDay: string;
  reason: string;
  status: "pending" | "in-progress" | "completed";
  clearanceStatus: ClearanceStatus;
  createdAt: string;
};

/* ================= ROLE OPTIONS ================= */

const ROLE_OPTIONS = ["employee", "manager", "hr"];

/* ================= COMPONENT ================= */

export function OnboardingModule() {
  const [onboardingList, setOnboardingList] = useState<OnboardingItem[]>([]);
  const [offboardingList, setOffboardingList] = useState<OffboardingItem[]>([]);

  /* Loading states */
  const [loadingOn, setLoadingOn] = useState(true);
  const [loadingOff, setLoadingOff] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* Onboarding form */
  const [onName, setOnName] = useState("");
  const [onEmail, setOnEmail] = useState("");
  const [onPassword, setOnPassword] = useState("");
  const [onPhone, setOnPhone] = useState("");
  const [onRole, setOnRole] = useState("");
  const [onStartDate, setOnStartDate] = useState("");
  const [onDialogOpen, setOnDialogOpen] = useState(false);

  /* Offboarding form */
  const [offUserId, setOffUserId] = useState("");
  const [offLastDay, setOffLastDay] = useState("");
  const [offReason, setOffReason] = useState("");
  const [offDialogOpen, setOffDialogOpen] = useState(false);

  /* Popup */
  const [popup, setPopup] = useState("");

  function showPopup(msg: string) {
    setPopup(msg);
    setTimeout(() => setPopup(""), 3000);
  }

  /* ── Fetch all onboarding ── */
  const fetchOnboarding = useCallback(async () => {
    setLoadingOn(true);
    try {
      const data = await onboardingApi.getAll();
      setOnboardingList(data.onboarding || []);
    } catch (e: any) {
      showPopup("Failed to load onboarding: " + e.message);
    } finally {
      setLoadingOn(false);
    }
  }, []);

  /* ── Fetch all offboarding ── */
  const fetchOffboarding = useCallback(async () => {
    setLoadingOff(true);
    try {
      const data = await onboardingApi.getAllOffboarding();
      setOffboardingList(data.offboarding || []);
    } catch (e: any) {
      showPopup("Failed to load offboarding: " + e.message);
    } finally {
      setLoadingOff(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboarding();
    fetchOffboarding();
  }, [fetchOnboarding, fetchOffboarding]);

  /* ── Create onboarding ── */
  async function handleCreateOnboarding() {
    if (!onName || !onEmail || !onPassword || !onRole || !onStartDate) {
      showPopup("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await onboardingApi.create({
        name: onName,
        email: onEmail,
        password: onPassword,
        phone: onPhone,
        role: onRole,
        startDate: onStartDate,
      });
      setOnboardingList((prev) => [data.onboarding, ...prev]);
      showPopup("Onboarding created successfully 🎉");
      setOnName(""); setOnEmail(""); setOnPassword("");
      setOnPhone(""); setOnRole(""); setOnStartDate("");
      setOnDialogOpen(false);
    } catch (e: any) {
      showPopup(e.message || "Failed to create onboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Toggle task ── */
  async function handleToggleTask(onboardingId: string, taskId: string) {
    try {
      const data = await onboardingApi.toggleTask(onboardingId, taskId);
      setOnboardingList((prev) =>
        prev.map((o) => (o._id === onboardingId ? data.onboarding : o))
      );
    } catch (e: any) {
      showPopup(e.message || "Failed to update task.");
    }
  }

  /* ── Delete onboarding ── */
  async function handleDeleteOnboarding(id: string) {
    if (!confirm("Delete this onboarding record?")) return;
    try {
      await onboardingApi.deleteOnboarding(id);
      setOnboardingList((prev) => prev.filter((o) => o._id !== id));
      showPopup("Onboarding deleted.");
    } catch (e: any) {
      showPopup(e.message);
    }
  }

  /* ── Create offboarding ── */
  async function handleCreateOffboarding() {
    if (!offUserId || !offLastDay || !offReason) {
      showPopup("Please fill all fields.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await onboardingApi.createOffboarding({
        userId: offUserId,
        lastWorkingDay: offLastDay,
        reason: offReason,
      });
      setOffboardingList((prev) => [data.offboarding, ...prev]);
      /* Also mark the user as suspended in the onboarding list for display */
      setOnboardingList((prev) =>
        prev.map((o) =>
          o.userId._id === offUserId
            ? { ...o, userId: { ...o.userId, isActive: false } }
            : o
        )
      );
      showPopup("Offboarding initiated. Account suspended 🔒");
      setOffUserId(""); setOffLastDay(""); setOffReason("");
      setOffDialogOpen(false);
    } catch (e: any) {
      showPopup(e.message || "Failed to initiate offboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Toggle clearance ── */
  async function handleToggleClearance(
    offboardingId: string,
    key: keyof ClearanceStatus
  ) {
    try {
      const data = await onboardingApi.toggleClearance(offboardingId, key);
      setOffboardingList((prev) =>
        prev.map((o) => (o._id === offboardingId ? data.offboarding : o))
      );
    } catch (e: any) {
      showPopup(e.message);
    }
  }

  /* ── Delete offboarding ── */
  async function handleDeleteOffboarding(id: string) {
    if (!confirm("Delete this offboarding record?")) return;
    try {
      await onboardingApi.deleteOffboarding(id);
      setOffboardingList((prev) => prev.filter((o) => o._id !== id));
      showPopup("Offboarding record deleted.");
    } catch (e: any) {
      showPopup(e.message);
    }
  }

  /* ── Users eligible for offboarding (active, already onboarded) ── */
  const eligibleForOffboarding = onboardingList.filter(
    (o) =>
      o.userId.isActive &&
      !offboardingList.some((off) => off.userId._id === o.userId._id)
  );

  /* ── Status badge color ── */
  function badgeVariant(status: string) {
    if (status === "completed") return "default";
    if (status === "in-progress") return "secondary";
    return "outline";
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* POPUP */}
      {popup && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-3 rounded-lg shadow-lg z-50 text-sm max-w-xs">
          {popup}
        </div>
      )}

      {/* HEADER */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold">
          Employee Lifecycle Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Onboard new hires and manage clean offboarding for your startup team
        </p>
      </div>

      <Tabs defaultValue="onboarding" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="onboarding" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="offboarding" className="flex items-center gap-2">
            <UserMinus className="h-4 w-4" />
            Offboarding
          </TabsTrigger>
        </TabsList>

        {/* ================= ONBOARDING TAB ================= */}
        <TabsContent value="onboarding" className="space-y-4">

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {onboardingList.length} employee{onboardingList.length !== 1 ? "s" : ""} tracked
            </p>
            <Dialog open={onDialogOpen} onOpenChange={setOnDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Start Onboarding
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Employee Onboarding</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        placeholder="Asha Kumar"
                        value={onName}
                        onChange={(e) => setOnName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="9876543210"
                        value={onPhone}
                        onChange={(e) => setOnPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      placeholder="asha@company.com"
                      value={onEmail}
                      onChange={(e) => setOnEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      placeholder="Temporary password"
                      value={onPassword}
                      onChange={(e) => setOnPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Employee will use this password to log in for the first time.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select onValueChange={setOnRole} value={onRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={onStartDate}
                        onChange={(e) => setOnStartDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreateOnboarding}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Create Account & Start Onboarding
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingOn ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : onboardingList.length === 0 ? (
            <Card className="rounded-xl border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No onboarding records yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Start Onboarding" to create your first employee account.
                </p>
              </CardContent>
            </Card>
          ) : (
            onboardingList.map((o) => {
              const done = o.tasks.filter((t) => t.completed).length;
              const progress = o.tasks.length > 0 ? (done / o.tasks.length) * 100 : 0;

              return (
                <Card key={o._id} className="rounded-xl">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {o.userId.name}
                        {!o.userId.isActive && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <ShieldOff className="h-3 w-3" /> Suspended
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {o.userId.email} · {o.userId.phone || "No phone"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Role: <span className="font-medium">{o.role}</span> · Start:{" "}
                        <span className="font-medium">{o.startDate}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(o.status)}>{o.status}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteOnboarding(o._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {done}/{o.tasks.length} tasks
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {o.tasks.map((t) => (
                        <div
                          key={t._id}
                          onClick={() => handleToggleTask(o._id, t._id)}
                          className="flex items-center gap-3 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <CheckCircle2
                            className={`h-4 w-4 flex-shrink-0 transition-colors ${
                              t.completed ? "text-green-600" : "text-muted-foreground opacity-30"
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              t.completed
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {t.task}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ================= OFFBOARDING TAB ================= */}
        <TabsContent value="offboarding" className="space-y-4">

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {offboardingList.length} offboarding record{offboardingList.length !== 1 ? "s" : ""}
            </p>
            <Dialog open={offDialogOpen} onOpenChange={setOffDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <UserMinus className="h-4 w-4" />
                  Start Offboarding
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Initiate Employee Offboarding</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Employee *</Label>
                    <Select onValueChange={setOffUserId} value={offUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose employee to offboard" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleForOffboarding.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No eligible employees
                          </SelectItem>
                        ) : (
                          eligibleForOffboarding.map((o) => (
                            <SelectItem key={o.userId._id} value={o.userId._id}>
                              {o.userId.name} ({o.userId.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only active, onboarded employees are shown.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Last Working Day *</Label>
                    <Input
                      type="date"
                      value={offLastDay}
                      onChange={(e) => setOffLastDay(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Textarea
                      placeholder="Reason for offboarding (resignation, termination, contract end...)"
                      value={offReason}
                      onChange={(e) => setOffReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    ⚠️ This will immediately suspend the employee's login access.
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleCreateOffboarding}
                    disabled={submitting || eligibleForOffboarding.length === 0}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShieldOff className="h-4 w-4 mr-2" />
                    )}
                    Suspend Account & Start Offboarding
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingOff ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : offboardingList.length === 0 ? (
            <Card className="rounded-xl border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <UserMinus className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No offboarding records yet.</p>
              </CardContent>
            </Card>
          ) : (
            offboardingList.map((o) => {
              const clearedCount = Object.values(o.clearanceStatus).filter(Boolean).length;
              const totalKeys = Object.keys(o.clearanceStatus).length;

              return (
                <Card key={o._id} className="rounded-xl">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {o.userId.name}
                        <Badge variant="destructive" className="text-xs gap-1">
                          <ShieldOff className="h-3 w-3" /> Suspended
                        </Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {o.userId.email} · Last day:{" "}
                        <span className="font-medium">{o.lastWorkingDay}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reason: {o.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(o.status)}>{o.status}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteOffboarding(o._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(clearedCount / totalKeys) * 100}
                        className="flex-1 h-2"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {clearedCount}/{totalKeys} cleared
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        Object.keys(o.clearanceStatus) as (keyof ClearanceStatus)[]
                      ).map((k) => (
                        <Button
                          key={k}
                          variant={o.clearanceStatus[k] ? "default" : "outline"}
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleToggleClearance(o._id, k)}
                        >
                          {o.clearanceStatus[k] && (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {k.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
