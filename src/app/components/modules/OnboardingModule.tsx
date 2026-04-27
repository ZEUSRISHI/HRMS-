import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  UserPlus, UserMinus, CheckCircle2, Plus, Trash2,
  Loader2, ShieldOff, Download, ClipboardList,
} from "lucide-react";
import { onboardingApi } from "@/services/api";

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
  } | null;
  assignedBy: { name: string; role: string } | null;
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
  } | null;
  initiatedBy: { name: string; role: string } | null;
  lastWorkingDay: string;
  reason: string;
  status: "pending" | "in-progress" | "completed";
  clearanceStatus: ClearanceStatus;
  createdAt: string;
};

/* ================= ROLE OPTIONS ================= */
const ROLE_OPTIONS = ["employee", "manager", "hr"];

/* ================= EXCEL EXPORT ================= */
function exportOnboardingToExcel(onboardingList: OnboardingItem[], offboardingList: OffboardingItem[]) {
  const BOM = "\uFEFF";

  const onRows = [
    ["ONBOARDING REPORT"],
    ["Generated", new Date().toLocaleString()],
    [],
    ["Name", "Email", "Phone", "Role", "Start Date", "Status", "Account Active", "Tasks Total", "Tasks Completed", "Created At"],
    ...onboardingList
      .filter(o => o.userId !== null)
      .map(o => [
        o.userId!.name,
        o.userId!.email,
        o.userId!.phone || "",
        o.role,
        o.startDate,
        o.status,
        o.userId!.isActive ? "Yes" : "No (Suspended)",
        o.tasks.length,
        o.tasks.filter(t => t.completed).length,
        new Date(o.createdAt).toLocaleDateString(),
      ]),
    [],
    ["OFFBOARDING REPORT"],
    ["Name", "Email", "Role", "Last Working Day", "Reason", "Status", "HR Cleared", "IT Cleared", "Finance Cleared", "Product Cleared", "Created At"],
    ...offboardingList
      .filter(o => o.userId !== null)
      .map(o => [
        o.userId!.name,
        o.userId!.email,
        o.userId!.role,
        o.lastWorkingDay,
        (o.reason || "").replace(/,/g, ";"),
        o.status,
        o.clearanceStatus.hr ? "Yes" : "No",
        o.clearanceStatus.it ? "Yes" : "No",
        o.clearanceStatus.finance ? "Yes" : "No",
        o.clearanceStatus.product ? "Yes" : "No",
        new Date(o.createdAt).toLocaleDateString(),
      ]),
  ];

  const csv = BOM + onRows
    .map(row => Array.isArray(row) ? row.map(cell => `"${cell}"`).join(",") : `"${row}"`)
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `employee-lifecycle-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================= COMPONENT ================= */
export function OnboardingModule() {
  const [onboardingList, setOnboardingList] = useState<OnboardingItem[]>([]);
  const [offboardingList, setOffboardingList] = useState<OffboardingItem[]>([]);

  const [loadingOn, setLoadingOn] = useState(true);
  const [loadingOff, setLoadingOff] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* ── Onboarding form ── */
  const [onName, setOnName] = useState("");
  const [onEmail, setOnEmail] = useState("");
  const [onPassword, setOnPassword] = useState("");
  const [onPhone, setOnPhone] = useState("");
  const [onRole, setOnRole] = useState("");
  const [onStartDate, setOnStartDate] = useState("");
  const [onDialogOpen, setOnDialogOpen] = useState(false);

  /* ── Manual Onboarding form ── */
  const [manualOnOpen, setManualOnOpen] = useState(false);
  const [manualOnName, setManualOnName] = useState("");
  const [manualOnEmail, setManualOnEmail] = useState("");
  const [manualOnPassword, setManualOnPassword] = useState("");
  const [manualOnPhone, setManualOnPhone] = useState("");
  const [manualOnRole, setManualOnRole] = useState("");
  const [manualOnStartDate, setManualOnStartDate] = useState("");
  const [manualOnCreatedAt, setManualOnCreatedAt] = useState("");
  const [manualOnStatus, setManualOnStatus] = useState<"in-progress" | "completed">("completed");
  const [manualOnTasksCompleted, setManualOnTasksCompleted] = useState(true);

  /* ── Offboarding form ── */
  const [offUserId, setOffUserId] = useState("");
  const [offLastDay, setOffLastDay] = useState("");
  const [offReason, setOffReason] = useState("");
  const [offDialogOpen, setOffDialogOpen] = useState(false);

  /* ── Manual Offboarding form ── */
  const [manualOffOpen, setManualOffOpen] = useState(false);
  const [manualOffName, setManualOffName] = useState("");
  const [manualOffEmail, setManualOffEmail] = useState("");
  const [manualOffRole, setManualOffRole] = useState("");
  const [manualOffLastDay, setManualOffLastDay] = useState("");
  const [manualOffReason, setManualOffReason] = useState("");
  const [manualOffCreatedAt, setManualOffCreatedAt] = useState("");
  const [manualOffStatus, setManualOffStatus] = useState<"pending" | "in-progress" | "completed">("completed");
  const [manualOffHr, setManualOffHr] = useState(false);
  const [manualOffIt, setManualOffIt] = useState(false);
  const [manualOffFinance, setManualOffFinance] = useState(false);
  const [manualOffProduct, setManualOffProduct] = useState(false);

  const [popup, setPopup] = useState("");

  function showPopup(msg: string) {
    setPopup(msg);
    setTimeout(() => setPopup(""), 3500);
  }

  /* ── Fetch onboarding ── */
  const fetchOnboarding = useCallback(async () => {
    setLoadingOn(true);
    try {
      const data = await onboardingApi.getAll();
      // CRITICAL FIX: filter out records where userId is null (deleted users)
      setOnboardingList((data.onboarding || []).filter((o: OnboardingItem) => o.userId !== null));
    } catch (e: any) {
      showPopup("Failed to load onboarding: " + e.message);
    } finally {
      setLoadingOn(false);
    }
  }, []);

  /* ── Fetch offboarding ── */
  const fetchOffboarding = useCallback(async () => {
    setLoadingOff(true);
    try {
      const data = await onboardingApi.getAllOffboarding();
      // CRITICAL FIX: filter out records where userId is null
      setOffboardingList((data.offboarding || []).filter((o: OffboardingItem) => o.userId !== null));
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

  /* ── Create onboarding (live employee) ── */
  async function handleCreateOnboarding() {
    if (!onName || !onEmail || !onPassword || !onRole || !onStartDate) {
      showPopup("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await onboardingApi.create({
        name: onName, email: onEmail, password: onPassword,
        phone: onPhone, role: onRole, startDate: onStartDate,
      });
      // guard: only push if userId populated
      if (data.onboarding?.userId) {
        setOnboardingList(prev => [data.onboarding, ...prev]);
      } else {
        await fetchOnboarding();
      }
      showPopup("✅ Onboarding created successfully!");
      setOnName(""); setOnEmail(""); setOnPassword("");
      setOnPhone(""); setOnRole(""); setOnStartDate("");
      setOnDialogOpen(false);
    } catch (e: any) {
      showPopup("❌ " + (e.message || "Failed to create onboarding."));
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Create manual onboarding (historical data) ── */
  async function handleManualOnboarding() {
    if (!manualOnName || !manualOnEmail || !manualOnPassword || !manualOnRole || !manualOnStartDate) {
      showPopup("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await onboardingApi.createManual({
        name: manualOnName,
        email: manualOnEmail,
        password: manualOnPassword,
        phone: manualOnPhone,
        role: manualOnRole,
        startDate: manualOnStartDate,
        createdAt: manualOnCreatedAt || undefined,
        status: manualOnStatus,
        allTasksCompleted: manualOnTasksCompleted,
      });
      if (data.onboarding?.userId) {
        setOnboardingList(prev => [data.onboarding, ...prev]);
      } else {
        await fetchOnboarding();
      }
      showPopup("✅ Manual onboarding record saved!");
      setManualOnName(""); setManualOnEmail(""); setManualOnPassword("");
      setManualOnPhone(""); setManualOnRole(""); setManualOnStartDate("");
      setManualOnCreatedAt(""); setManualOnStatus("completed");
      setManualOnTasksCompleted(true);
      setManualOnOpen(false);
    } catch (e: any) {
      showPopup("❌ " + (e.message || "Failed to save manual onboarding."));
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Toggle task ── */
  async function handleToggleTask(onboardingId: string, taskId: string) {
    try {
      const data = await onboardingApi.toggleTask(onboardingId, taskId);
      if (data.onboarding?.userId) {
        setOnboardingList(prev => prev.map(o => o._id === onboardingId ? data.onboarding : o));
      }
    } catch (e: any) {
      showPopup("❌ " + (e.message || "Failed to update task."));
    }
  }

  /* ── Delete onboarding ── */
  async function handleDeleteOnboarding(id: string) {
    if (!confirm("Delete this onboarding record?")) return;
    try {
      await onboardingApi.deleteOnboarding(id);
      setOnboardingList(prev => prev.filter(o => o._id !== id));
      showPopup("✅ Onboarding deleted.");
    } catch (e: any) {
      showPopup("❌ " + e.message);
    }
  }

  /* ── Create offboarding (live) ── */
  async function handleCreateOffboarding() {
    if (!offUserId || offUserId === "none" || !offLastDay || !offReason) {
      showPopup("Please fill all fields.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await onboardingApi.createOffboarding({
        userId: offUserId, lastWorkingDay: offLastDay, reason: offReason,
      });
      if (data.offboarding?.userId) {
        setOffboardingList(prev => [data.offboarding, ...prev]);
      } else {
        await fetchOffboarding();
      }
      setOnboardingList(prev =>
        prev.map(o =>
          o.userId && o.userId._id === offUserId
            ? { ...o, userId: { ...o.userId, isActive: false } }
            : o
        )
      );
      showPopup("✅ Offboarding initiated. Account suspended 🔒");
      setOffUserId(""); setOffLastDay(""); setOffReason("");
      setOffDialogOpen(false);
    } catch (e: any) {
      showPopup("❌ " + (e.message || "Failed to initiate offboarding."));
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Create manual offboarding (historical data) ── */
  async function handleManualOffboarding() {
    if (!manualOffName || !manualOffEmail || !manualOffLastDay || !manualOffReason || !manualOffRole) {
      showPopup("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await onboardingApi.createManualOffboarding({
        name: manualOffName,
        email: manualOffEmail,
        role: manualOffRole,
        lastWorkingDay: manualOffLastDay,
        reason: manualOffReason,
        createdAt: manualOffCreatedAt || undefined,
        status: manualOffStatus,
        clearanceStatus: {
          hr: manualOffHr,
          it: manualOffIt,
          finance: manualOffFinance,
          product: manualOffProduct,
        },
      });
      if (data.offboarding?.userId) {
        setOffboardingList(prev => [data.offboarding, ...prev]);
      } else {
        await fetchOffboarding();
      }
      showPopup("✅ Manual offboarding record saved!");
      setManualOffName(""); setManualOffEmail(""); setManualOffRole("");
      setManualOffLastDay(""); setManualOffReason(""); setManualOffCreatedAt("");
      setManualOffStatus("completed");
      setManualOffHr(false); setManualOffIt(false);
      setManualOffFinance(false); setManualOffProduct(false);
      setManualOffOpen(false);
    } catch (e: any) {
      showPopup("❌ " + (e.message || "Failed to save manual offboarding."));
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Toggle clearance ── */
  async function handleToggleClearance(offboardingId: string, key: keyof ClearanceStatus) {
    try {
      const data = await onboardingApi.toggleClearance(offboardingId, key);
      if (data.offboarding?.userId) {
        setOffboardingList(prev => prev.map(o => o._id === offboardingId ? data.offboarding : o));
      }
    } catch (e: any) {
      showPopup("❌ " + e.message);
    }
  }

  /* ── Delete offboarding ── */
  async function handleDeleteOffboarding(id: string) {
    if (!confirm("Delete this offboarding record?")) return;
    try {
      await onboardingApi.deleteOffboarding(id);
      setOffboardingList(prev => prev.filter(o => o._id !== id));
      showPopup("✅ Offboarding record deleted.");
    } catch (e: any) {
      showPopup("❌ " + e.message);
    }
  }

  /* ── Eligible for offboarding: active users not already offboarded ── */
  // CRITICAL FIX: guard o.userId with optional chaining throughout
  const eligibleForOffboarding = onboardingList.filter(
    o =>
      o.userId?.isActive === true &&
      !offboardingList.some(off => off.userId?._id === o.userId?._id)
  );

  function badgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
    if (status === "completed") return "default";
    if (status === "in-progress") return "secondary";
    return "outline";
  }

  /* ── Clearance toggle button style ── */
  const clearanceKeys: (keyof ClearanceStatus)[] = ["hr", "it", "finance", "product"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* POPUP */}
      {popup && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-3 rounded-lg shadow-lg z-50 text-sm max-w-xs">
          {popup}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Employee Lifecycle Management</h1>
          <p className="text-sm text-muted-foreground">
            Onboard new hires and manage clean offboarding
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => exportOnboardingToExcel(onboardingList, offboardingList)}
        >
          <Download className="h-4 w-4" />
          Download Report
        </Button>
      </div>

      <Tabs defaultValue="onboarding" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="onboarding" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Onboarding
          </TabsTrigger>
          <TabsTrigger value="offboarding" className="flex items-center gap-2">
            <UserMinus className="h-4 w-4" /> Offboarding
          </TabsTrigger>
        </TabsList>

        {/* ================= ONBOARDING TAB ================= */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              {onboardingList.length} employee{onboardingList.length !== 1 ? "s" : ""} tracked
            </p>
            <div className="flex gap-2 flex-wrap">

              {/* Manual Entry Button */}
              <Dialog open={manualOnOpen} onOpenChange={setManualOnOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Manual Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
                  <DialogHeader>
                    <DialogTitle>📋 Manual Onboarding Entry</DialogTitle>
                  </DialogHeader>
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-700 mb-3">
                    Enter historical onboarding data. The employee account will be created and the onboarding record will use your specified date.
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Full Name *</Label>
                        <Input placeholder="John Doe" value={manualOnName} onChange={e => setManualOnName(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone</Label>
                        <Input placeholder="9876543210" value={manualOnPhone} onChange={e => setManualOnPhone(e.target.value)} className="h-9" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email *</Label>
                      <Input type="email" placeholder="john@company.com" value={manualOnEmail} onChange={e => setManualOnEmail(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Password *</Label>
                      <Input type="password" placeholder="Temporary password" value={manualOnPassword} onChange={e => setManualOnPassword(e.target.value)} className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Role *</Label>
                        <Select value={manualOnRole || "none"} onValueChange={v => setManualOnRole(v === "none" ? "" : v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Select —</SelectItem>
                            {ROLE_OPTIONS.map(r => (
                              <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Start Date *</Label>
                        <Input type="date" value={manualOnStartDate} onChange={e => setManualOnStartDate(e.target.value)} className="h-9" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Record Creation Date</Label>
                        <Input type="date" value={manualOnCreatedAt} onChange={e => setManualOnCreatedAt(e.target.value)} className="h-9" />
                        <p className="text-[10px] text-gray-400">Leave blank for today</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select value={manualOnStatus} onValueChange={(v: any) => setManualOnStatus(v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                      <input
                        type="checkbox"
                        id="tasksCompleted"
                        checked={manualOnTasksCompleted}
                        onChange={e => setManualOnTasksCompleted(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="tasksCompleted" className="text-xs text-gray-600 cursor-pointer">
                        Mark all onboarding tasks as completed
                      </label>
                    </div>
                    <Button className="w-full" onClick={handleManualOnboarding} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                      Save Manual Record
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Start Onboarding Button */}
              <Dialog open={onDialogOpen} onOpenChange={setOnDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Start Onboarding
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
                        <Input placeholder="Asha Kumar" value={onName} onChange={e => setOnName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input placeholder="9876543210" value={onPhone} onChange={e => setOnPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input type="email" placeholder="asha@company.com" value={onEmail} onChange={e => setOnEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input type="password" placeholder="Temporary password" value={onPassword} onChange={e => setOnPassword(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Employee uses this to log in for the first time.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Role *</Label>
                        <Select value={onRole || "none"} onValueChange={v => setOnRole(v === "none" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Select —</SelectItem>
                            {ROLE_OPTIONS.map(r => (
                              <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date *</Label>
                        <Input type="date" value={onStartDate} onChange={e => setOnStartDate(e.target.value)} />
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleCreateOnboarding} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      Create Account & Start Onboarding
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
                <p className="text-xs text-muted-foreground mt-1">Click "Start Onboarding" or "Manual Entry" to add records.</p>
              </CardContent>
            </Card>
          ) : (
            onboardingList.map(o => {
              // Extra guard — skip any that slipped through with null userId
              if (!o.userId) return null;
              const done = o.tasks.filter(t => t.completed).length;
              const progress = o.tasks.length > 0 ? (done / o.tasks.length) * 100 : 0;

              return (
                <Card key={o._id} className="rounded-xl">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
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
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(o.status)}>{o.status}</Badge>
                      <Button
                        variant="ghost" size="icon"
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
                      {o.tasks.map(t => (
                        <div
                          key={t._id}
                          onClick={() => handleToggleTask(o._id, t._id)}
                          className="flex items-center gap-3 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <CheckCircle2 className={`h-4 w-4 flex-shrink-0 transition-colors ${t.completed ? "text-green-600" : "text-muted-foreground opacity-30"}`} />
                          <span className={`text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              {offboardingList.length} offboarding record{offboardingList.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2 flex-wrap">

              {/* Manual Offboarding */}
              <Dialog open={manualOffOpen} onOpenChange={setManualOffOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Manual Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
                  <DialogHeader>
                    <DialogTitle>📋 Manual Offboarding Entry</DialogTitle>
                  </DialogHeader>
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-700 mb-3">
                    Enter historical offboarding data with custom dates. A suspended user account will be created.
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Full Name *</Label>
                        <Input placeholder="John Doe" value={manualOffName} onChange={e => setManualOffName(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Role *</Label>
                        <Select value={manualOffRole || "none"} onValueChange={v => setManualOffRole(v === "none" ? "" : v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Select —</SelectItem>
                            {ROLE_OPTIONS.map(r => (
                              <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email *</Label>
                      <Input type="email" placeholder="john@company.com" value={manualOffEmail} onChange={e => setManualOffEmail(e.target.value)} className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Last Working Day *</Label>
                        <Input type="date" value={manualOffLastDay} onChange={e => setManualOffLastDay(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Record Creation Date</Label>
                        <Input type="date" value={manualOffCreatedAt} onChange={e => setManualOffCreatedAt(e.target.value)} className="h-9" />
                        <p className="text-[10px] text-gray-400">Leave blank for today</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reason *</Label>
                      <Textarea
                        placeholder="Resignation, termination, contract end..."
                        value={manualOffReason}
                        onChange={e => setManualOffReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={manualOffStatus} onValueChange={(v: any) => setManualOffStatus(v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
                      <Label className="text-xs font-semibold text-gray-600">Clearance Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "hr", label: "HR", val: manualOffHr, set: setManualOffHr },
                          { key: "it", label: "IT", val: manualOffIt, set: setManualOffIt },
                          { key: "finance", label: "Finance", val: manualOffFinance, set: setManualOffFinance },
                          { key: "product", label: "Product", val: manualOffProduct, set: setManualOffProduct },
                        ].map(({ key, label, val, set }) => (
                          <div key={key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`manual-off-${key}`}
                              checked={val}
                              onChange={e => set(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <label htmlFor={`manual-off-${key}`} className="text-xs cursor-pointer">{label} Cleared</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button variant="destructive" className="w-full" onClick={handleManualOffboarding} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                      Save Manual Offboarding Record
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Start Offboarding */}
              <Dialog open={offDialogOpen} onOpenChange={setOffDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <UserMinus className="h-4 w-4" /> Start Offboarding
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Initiate Employee Offboarding</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Employee *</Label>
                      <Select value={offUserId || "none"} onValueChange={v => setOffUserId(v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Choose employee to offboard" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Select employee —</SelectItem>
                          {eligibleForOffboarding.length === 0 ? (
                            <SelectItem value="__none__" disabled>No eligible employees</SelectItem>
                          ) : (
                            eligibleForOffboarding.map(o => (
                              <SelectItem key={o.userId!._id} value={o.userId!._id}>
                                {o.userId!.name} ({o.userId!.email})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Only active, onboarded employees are shown.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Last Working Day *</Label>
                      <Input type="date" value={offLastDay} onChange={e => setOffLastDay(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Reason *</Label>
                      <Textarea
                        placeholder="Reason for offboarding..."
                        value={offReason}
                        onChange={e => setOffReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      ⚠️ This will immediately suspend the employee's login access.
                    </div>
                    <Button
                      variant="destructive" className="w-full"
                      onClick={handleCreateOffboarding}
                      disabled={submitting || eligibleForOffboarding.length === 0 || !offUserId || offUserId === "none"}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldOff className="h-4 w-4 mr-2" />}
                      Suspend Account & Start Offboarding
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
            offboardingList.map(o => {
              if (!o.userId) return null;
              const clearedCount = Object.values(o.clearanceStatus).filter(Boolean).length;
              const totalKeys = Object.keys(o.clearanceStatus).length;

              return (
                <Card key={o._id} className="rounded-xl">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        {o.userId.name}
                        <Badge variant="destructive" className="text-xs gap-1">
                          <ShieldOff className="h-3 w-3" /> Suspended
                        </Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {o.userId.email} · Last day: <span className="font-medium">{o.lastWorkingDay}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Reason: {o.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(o.status)}>{o.status}</Badge>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteOffboarding(o._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Progress value={(clearedCount / totalKeys) * 100} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {clearedCount}/{totalKeys} cleared
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {clearanceKeys.map(k => (
                        <Button
                          key={k}
                          variant={o.clearanceStatus[k] ? "default" : "outline"}
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleToggleClearance(o._id, k)}
                        >
                          {o.clearanceStatus[k] && <CheckCircle2 className="h-3.5 w-3.5" />}
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
