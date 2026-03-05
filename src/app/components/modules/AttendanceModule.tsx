import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { mockAttendance, mockLeaveRequests, mockUsers } from "../../data/mockData";
import { format } from "date-fns";
import { LogIn, LogOut } from "lucide-react";

/* ================= TYPES ================= */

type LeaveStatus =
  | "pending_manager"
  | "pending_hr"
  | "pending_admin"
  | "approved"
  | "rejected";

type LeaveRecord = {
  id: string;
  userId: string;
  type: string;
  priority: "low" | "medium" | "high";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  description?: string;
  emergencyContact?: string;
  attachmentUrl?: string;
  status: LeaveStatus;
  appliedAt: string;
};

type AttendanceRecord = {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
};

/* ================= STORAGE KEYS ================= */

const ATT_KEY = "startup_attendance_records";
const LEAVE_KEY = "startup_leave_records";

/* ================= COMPONENT ================= */

export function AttendanceModule() {

  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const isManager = role === "manager";
  const isHR = role === "hr";
  const isAdmin = role === "admin";

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* LOAD */

  useEffect(() => {
    const a = localStorage.getItem(ATT_KEY);
    const l = localStorage.getItem(LEAVE_KEY);

    setAttendanceData(a ? JSON.parse(a) : mockAttendance);
    setLeaveData(l ? JSON.parse(l) : mockLeaveRequests);
  }, []);

  useEffect(() => {
    localStorage.setItem(ATT_KEY, JSON.stringify(attendanceData));
  }, [attendanceData]);

  useEffect(() => {
    localStorage.setItem(LEAVE_KEY, JSON.stringify(leaveData));
  }, [leaveData]);

  if (!currentUser) return null;

  const todayDate = format(new Date(), "yyyy-MM-dd");

  const todayAttendance = attendanceData.find(
    (a) => a.userId === currentUser.id && a.date === todayDate
  );

  /* CHECK IN */

  const handleCheckIn = () => {
    if (todayAttendance) return;

    const now = format(new Date(), "HH:mm");

    const rec: AttendanceRecord = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      date: todayDate,
      checkIn: now,
      status: "present",
    };

    setAttendanceData((prev) => [rec, ...prev]);
    setCheckInTime(now);
    showToast("Checked in");
  };

  /* CHECK OUT */

  const handleCheckOut = () => {

    const now = format(new Date(), "HH:mm");

    const updated = attendanceData.map((r) =>
      r.userId === currentUser.id && r.date === todayDate
        ? { ...r, checkOut: now }
        : r
    );

    setAttendanceData(updated);
    showToast("Checked out");
  };

  /* SUBMIT LEAVE */

  const submitLeave = () => {

    const days =
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    const rec: LeaveRecord = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      type: leaveType,
      priority,
      startDate,
      endDate,
      days,
      reason,
      description,
      emergencyContact,
      attachmentUrl,
      status: "pending_manager",
      appliedAt: new Date().toISOString(),
    };

    setLeaveData((prev) => [rec, ...prev]);
    showToast("Leave submitted");

    setLeaveType("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setDescription("");
    setEmergencyContact("");
    setAttachmentUrl("");
  };

  /* APPROVAL */

  const approveLeave = (id: string) => {
    setLeaveData((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;

        if (isManager) return { ...l, status: "pending_hr" };
        if (isHR) return { ...l, status: "pending_admin" };
        if (isAdmin) return { ...l, status: "approved" };

        return l;
      })
    );

    showToast("Leave approved");
  };

  const rejectLeave = (id: string) => {
    setLeaveData((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "rejected" } : l))
    );
    showToast("Leave rejected");
  };

  /* FILTER */

  const visibleLeaves = leaveData.filter((l) => {
    if (isAdmin) return true;
    if (isManager) return l.status === "pending_manager";
    if (isHR) return l.status === "pending_hr";
    return l.userId === currentUser.id;
  });

  /* ================= UI ================= */

  return (
    <div className="space-y-10 max-w-7xl mx-auto">

      {toast && (
        <div className="fixed top-6 right-6 bg-black text-white px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* ATTENDANCE */}

      <Card className="shadow-md rounded-xl">

        <CardHeader>
          <CardTitle className="text-lg">
            Today's Attendance
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col md:flex-row md:justify-between gap-6">

          <div className="text-sm space-y-1">
            <p>Check In : {todayAttendance?.checkIn || checkInTime || "-"}</p>
            <p>Check Out : {todayAttendance?.checkOut || "-"}</p>
          </div>

          <div className="flex gap-3 flex-wrap">

            {!todayAttendance && (
              <Button
                onClick={handleCheckIn}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <LogIn size={16} className="mr-2" />
                Check In
              </Button>
            )}

            {(todayAttendance || checkInTime) &&
              !todayAttendance?.checkOut && (
                <Button
                  onClick={handleCheckOut}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <LogOut size={16} className="mr-2" />
                  Check Out
                </Button>
              )}

          </div>

        </CardContent>

      </Card>

      {/* LEAVE REQUEST */}

      {!isAdmin && (

        <div className="mt-4">

          <Dialog>

            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Request Leave
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg">

              <DialogHeader>
                <DialogTitle>Submit Leave</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">

                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Leave Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                <input className="border p-2 rounded w-full" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input className="border p-2 rounded w-full" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <input className="border p-2 rounded w-full" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                <input className="border p-2 rounded w-full" placeholder="Emergency Contact" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
                <input className="border p-2 rounded w-full" placeholder="Attachment URL" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />

                <Button
                  onClick={submitLeave}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Submit Leave
                </Button>

              </div>

            </DialogContent>

          </Dialog>

        </div>

      )}

      {/* LEAVE TABLE */}

      <Card className="shadow-md rounded-xl">

        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">

          <Table className="min-w-full">

            <TableBody>

              {visibleLeaves.map((l) => {

                const user = mockUsers.find((u) => u.id === l.userId);

                return (
                  <TableRow key={l.id} className="border-b">

                    {(isManager || isHR || isAdmin) && (
                      <TableCell className="font-medium">
                        {user?.name}
                      </TableCell>
                    )}

                    <TableCell>{l.type}</TableCell>

                    <TableCell>
                      {l.startDate} — {l.endDate}
                    </TableCell>

                    <TableCell>
                      <Badge className="capitalize bg-slate-200 text-slate-800">
                        {l.status.replace("_", " ")}
                      </Badge>
                    </TableCell>

                    <TableCell>{l.reason}</TableCell>

                    {(isManager || isHR || isAdmin) &&
                      l.status !== "approved" &&
                      l.status !== "rejected" && (

                        <TableCell>

                          <div className="flex gap-2">

                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => approveLeave(l.id)}
                            >
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                              onClick={() => rejectLeave(l.id)}
                            >
                              Reject
                            </Button>

                          </div>

                        </TableCell>
                      )}

                  </TableRow>
                );

              })}

            </TableBody>

          </Table>

        </CardContent>

      </Card>

    </div>
  );
}