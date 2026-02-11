import { useState } from 'react';
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

export function AttendanceModule() {
  const { currentUser } = useAuth();
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager' || isAdmin;

  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = mockAttendance.find(
    a => a.userId === currentUser.id && a.date === todayDate
  );

  const handleCheckIn = () => {
    const now = format(new Date(), 'HH:mm');
    setCheckInTime(now);
  };

  const handleCheckOut = () => {
    // Handle check out logic
  };

  const userAttendance = isAdmin || isManager 
    ? mockAttendance 
    : mockAttendance.filter(a => a.userId === currentUser.id);

  const userLeaves = isAdmin || isManager
    ? mockLeaveRequests
    : mockLeaveRequests.filter(l => l.userId === currentUser.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Attendance Management</h1>
          <p className="text-sm text-muted-foreground">Track daily attendance, check-in/check-out, and leave requests</p>
        </div>
      </div>

      {/* Check-in/Check-out Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Date: {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
              {(todayAttendance || checkInTime) && (
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Check In</p>
                    <p className="font-semibold text-green-600">{todayAttendance?.checkIn || checkInTime}</p>
                  </div>
                  {todayAttendance?.checkOut && (
                    <div>
                      <p className="text-xs text-muted-foreground">Check Out</p>
                      <p className="font-semibold text-red-600">{todayAttendance.checkOut}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!todayAttendance && !checkInTime && (
                <Button onClick={handleCheckIn} className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Check In
                </Button>
              )}
              {(todayAttendance || checkInTime) && !todayAttendance?.checkOut && (
                <Button onClick={handleCheckOut} variant="destructive" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Check Out
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Attendance History</CardTitle>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isManager && <TableHead>Employee</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userAttendance.slice(0, 10).map((record) => {
                const user = mockUsers.find(u => u.id === record.userId);
                return (
                  <TableRow key={record.id}>
                    {isManager && <TableCell>{user?.name}</TableCell>}
                    <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{record.checkIn}</TableCell>
                    <TableCell>{record.checkOut || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === 'present' ? 'default' :
                          record.status === 'leave' ? 'secondary' :
                          record.status === 'holiday' ? 'outline' : 'destructive'
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{record.notes || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Leave Requests
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">Request Leave</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Leave Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="personal">Personal Leave</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <input type="date" className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <input type="date" className="w-full border rounded-md px-3 py-2" />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea placeholder="Enter reason for leave..." />
                </div>
                <Button className="w-full">Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isManager && <TableHead>Employee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                {isManager && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {userLeaves.map((leave) => {
                const user = mockUsers.find(u => u.id === leave.userId);
                return (
                  <TableRow key={leave.id}>
                    {isManager && <TableCell>{user?.name}</TableCell>}
                    <TableCell className="capitalize">{leave.type}</TableCell>
                    <TableCell>{format(new Date(leave.startDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(leave.endDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          leave.status === 'approved' ? 'default' :
                          leave.status === 'rejected' ? 'destructive' : 'secondary'
                        }
                      >
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{leave.reason}</TableCell>
                    {isManager && (
                      <TableCell>
                        {leave.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">Approve</Button>
                            <Button size="sm" variant="outline">Reject</Button>
                          </div>
                        )}
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
