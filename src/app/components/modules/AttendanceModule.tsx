import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { attendanceApi, leaveApi } from "@/services/api";
import { format } from "date-fns";
import { LogIn, LogOut, Download, Users, Calendar, Clock } from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */
type LeaveStatus =
  | "pending_manager"
  | "pending_hr"
  | "pending_admin"
  | "approved"
  | "rejected"
  | "emergency_approved";

const initForm = {
  type:             "",
  isEmergency:      false,
  priority:         "medium" as "low" | "medium" | "high",
  startDate:        "",
  endDate:          "",
  reason:           "",
  description:      "",
  emergencyContact: "",
};

/* ============================================================
   COMPONENT
   ============================================================ */
export function AttendanceModule() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const isEmployee = role === "employee";
  const isManager  = role === "manager";
  const isHR       = role === "hr";
  const isAdmin    = role === "admin";

  /* ── state ── */
  const [todayRecord,    setTodayRecord]    = useState<any>(null);
  const [allAttendance,  setAllAttendance]  = useState<any[]>([]);
  const [leaves,         setLeaves]         = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [toast,          setToast]          = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form,           setForm]           = useState(initForm);
  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [reportStart,    setReportStart]    = useState("");
  const [reportEnd,      setReportEnd]      = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setF = (k: keyof typeof initForm, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* ============================================================
     LOAD DATA FROM API
     ============================================================ */
  const loadData = async () => {
    try {
      setLoading(true);

      // Today's attendance for current user
      const todayRes = await attendanceApi.getToday();
      setTodayRecord(todayRes.record || null);

      // All attendance (admin/hr/manager)
      if (isAdmin || isHR || isManager) {
        const allRes = await attendanceApi.getAll();
        setAllAttendance(allRes.records || []);
      }

      // Leaves based on role
      let leavesRes;
      if (isAdmin || isHR) {
        leavesRes = await leaveApi.getAll();
      } else if (isManager) {
        leavesRes = await leaveApi.getPending();
      } else {
        leavesRes = await leaveApi.getMy();
      }
      setLeaves(leavesRes.leaves || []);
    } catch (err: any) {
      console.error("loadData error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!currentUser) return null;

  /* ============================================================
     CHECK IN
     ============================================================ */
  const handleCheckIn = async () => {
    try {
      await attendanceApi.checkIn();
      showToast("✅ Checked in successfully");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Check-in failed", "error");
    }
  };

  /* ============================================================
     CHECK OUT
     ============================================================ */
  const handleCheckOut = async () => {
    try {
      await attendanceApi.checkOut();
      showToast("✅ Checked out successfully");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Check-out failed", "error");
    }
  };

  /* ============================================================
     SUBMIT LEAVE — saves to MongoDB via API
     ============================================================ */
  const submitLeave = async () => {
    if (!form.type || !form.startDate || !form.endDate || !form.reason) {
      showToast("Please fill all required fields", "error");
      return;
    }

    try {
      await leaveApi.apply({
        type:             form.type,
        isEmergency:      form.isEmergency,
        priority:         form.priority,
        startDate:        form.startDate,
        endDate:          form.endDate,
        reason:           form.reason,
        description:      form.description,
        emergencyContact: form.emergencyContact,
      });

      showToast("✅ Leave request submitted successfully");
      setForm(initForm);
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to submit leave", "error");
    }
  };

  /* ============================================================
     APPROVE LEAVE
     ============================================================ */
  const approveLeave = async (id: string) => {
    try {
      await leaveApi.approve(id);
      showToast("✅ Leave approved");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Approval failed", "error");
    }
  };

  /* ============================================================
     REJECT LEAVE
     ============================================================ */
  const rejectLeave = async (id: string) => {
    try {
      await leaveApi.reject(id);
      showToast("Leave rejected", "error");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Rejection failed", "error");
    }
  };

  /* ============================================================
     DOWNLOAD ATTENDANCE CSV
     ============================================================ */
  const downloadAttendance = () => {
    let rows = allAttendance;
    if (reportStart) rows = rows.filter((r) => r.date >= reportStart);
    if (reportEnd)   rows = rows.filter((r) => r.date <= reportEnd);

    const csv = [
      "Name,Role,Date,CheckIn,CheckOut",
      ...rows.map(
        (r) =>
          `${r.userId?.name ?? "Unknown"},${r.userId?.role ?? ""},${r.date},${r.checkIn ?? ""},${r.checkOut ?? ""}`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "attendance_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ============================================================
     HELPER COLORS
     ============================================================ */
  const statusColor = (s: string) => {
    if (s === "approved" || s === "emergency_approved") return "bg-green-500 text-white";
    if (s === "rejected")        return "bg-red-500 text-white";
    if (s?.includes("pending"))  return "bg-yellow-400 text-black";
    return "bg-gray-200 text-gray-700";
  };

  const statusLabel = (s: string) => {
    if (s === "emergency_approved") return "Emergency Approved";
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const priorityColor = (p: string) => {
    if (p === "high")   return "bg-red-100 text-red-700";
    if (p === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const roleColor = (r: string) => {
    if (r === "admin")   return "bg-red-500 text-white";
    if (r === "hr")      return "bg-blue-500 text-white";
    if (r === "manager") return "bg-purple-500 text-white";
    return "bg-gray-500 text-white";
  };

  /* ============================================================
     DETERMINE WHO CAN ACT ON A LEAVE
     ============================================================ */
  const canActOnLeave = (leave: any): boolean => {
    if (isManager && leave.status === "pending_manager") return true;
    if (isHR      && leave.status === "pending_hr")      return true;
    if (isAdmin   && leave.status === "pending_admin" && !leave.isEmergency) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-3 py-4">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 px-5 py-3 rounded-xl shadow-lg z-50 text-white text-sm font-medium ${
          toast.type === "error" ? "bg-red-600" : "bg-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── TODAY ATTENDANCE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} /> Today's Attendance —{" "}
            {format(new Date(), "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-500">Check In: </span>
              <strong>{todayRecord?.checkIn ?? "Not checked in"}</strong>
            </p>
            <p>
              <span className="text-gray-500">Check Out: </span>
              <strong>{todayRecord?.checkOut ?? "Not checked out"}</strong>
            </p>
            <p>
              <span className="text-gray-500">Status: </span>
              <strong className="capitalize">{todayRecord?.status ?? "Absent"}</strong>
            </p>
          </div>

          <div className="flex gap-3 flex-wrap items-start">
            {!todayRecord && (
              <Button
                onClick={handleCheckIn}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <LogIn size={16} className="mr-1" /> Check In
              </Button>
            )}
            {todayRecord && !todayRecord.checkOut && (
              <Button
                onClick={handleCheckOut}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                <LogOut size={16} className="mr-1" /> Check Out
              </Button>
            )}
            {todayRecord?.checkOut && (
              <span className="text-green-600 font-medium text-sm mt-2">
                ✓ Done for today
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── ADMIN: ALL USERS LIST ── */}
      {isAdmin && allAttendance.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users size={18} />
            <CardTitle>Today's Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {allAttendance
              .filter((r) => r.date === format(new Date(), "yyyy-MM-dd"))
              .map((r) => (
                <div
                  key={r._id}
                  className="border rounded-lg p-4 bg-white shadow-sm flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-sm">{r.userId?.name}</p>
                    <p className="text-xs text-gray-500">
                      In: {r.checkIn} | Out: {r.checkOut ?? "—"}
                    </p>
                  </div>
                  <Badge className={roleColor(r.userId?.role)}>
                    {r.userId?.role}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* ── ADMIN: ATTENDANCE REPORT DOWNLOAD ── */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={18} /> Attendance Report
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">From</label>
              <input
                type="date"
                value={reportStart}
                onChange={(e) => setReportStart(e.target.value)}
                className="border p-2 rounded text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">To</label>
              <input
                type="date"
                value={reportEnd}
                onChange={(e) => setReportEnd(e.target.value)}
                className="border p-2 rounded text-sm"
              />
            </div>
            <Button
              onClick={downloadAttendance}
              className="bg-black text-white flex items-center gap-2"
            >
              <Download size={16} /> Download CSV
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── LEAVE REQUEST BUTTON (non-admin) ── */}
      {!isAdmin && (
        <div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                + Request Leave
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">

                {/* EMERGENCY TOGGLE */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
                  <input
                    type="checkbox"
                    id="emergency"
                    checked={form.isEmergency}
                    onChange={(e) => setF("isEmergency", e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <div>
                    <label
                      htmlFor="emergency"
                      className="font-medium text-sm text-orange-700 cursor-pointer"
                    >
                      🚨 Emergency Leave
                    </label>
                    <p className="text-xs text-orange-500 mt-0.5">
                      Approved directly by Manager only — not escalated to Admin.
                    </p>
                  </div>
                </div>

                {/* LEAVE TYPE */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="border p-2 rounded w-full text-sm bg-white"
                    value={form.type}
                    onChange={(e) => setF("type", e.target.value)}
                  >
                    <option value="">— Select type —</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Earned Leave">Earned Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Paternity Leave">Paternity Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* PRIORITY */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Priority
                  </label>
                  <select
                    className="border p-2 rounded w-full text-sm bg-white"
                    value={form.priority}
                    onChange={(e) => setF("priority", e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* DATES */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="border p-2 rounded w-full text-sm"
                      value={form.startDate}
                      onChange={(e) => setF("startDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="border p-2 rounded w-full text-sm"
                      value={form.endDate}
                      onChange={(e) => setF("endDate", e.target.value)}
                    />
                  </div>
                </div>

                {/* REASON */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="border p-2 rounded w-full text-sm"
                    placeholder="Brief reason"
                    value={form.reason}
                    onChange={(e) => setF("reason", e.target.value)}
                  />
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Description (Optional)
                  </label>
                  <Textarea
                    placeholder="Additional details"
                    value={form.description}
                    onChange={(e) => setF("description", e.target.value)}
                    rows={3}
                  />
                </div>

                {/* EMERGENCY CONTACT — only if emergency checked */}
                {form.isEmergency && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Emergency Contact Number
                    </label>
                    <input
                      className="border p-2 rounded w-full text-sm"
                      placeholder="+91 9XXXXXXXXX"
                      value={form.emergencyContact}
                      onChange={(e) => setF("emergencyContact", e.target.value)}
                    />
                  </div>
                )}

                <Button
                  onClick={submitLeave}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Submit Leave Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── LEAVE TABLE ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>
              {isAdmin ? "All Leave Requests" :
               isManager ? "Pending Approvals (Manager)" :
               isHR ? "Pending Approvals (HR)" :
               "My Leave Requests"}
            </CardTitle>
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {leaves.length} record{leaves.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {leaves.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">
              No leave requests found.
            </p>
          ) : (
            <Table className="min-w-[750px] text-sm">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  {(isManager || isHR || isAdmin) && (
                    <TableHead className="font-semibold">Employee</TableHead>
                  )}
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Dates</TableHead>
                  <TableHead className="font-semibold">Days</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Reason</TableHead>
                  {(isManager || isHR || isAdmin) && (
                    <TableHead className="font-semibold">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {leaves.map((l: any) => (
                  <TableRow key={l._id} className="hover:bg-gray-50">

                    {/* EMPLOYEE NAME (for manager/hr/admin view) */}
                    {(isManager || isHR || isAdmin) && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{l.userId?.name ?? "Unknown"}</p>
                          <p className="text-xs text-gray-400 capitalize">{l.userId?.role}</p>
                        </div>
                      </TableCell>
                    )}

                    {/* TYPE */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{l.type}</span>
                        {l.isEmergency && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full w-fit">
                            🚨 Emergency
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* DATES */}
                    <TableCell className="whitespace-nowrap">
                      {l.startDate} — {l.endDate}
                    </TableCell>

                    {/* DAYS */}
                    <TableCell>{l.days}d</TableCell>

                    {/* PRIORITY */}
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(l.priority)}`}>
                        {l.priority}
                      </span>
                    </TableCell>

                    {/* STATUS */}
                    <TableCell>
                      <Badge className={statusColor(l.status)}>
                        {statusLabel(l.status)}
                      </Badge>
                    </TableCell>

                    {/* REASON */}
                    <TableCell
                      className="max-w-[160px] truncate"
                      title={l.reason}
                    >
                      {l.reason}
                    </TableCell>

                    {/* ACTIONS */}
                    {(isManager || isHR || isAdmin) && (
                      <TableCell>
                        {canActOnLeave(l) ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => approveLeave(l._id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => rejectLeave(l._id)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}