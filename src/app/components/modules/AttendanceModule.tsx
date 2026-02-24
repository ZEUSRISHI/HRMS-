import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { CalendarDays, Clock, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mockAttendance, mockLeaveRequests, mockUsers } from '../../data/mockData';
import { format } from 'date-fns';

type AttendanceRecord = {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
  notes?: string;
};

type LeaveRecord = {
  id: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  description?: string;
};

const ATT_KEY = "startup_attendance_records";
const LEAVE_KEY = "startup_leave_records";

export function AttendanceModule() {
  const { currentUser } = useAuth();

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  if (!currentUser) {
    return <div className="p-6 text-muted-foreground">Loading attendance...</div>;
  }

  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);

  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const isManager = currentUser.role === 'manager';
  const canApprove = currentUser.role === 'hr' || currentUser.role === 'manager';

  /* ================= LOAD LOCAL ================= */

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

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  const todayAttendance = attendanceData.find(
    a => a.userId === currentUser.id && a.date === todayDate
  );

  /* ================= CHECK IN ================= */

  const handleCheckIn = () => {
    if (todayAttendance) return;

    const now = format(new Date(), 'HH:mm');
    setCheckInTime(now);

    const rec: AttendanceRecord = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      date: todayDate,
      checkIn: now,
      status: "present",
      notes: "Startup quick check-in"
    };

    setAttendanceData(prev => [rec, ...prev]);
    showToast("✅ Checked in successfully");
  };

  /* ================= CHECK OUT ================= */

  const handleCheckOut = () => {
    const now = format(new Date(), 'HH:mm');

    setAttendanceData(prev =>
      prev.map(r =>
        r.userId === currentUser.id && r.date === todayDate
          ? { ...r, checkOut: now }
          : r
      )
    );

    showToast("✅ Checked out successfully");
  };

  /* ================= LEAVE SUBMIT ================= */

  const submitLeave = () => {
    if (!leaveType || !startDate || !endDate || !reason) {
      alert("Please fill required fields");
      return;
    }

    const rec: LeaveRecord = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      type: leaveType,
      startDate,
      endDate,
      reason,
      description,
      status: "pending"
    };

    setLeaveData(prev => [rec, ...prev]);

    setLeaveType('');
    setStartDate('');
    setEndDate('');
    setReason('');
    setDescription('');

    showToast("📩 Leave request submitted");
  };

  /* ================= APPROVE / REJECT ================= */

  const updateLeaveStatus = (id: string, status: "approved" | "rejected") => {
    if (!canApprove) return;

    setLeaveData(prev =>
      prev.map(l => l.id === id ? { ...l, status } : l)
    );

    showToast(status === "approved" ? "✅ Leave approved" : "❌ Leave rejected");
  };

  /* ================= FILTER ================= */

  const userAttendance = isManager
    ? attendanceData
    : attendanceData.filter(a => a.userId === currentUser.id);

  const userLeaves = isManager
    ? leaveData
    : leaveData.filter(l => l.userId === currentUser.id);

  /* ================= UI ================= */

  return (
    <div className="space-y-6 relative">

      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 p-4 border">
        <h1 className="font-semibold mb-1">Attendance Management</h1>
        <p className="text-sm text-muted-foreground">
          Startup smart attendance & leave tracking
        </p>
      </div>

      {/* Today Card */}
      <Card className="shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
          </CardTitle>
        </CardHeader>

        <CardContent className="flex justify-between flex-col md:flex-row gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>

            {(todayAttendance || checkInTime) && (
              <div className="flex gap-6 mt-2">
                <div>
                  <p className="text-xs">Check In</p>
                  <p className="font-semibold text-green-600">
                    {todayAttendance?.checkIn || checkInTime}
                  </p>
                </div>

                {todayAttendance?.checkOut && (
                  <div>
                    <p className="text-xs">Check Out</p>
                    <p className="font-semibold text-red-600">
                      {todayAttendance.checkOut}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!todayAttendance && !checkInTime && (
              <Button onClick={handleCheckIn} className="gap-2 rounded-xl">
                <LogIn className="h-4 w-4" /> Check In
              </Button>
            )}

            {(todayAttendance || checkInTime) && !todayAttendance?.checkOut && (
              <Button onClick={handleCheckOut} variant="destructive" className="gap-2 rounded-xl">
                <LogOut className="h-4 w-4" /> Check Out
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isManager && <TableHead>Employee</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {userAttendance.slice(0, 10).map(r => {
                const user = mockUsers.find(u => u.id === r.userId);
                return (
                  <TableRow key={r.id}>
                    {isManager && <TableCell>{user?.name}</TableCell>}
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.checkIn}</TableCell>
                    <TableCell>{r.checkOut || '-'}</TableCell>
                    <TableCell><Badge>{r.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Leave Requests
          </CardTitle>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl">Request Leave</Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Leave Type *</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input type="date" value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" />

                  <input type="date" value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>

                <input value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Reason"
                  className="w-full border rounded-lg px-3 py-2" />

                <Textarea value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Description"
                  className="min-h-[100px]" />

                <Button onClick={submitLeave} className="w-full rounded-xl">
                  Submit Leave Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <Table>
            <TableBody>
              {userLeaves.map(l => (
                <TableRow key={l.id}>
                  <TableCell>{l.type}</TableCell>
                  <TableCell>{l.startDate} — {l.endDate}</TableCell>
                  <TableCell><Badge>{l.status}</Badge></TableCell>
                  <TableCell>{l.reason}</TableCell>

                  {canApprove && l.status === "pending" && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm"
                          onClick={() => updateLeaveStatus(l.id, "approved")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={() => updateLeaveStatus(l.id, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}