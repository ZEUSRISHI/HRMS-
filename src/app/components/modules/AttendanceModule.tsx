import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { mockAttendance, mockLeaveRequests, mockUsers } from "../../data/mockData";
import { format } from "date-fns";
import { LogIn, LogOut, Download, Users } from "lucide-react";

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

/* STORAGE */

const ATT_KEY = "startup_attendance_records";
const LEAVE_KEY = "startup_leave_records";

/* ================= COMPONENT ================= */

export function AttendanceModule() {

  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const isManager = role === "manager";
  const isHR = role === "hr";
  const isAdmin = role === "admin";

  const [attendanceData,setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [leaveData,setLeaveData] = useState<LeaveRecord[]>([]);
  const [checkInTime,setCheckInTime] = useState<string | null>(null);
  const [toast,setToast] = useState<string | null>(null);

  const [reportStart,setReportStart] = useState("");
  const [reportEnd,setReportEnd] = useState("");

  const [leaveType,setLeaveType] = useState("");
  const [priority,setPriority] = useState<"low"|"medium"|"high">("medium");
  const [startDate,setStartDate] = useState("");
  const [endDate,setEndDate] = useState("");
  const [reason,setReason] = useState("");
  const [description,setDescription] = useState("");

  const showToast=(msg:string)=>{
    setToast(msg);
    setTimeout(()=>setToast(null),2500);
  };

  /* ================= LOAD ================= */

  useEffect(()=>{
    const a=localStorage.getItem(ATT_KEY);
    const l=localStorage.getItem(LEAVE_KEY);

    setAttendanceData(a?JSON.parse(a):mockAttendance);
    setLeaveData(l?JSON.parse(l):mockLeaveRequests);

  },[]);

  useEffect(()=>{
    localStorage.setItem(ATT_KEY,JSON.stringify(attendanceData));
  },[attendanceData]);

  useEffect(()=>{
    localStorage.setItem(LEAVE_KEY,JSON.stringify(leaveData));
  },[leaveData]);

  if(!currentUser) return null;

  const todayDate=format(new Date(),"yyyy-MM-dd");

  const todayAttendance=attendanceData.find(
    (a)=>a.userId===currentUser.id && a.date===todayDate
  );

  /* ================= CHECK IN ================= */

  const handleCheckIn=()=>{

    if(todayAttendance) return;

    const now=format(new Date(),"HH:mm");

    const rec:AttendanceRecord={
      id:crypto.randomUUID(),
      userId:currentUser.id,
      date:todayDate,
      checkIn:now,
      status:"present"
    };

    setAttendanceData((prev)=>[rec,...prev]);
    setCheckInTime(now);
    showToast("Checked in");

  };

  /* ================= CHECK OUT ================= */

  const handleCheckOut=()=>{

    const now=format(new Date(),"HH:mm");

    const updated=attendanceData.map((r)=>
      r.userId===currentUser.id && r.date===todayDate
        ? {...r,checkOut:now}
        : r
    );

    setAttendanceData(updated);
    showToast("Checked out");

  };

  /* ================= SUBMIT LEAVE ================= */

  const submitLeave=()=>{

    const days=
      Math.ceil(
        (new Date(endDate).getTime()-
        new Date(startDate).getTime())/(1000*60*60*24)
      )+1;

    const rec:LeaveRecord={
      id:crypto.randomUUID(),
      userId:currentUser.id,
      type:leaveType,
      priority,
      startDate,
      endDate,
      days,
      reason,
      description,
      status:"pending_manager",
      appliedAt:new Date().toISOString()
    };

    setLeaveData((prev)=>[rec,...prev]);

    showToast("Leave submitted");

    setLeaveType("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setDescription("");

  };

  /* ================= APPROVAL ================= */

  const approveLeave=(id:string)=>{

    setLeaveData((prev)=>
      prev.map((l)=>{
        if(l.id!==id) return l;

        if(isManager) return {...l,status:"pending_hr"};
        if(isHR) return {...l,status:"pending_admin"};
        if(isAdmin) return {...l,status:"approved"};

        return l;
      })
    );

    showToast("Leave approved");

  };

  const rejectLeave=(id:string)=>{

    setLeaveData((prev)=>
      prev.map((l)=>
        l.id===id ? {...l,status:"rejected"} : l
      )
    );

    showToast("Leave rejected");

  };

  /* ================= FILTER ================= */

  const visibleLeaves=leaveData.filter((l)=>{
    if(isAdmin) return true;
    if(isManager) return l.status==="pending_manager";
    if(isHR) return l.status==="pending_hr";
    return l.userId===currentUser.id;
  });

  /* ================= ADMIN REPORT ================= */

  const downloadAttendance=()=>{

    const rows=attendanceData.map((r)=>{

      const user=mockUsers.find((u)=>u.id===r.userId);

      return `${user?.name},${user?.role},${r.date},${r.checkIn},${r.checkOut}`;

    });

    const csv=[
      "Name,Role,Date,CheckIn,CheckOut",
      ...rows
    ].join("\n");

    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);

    const a=document.createElement("a");
    a.href=url;
    a.download="attendance_report.csv";
    a.click();

  };

  /* ================= ROLE COLOR ================= */

  const roleColor=(role:string)=>{

    if(role==="admin") return "bg-red-500 text-white";
    if(role==="hr") return "bg-blue-500 text-white";
    if(role==="manager") return "bg-purple-500 text-white";

    return "bg-gray-500 text-white";

  };

  /* ================= STATUS COLOR ================= */

  const statusColor=(status:string)=>{

    if(status==="approved") return "bg-green-500 text-white";
    if(status==="rejected") return "bg-red-500 text-white";
    if(status.includes("pending")) return "bg-yellow-400 text-black";

    return "bg-gray-200";

  };

  /* ================= UI ================= */

  return (

<div className="space-y-8 max-w-7xl mx-auto px-3">

{/* TOAST */}

{toast &&(
<div className="fixed top-6 right-6 bg-black text-white px-5 py-3 rounded-xl shadow-lg z-50">
{toast}
</div>
)}

{/* ATTENDANCE */}

<Card>

<CardHeader>
<CardTitle>Today's Attendance</CardTitle>
</CardHeader>

<CardContent className="flex flex-col md:flex-row justify-between gap-6">

<div>
<p>Check In : {todayAttendance?.checkIn || checkInTime || "-"}</p>
<p>Check Out : {todayAttendance?.checkOut || "-"}</p>
</div>

<div className="flex gap-3 flex-wrap">

{!todayAttendance &&(

<Button onClick={handleCheckIn} className="bg-blue-600 text-white">
<LogIn size={16}/> Check In
</Button>

)}

{(todayAttendance || checkInTime) &&
!todayAttendance?.checkOut &&(

<Button onClick={handleCheckOut} className="bg-red-500 text-white">
<LogOut size={16}/> Check Out
</Button>

)}

</div>

</CardContent>

</Card>

{/* ================= ADMIN USER LIST ================= */}

{isAdmin &&(

<Card>

<CardHeader className="flex flex-row items-center gap-2">
<Users size={18}/>
<CardTitle>All Registered Users</CardTitle>
</CardHeader>

<CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">

{mockUsers.map((user)=>(
<div
key={user.id}
className="border rounded-lg p-4 bg-white shadow-sm flex justify-between items-center"
>

<div>
<p className="font-semibold">{user.name}</p>
<p className="text-sm text-gray-500">{user.email}</p>
</div>

<Badge className={roleColor(user.role)}>
{user.role}
</Badge>

</div>
))}

</CardContent>

</Card>

)}

{/* ================= ADMIN REPORT ================= */}

{isAdmin &&(

<Card>

<CardHeader>
<CardTitle>Attendance Report</CardTitle>
</CardHeader>

<CardContent className="flex flex-col md:flex-row gap-4">

<input
type="date"
value={reportStart}
onChange={(e)=>setReportStart(e.target.value)}
className="border p-2 rounded"
/>

<input
type="date"
value={reportEnd}
onChange={(e)=>setReportEnd(e.target.value)}
className="border p-2 rounded"
/>

<Button
onClick={downloadAttendance}
className="bg-black text-white flex items-center gap-2"
>
<Download size={16}/>
Download CSV
</Button>

</CardContent>

</Card>

)}

{/* ================= LEAVE REQUEST ================= */}

{!isAdmin &&(

<Dialog>

<DialogTrigger asChild>

<Button className="bg-indigo-600 text-white">
Request Leave
</Button>

</DialogTrigger>

<DialogContent>

<DialogHeader>
<DialogTitle>Submit Leave</DialogTitle>
</DialogHeader>

<div className="space-y-4">

<input
className="border p-2 rounded w-full"
placeholder="Leave Type"
value={leaveType}
onChange={(e)=>setLeaveType(e.target.value)}
/>

<input
type="date"
className="border p-2 rounded w-full"
value={startDate}
onChange={(e)=>setStartDate(e.target.value)}
/>

<input
type="date"
className="border p-2 rounded w-full"
value={endDate}
onChange={(e)=>setEndDate(e.target.value)}
/>

<input
className="border p-2 rounded w-full"
placeholder="Reason"
value={reason}
onChange={(e)=>setReason(e.target.value)}
/>

<Textarea
placeholder="Description"
value={description}
onChange={(e)=>setDescription(e.target.value)}
/>

<Button
onClick={submitLeave}
className="w-full bg-indigo-600 text-white"
>
Submit Leave
</Button>

</div>

</DialogContent>

</Dialog>

)}

{/* ================= LEAVE TABLE ================= */}

<Card>

<CardHeader>
<CardTitle>Leave Requests</CardTitle>
</CardHeader>

<CardContent className="overflow-x-auto">

<Table className="min-w-[700px]">

<TableBody>

{visibleLeaves.map((l)=>{

const user=mockUsers.find((u)=>u.id===l.userId);

return(

<TableRow key={l.id}>

{(isManager||isHR||isAdmin)&&(
<TableCell className="font-medium">
{user?.name}
</TableCell>
)}

<TableCell>{l.type}</TableCell>

<TableCell>
{l.startDate} — {l.endDate}
</TableCell>

<TableCell>

<Badge className={statusColor(l.status)}>
{l.status.replace("_"," ")}
</Badge>

</TableCell>

<TableCell>{l.reason}</TableCell>

{(isManager||isHR||isAdmin)&&
l.status!=="approved" &&
l.status!=="rejected" &&(

<TableCell>

<div className="flex gap-2">

<Button
size="sm"
className="bg-green-600 text-white"
onClick={()=>approveLeave(l.id)}
>
Approve
</Button>

<Button
size="sm"
className="bg-red-600 text-white"
onClick={()=>rejectLeave(l.id)}
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