import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useAuth } from '../../contexts/AuthContext';
import { mockAttendance, mockLeaveRequests, mockUsers } from '../../data/mockData';
import { format } from 'date-fns';
import { LogIn, LogOut } from 'lucide-react';

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

  managerApprovedBy?: string;
  managerApprovedAt?: string;

  hrApprovedBy?: string;
  hrApprovedAt?: string;

  adminApprovedBy?: string;
  adminApprovedAt?: string;

  rejectedBy?: string;
  rejectedAt?: string;
};

type AttendanceRecord = {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
};

/* ================= STORAGE ================= */

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

  /* ===== FORM STATE ===== */

  const [leaveType, setLeaveType] = useState('');
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* ================= LOAD ================= */

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

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  const todayAttendance = attendanceData.find(
    a => a.userId === currentUser.id && a.date === todayDate
  );

  /* ================= CHECK IN/OUT ================= */

  const handleCheckIn = () => {
    if (todayAttendance) return;
    const now = format(new Date(), 'HH:mm');

    const rec: AttendanceRecord = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      date: todayDate,
      checkIn: now,
      status: "present"
    };

    setAttendanceData(prev => [rec, ...prev]);
    setCheckInTime(now);
    showToast("Checked in");
  };

  const handleCheckOut = () => {
    const now = format(new Date(), 'HH:mm');
    setAttendanceData(prev =>
      prev.map(r =>
        r.userId === currentUser.id && r.date === todayDate
          ? { ...r, checkOut: now }
          : r
      )
    );
    showToast("Checked out");
  };

  /* ================= CREATE LEAVE ================= */

  const submitLeave = () => {
    if (isAdmin) return;

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
      appliedAt: new Date().toISOString()
    };

    setLeaveData(prev => [rec, ...prev]);
    showToast("Leave submitted");

    /* reset form */
    setLeaveType('');
    setPriority("medium");
    setStartDate('');
    setEndDate('');
    setReason('');
    setDescription('');
    setEmergencyContact('');
    setAttachmentUrl('');
  };

  /* ================= APPROVAL ================= */

  const approveLeave = (id: string) => {
    setLeaveData(prev =>
      prev.map(l => {
        if (l.id !== id) return l;

        if (isManager) {
          if (l.type === "emergency")
            return { ...l, status: "approved", managerApprovedBy: currentUser.id, managerApprovedAt: new Date().toISOString() };

          return { ...l, status: "pending_hr", managerApprovedBy: currentUser.id, managerApprovedAt: new Date().toISOString() };
        }

        if (isHR)
          return { ...l, status: "pending_admin", hrApprovedBy: currentUser.id, hrApprovedAt: new Date().toISOString() };

        if (isAdmin)
          return { ...l, status: "approved", adminApprovedBy: currentUser.id, adminApprovedAt: new Date().toISOString() };

        return l;
      })
    );

    showToast("Leave approved");
  };

  const rejectLeave = (id: string) => {
    setLeaveData(prev =>
      prev.map(l =>
        l.id === id
          ? { ...l, status: "rejected", rejectedBy: currentUser.id, rejectedAt: new Date().toISOString() }
          : l
      )
    );
    showToast("Leave rejected");
  };

  /* ================= FILTER ================= */

  const userAttendance =
    isManager || isHR || isAdmin
      ? attendanceData
      : attendanceData.filter(a => a.userId === currentUser.id);

  const visibleLeaves = leaveData.filter(l => {
    if (isAdmin) return true;
    if (isManager) return l.status === "pending_manager";
    if (isHR) return l.status === "pending_hr";
    return l.userId === currentUser.id;
  });

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg">
          {toast}
        </div>
      )}

      {/* Attendance */}
      <Card>
        <CardHeader><CardTitle>Today's Attendance</CardTitle></CardHeader>
        <CardContent className="flex justify-between">
          <div>
            <p>In: {todayAttendance?.checkIn || checkInTime || '-'}</p>
            <p>Out: {todayAttendance?.checkOut || '-'}</p>
          </div>
          <div className="flex gap-2">
            {!todayAttendance && <Button onClick={handleCheckIn}><LogIn size={16}/>Check In</Button>}
            {(todayAttendance || checkInTime) && !todayAttendance?.checkOut &&
              <Button onClick={handleCheckOut} variant="destructive"><LogOut size={16}/>Check Out</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Request Leave Dialog */}
      {!isAdmin && (
        <Dialog>
          <DialogTrigger asChild><Button>Request Leave</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Leave</DialogTitle></DialogHeader>

            <div className="space-y-3">
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger><SelectValue placeholder="Leave Type"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={(v:any)=>setPriority(v)}>
                <SelectTrigger><SelectValue placeholder="Priority"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>

              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
              <input placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)} />
              <Textarea placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
              <input placeholder="Emergency Contact" value={emergencyContact} onChange={e=>setEmergencyContact(e.target.value)} />
              <input placeholder="Attachment URL" value={attachmentUrl} onChange={e=>setAttachmentUrl(e.target.value)} />

              <Button onClick={submitLeave}>Submit Leave</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Leave Table */}
      <Card>
        <CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {visibleLeaves.map(l => {
                const user = mockUsers.find(u => u.id === l.userId);
                return (
                  <TableRow key={l.id}>
                    {(isManager || isHR || isAdmin) && <TableCell>{user?.name}</TableCell>}
                    <TableCell>{l.type}</TableCell>
                    <TableCell>{l.startDate} — {l.endDate}</TableCell>
                    <TableCell><Badge>{l.status}</Badge></TableCell>
                    <TableCell>{l.reason}</TableCell>

                    {(isManager || isHR || isAdmin) && l.status !== "approved" && l.status !== "rejected" && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={()=>approveLeave(l.id)}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={()=>rejectLeave(l.id)}>Reject</Button>
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