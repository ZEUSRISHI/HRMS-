import { useEffect, useState, useMemo } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "../ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Input }  from "../ui/input";
import { Label }  from "../ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "../ui/select";
import {
  Trash, Download,
  Plus, RefreshCw, Users, TrendingUp,
  Search, Edit2,
  CheckCircle, Clock, AlertCircle, Zap,
} from "lucide-react";
import { useAuth }    from "../../contexts/AuthContext";
import { payrollApi } from "@/services/api";
import { format }     from "date-fns";

/* ─── Types ──────────────────────────────────────────────────── */
interface Allowances {
  hra: number; travel: number; medical: number; special: number; other: number;
}
interface Deductions {
  pf: number; esi: number; tds: number; leaveDeduction: number; other: number;
}
interface PayrollRecord {
  _id: string;
  userId: { _id: string; name: string; email: string; role: string; department?: string } | null;
  month: string;
  periodStart?: string;
  periodEnd?: string;
  role: string;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  paidLeaveDays: number;
  basicSalary: number;
  allowances: Allowances;
  deductions: Deductions;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: "draft" | "pending" | "processed" | "paid";
  paymentDate?: string;
  paymentMode?: string;
  remarks?: string;
}

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (n: number) =>
  "₹" + (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const statusColor: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-700",
  pending:   "bg-yellow-100 text-yellow-700",
  processed: "bg-blue-100 text-blue-700",
  paid:      "bg-green-100 text-green-700",
};

const statusIcon: Record<string, React.ReactElement> = {
  draft:     <AlertCircle className="h-3 w-3" />,
  pending:   <Clock        className="h-3 w-3" />,
  processed: <CheckCircle  className="h-3 w-3" />,
  paid:      <Zap          className="h-3 w-3" />,
};

/* ─── Blank form ──────────────────────────────────────────────── */
const blankForm = {
  userId: "", month: "", basicSalary: "",
  paidLeaveDays: "1", paymentMode: "bank_transfer", remarks: "",
  extraAllowances: { special: "", other: "" },
  extraDeductions: { tds: "", other: "" },
};

/* ═══════════════════════════════════════════════════════════════ */
export function PayrollModule() {
  const { currentUser } = useAuth();
  const role    = ((currentUser as any)?._doc?.role ?? (currentUser as any)?.role ?? "").toLowerCase().trim();
  const isAdmin = role === "admin";

  const [records,      setRecords]      = useState<PayrollRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole,   setFilterRole]   = useState("all");
  const [reportType,   setReportType]   = useState<"monthly" | "weekly" | "custom">("monthly");
  const [reportMonth,  setReportMonth]  = useState(format(new Date(), "yyyy-MM"));
  const [reportStart,  setReportStart]  = useState("");
  const [reportEnd,    setReportEnd]    = useState("");

  /* dialogs */
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [editForm,   setEditForm]   = useState<any>({});
  const [bulkOpen,   setBulkOpen]   = useState(false);
  const [bulkMonth,  setBulkMonth]  = useState(format(new Date(), "yyyy-MM"));
  const [createForm, setCreateForm] = useState({ ...blankForm });

  /* ── toast ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── load ── */
  const loadPayroll = async () => {
    try {
      setLoading(true);
      const r = (
        (currentUser as any)?._doc?.role ??
        (currentUser as any)?.role ??
        ""
      ).toLowerCase().trim();
      const data = (r === "admin" || r === "hr")
        ? await payrollApi.getAll()
        : await payrollApi.getMy();
      setRecords(data.records || []);
    } catch (err: any) {
      showToast("Failed to load payroll: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (currentUser) loadPayroll(); }, [currentUser]);

  /* ── filtered records ── */
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const name  = r.userId?.name?.toLowerCase() || "";
      const email = r.userId?.email?.toLowerCase() || "";
      const q     = search.toLowerCase();
      const matchSearch = !q || name.includes(q) || email.includes(q) || r.month.includes(q);
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchRole   = filterRole   === "all" || r.role   === filterRole;
      return matchSearch && matchStatus && matchRole;
    });
  }, [records, search, filterStatus, filterRole]);

  /* ── stats ── */
  const stats = useMemo(() => ({
    totalNetPaid:      records.filter(r => r.status === "paid").reduce((s, r) => s + r.netSalary, 0),
    totalNetProcessed: records.filter(r => r.status === "processed").reduce((s, r) => s + r.netSalary, 0),
    totalPending:      records.filter(r => ["draft", "pending"].includes(r.status)).reduce((s, r) => s + r.netSalary, 0),
    headcount:         new Set(records.map(r => r.userId?._id)).size,
  }), [records]);

  /* ── CREATE ── */
  const handleCreate = async () => {
    const { userId, month, basicSalary } = createForm;
    if (!userId || !month || !basicSalary)
      return showToast("User ID, month and basic salary are required", "error");
    try {
      await payrollApi.create({
        userId,
        month,
        basicSalary:     Number(basicSalary),
        paidLeaveDays:   Number(createForm.paidLeaveDays || 1),
        paymentMode:     createForm.paymentMode,
        remarks:         createForm.remarks,
        extraAllowances: {
          special: Number(createForm.extraAllowances.special || 0),
          other:   Number(createForm.extraAllowances.other   || 0),
        },
        extraDeductions: {
          tds:   Number(createForm.extraDeductions.tds   || 0),
          other: Number(createForm.extraDeductions.other || 0),
        },
      });
      showToast("Payroll record created successfully");
      setCreateOpen(false);
      setCreateForm({ ...blankForm });
      await loadPayroll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  /* ── BULK GENERATE ── */
  const handleBulkGenerate = async () => {
    if (!window.confirm(`Auto-generate payroll for all employees for ${bulkMonth}?`)) return;
    try {
      const res = await payrollApi.bulk({ month: bulkMonth, paidLeaveDays: 1 });
      showToast(`Created: ${res.created}, Skipped: ${res.skipped}`);
      setBulkOpen(false);
      await loadPayroll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  /* ── PROCESS ── */
  const handleProcess = async () => {
    if (!window.confirm("Process all draft/pending payrolls?")) return;
    try {
      const res = await payrollApi.process();
      showToast(res.message || "Payrolls processed");
      await loadPayroll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  /* ── EDIT ── */
  const openEdit = (rec: PayrollRecord) => {
    setEditRecord(rec);
    setEditForm({
      presentDays:      rec.presentDays,
      leaveDays:        rec.leaveDays,
      status:           rec.status,
      paymentMode:      rec.paymentMode || "bank_transfer",
      remarks:          rec.remarks || "",
      tds:              rec.deductions?.tds || 0,
      otherDeduction:   rec.deductions?.other || 0,
      specialAllowance: rec.allowances?.special || 0,
    });
  };

  const handleEdit = async () => {
    if (!editRecord) return;
    try {
      await payrollApi.update(editRecord._id, {
        presentDays: Number(editForm.presentDays),
        leaveDays:   Number(editForm.leaveDays),
        status:      editForm.status,
        paymentMode: editForm.paymentMode,
        remarks:     editForm.remarks,
        deductions:  { tds: Number(editForm.tds), other: Number(editForm.otherDeduction) },
        allowances:  { special: Number(editForm.specialAllowance) },
      });
      showToast("Record updated successfully");
      setEditRecord(null);
      await loadPayroll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  /* ── DELETE ── */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this payroll record?")) return;
    try {
      await payrollApi.delete(id);
      showToast("Record deleted");
      await loadPayroll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  /* ── DOWNLOAD CSV REPORT ── */
  const downloadReport = () => {
    let data = [...records];

    if (reportType === "monthly") {
      data = data.filter(r => r.month === reportMonth);
    } else if ((reportType === "weekly" || reportType === "custom") && reportStart && reportEnd) {
      const s = new Date(reportStart);
      const e = new Date(reportEnd);
      data = data.filter(r => {
        const d = new Date(r.periodStart || r.month + "-01");
        return d >= s && d <= e;
      });
    }

    if (!data.length) return showToast("No records for selected period", "error");

    const headers = [
      "Employee", "Email", "Role", "Month",
      "Period Start", "Period End",
      "Working Days", "Present Days", "Leave Days",
      "Basic Salary", "HRA", "Travel", "Medical", "Special Allowance", "Other Allowance",
      "Gross Salary", "PF", "ESI", "TDS", "Leave Deduction", "Other Deduction",
      "Total Deductions", "Net Salary", "Status", "Payment Date", "Payment Mode",
    ];

    const rows = data.map(r => [
      r.userId?.name  || "-",
      r.userId?.email || "-",
      r.role          || "-",
      r.month,
      r.periodStart ? format(new Date(r.periodStart), "dd MMM yyyy") : "-",
      r.periodEnd   ? format(new Date(r.periodEnd),   "dd MMM yyyy") : "-",
      r.workingDays, r.presentDays, r.leaveDays,
      r.basicSalary,
      r.allowances?.hra      || 0,
      r.allowances?.travel   || 0,
      r.allowances?.medical  || 0,
      r.allowances?.special  || 0,
      r.allowances?.other    || 0,
      r.grossSalary,
      r.deductions?.pf              || 0,
      r.deductions?.esi             || 0,
      r.deductions?.tds             || 0,
      r.deductions?.leaveDeduction  || 0,
      r.deductions?.other           || 0,
      r.totalDeductions,
      r.netSalary,
      r.status,
      r.paymentDate ? format(new Date(r.paymentDate), "dd MMM yyyy") : "-",
      r.paymentMode || "-",
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href  = url;
    link.download = `payroll_${reportType}_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Report downloaded (${data.length} records)`);
  };

  /* ── PAYSLIP HTML ── */
  const downloadPayslip = (rec: PayrollRecord) => {
    const name = rec.userId?.name || "Employee";
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Payslip – ${name} – ${rec.month}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:30px}
    .slip{max-width:760px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
    .header{background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);color:#fff;padding:28px 36px;display:flex;justify-content:space-between;align-items:center}
    .company{font-size:22px;font-weight:700;letter-spacing:.5px}
    .payslip-label{background:#f97316;color:#fff;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:600}
    .meta{padding:20px 36px;background:#f8fafc;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;border-bottom:1px solid #e2e8f0}
    .meta-item label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
    .meta-item span{font-size:14px;font-weight:600;color:#1e293b;display:block;margin-top:2px}
    .body{padding:28px 36px;display:grid;grid-template-columns:1fr 1fr;gap:28px}
    .section h3{font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
    .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed #f1f5f9;font-size:13px}
    .row:last-child{border-bottom:none}
    .row .label{color:#475569}
    .row .val{font-weight:600;color:#1e293b}
    .row.earn .val{color:#16a34a}
    .row.dedu .val{color:#dc2626}
    .net{margin:0 36px 28px;background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:10px;padding:20px 28px;display:flex;justify-content:space-between;align-items:center}
    .net .label{color:#94a3b8;font-size:13px}
    .net .amount{color:#fff;font-size:26px;font-weight:700}
    .footer{text-align:center;padding:16px;font-size:11px;color:#94a3b8;background:#f8fafc;border-top:1px solid #e2e8f0}
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
    .badge.processed,.badge.paid{background:#dcfce7;color:#16a34a}
    .badge.pending{background:#fef9c3;color:#a16207}
    .badge.draft{background:#f1f5f9;color:#64748b}
    @media print{body{padding:0;background:#fff}.slip{box-shadow:none;border-radius:0}}
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div>
        <div class="company">🏢 HRMS System</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px">Employee Pay Statement</div>
      </div>
      <div class="payslip-label">PAYSLIP</div>
    </div>
    <div class="meta">
      <div class="meta-item"><label>Employee</label><span>${name}</span></div>
      <div class="meta-item"><label>Role</label><span style="text-transform:capitalize">${rec.role || "-"}</span></div>
      <div class="meta-item"><label>Email</label><span>${rec.userId?.email || "-"}</span></div>
      <div class="meta-item">
        <label>Pay Period</label>
        <span>
          ${rec.periodStart
            ? format(new Date(rec.periodStart), "dd MMM")
            : "01 " + rec.month.split("-")[1] + " " + rec.month.split("-")[0]}
          –
          ${rec.periodEnd
            ? format(new Date(rec.periodEnd), "dd MMM yyyy")
            : rec.month}
        </span>
      </div>
      <div class="meta-item"><label>Working Days</label><span>${rec.workingDays || "-"} days</span></div>
      <div class="meta-item"><label>Present / Leave</label><span>${rec.presentDays || 0} / ${rec.leaveDays || 0} days</span></div>
    </div>
    <div class="body">
      <div class="section">
        <h3>💰 Earnings</h3>
        <div class="row earn"><span class="label">Basic Salary</span><span class="val">${fmt(rec.basicSalary)}</span></div>
        <div class="row earn"><span class="label">HRA</span><span class="val">+${fmt(rec.allowances?.hra)}</span></div>
        <div class="row earn"><span class="label">Travel Allowance</span><span class="val">+${fmt(rec.allowances?.travel)}</span></div>
        <div class="row earn"><span class="label">Medical Allowance</span><span class="val">+${fmt(rec.allowances?.medical)}</span></div>
        ${rec.allowances?.special ? `<div class="row earn"><span class="label">Special Allowance</span><span class="val">+${fmt(rec.allowances.special)}</span></div>` : ""}
        ${rec.allowances?.other   ? `<div class="row earn"><span class="label">Other Allowance</span><span class="val">+${fmt(rec.allowances.other)}</span></div>`   : ""}
        <div class="row" style="margin-top:8px;font-weight:700">
          <span class="label">Gross Salary</span>
          <span class="val" style="color:#2563eb">${fmt(rec.grossSalary)}</span>
        </div>
      </div>
      <div class="section">
        <h3>📉 Deductions</h3>
        <div class="row dedu"><span class="label">Provident Fund (12%)</span><span class="val">-${fmt(rec.deductions?.pf)}</span></div>
        <div class="row dedu"><span class="label">ESI</span><span class="val">-${fmt(rec.deductions?.esi)}</span></div>
        ${rec.deductions?.tds            ? `<div class="row dedu"><span class="label">TDS</span><span class="val">-${fmt(rec.deductions.tds)}</span></div>`                         : ""}
        ${rec.deductions?.leaveDeduction ? `<div class="row dedu"><span class="label">Leave Deduction</span><span class="val">-${fmt(rec.deductions.leaveDeduction)}</span></div>` : ""}
        ${rec.deductions?.other          ? `<div class="row dedu"><span class="label">Other Deduction</span><span class="val">-${fmt(rec.deductions.other)}</span></div>`          : ""}
        <div class="row" style="margin-top:8px;font-weight:700">
          <span class="label">Total Deductions</span>
          <span class="val" style="color:#dc2626">-${fmt(rec.totalDeductions)}</span>
        </div>
      </div>
    </div>
    <div class="net">
      <div>
        <div class="label">Net Take-Home Salary</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:2px">
          Status: <span class="badge ${rec.status}">${rec.status.toUpperCase()}</span>
          ${rec.paymentDate ? " · Paid on " + format(new Date(rec.paymentDate), "dd MMM yyyy") : ""}
        </div>
      </div>
      <div class="amount">${fmt(rec.netSalary)}</div>
    </div>
    <div class="footer">
      This is a computer-generated payslip. No signature required. · Generated ${format(new Date(), "dd MMM yyyy, hh:mm a")}
    </div>
  </div>
  <script>window.onload=()=>window.print()</script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  /* ─── GUARDS ─────────────────────────────────────────────────── */
  if (!currentUser || !isAdmin) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      🔒 Access restricted to administrators.
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Loading payroll data…</p>
    </div>
  );

  /* ─── RENDER ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 px-2 sm:px-0">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
          ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          {toast.type === "error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Salary computation · Payslips · Analytics</p>
        </div>
        <div className="flex flex-wrap gap-2">

          {/* Bulk Generate */}
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1.5 text-xs sm:text-sm h-9">
                <Zap className="h-3.5 w-3.5" /> Auto-Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Bulk Generate Payroll</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Month</Label>
                  <Input type="month" value={bulkMonth}
                    onChange={e => setBulkMonth(e.target.value)} />
                </div>
                <p className="text-xs text-gray-500">
                  Auto-creates payroll for all active employees using their basicSalary, attendance and leave data.
                </p>
                <Button className="w-full" onClick={handleBulkGenerate}>Generate</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Single */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 text-xs sm:text-sm h-9 bg-orange-500 hover:bg-orange-600">
                <Plus className="h-3.5 w-3.5" /> Add Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Payroll Record</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>User ID *</Label>
                    <Input placeholder="MongoDB _id" value={createForm.userId}
                      onChange={e => setCreateForm({ ...createForm, userId: e.target.value })} />
                  </div>
                  <div>
                    <Label>Month * (YYYY-MM)</Label>
                    <Input type="month" value={createForm.month}
                      onChange={e => setCreateForm({ ...createForm, month: e.target.value })} />
                  </div>
                  <div>
                    <Label>Basic Salary *</Label>
                    <Input type="number" placeholder="0" value={createForm.basicSalary}
                      onChange={e => setCreateForm({ ...createForm, basicSalary: e.target.value })} />
                  </div>
                  <div>
                    <Label>Paid Leave Days</Label>
                    <Input type="number" placeholder="1" value={createForm.paidLeaveDays}
                      onChange={e => setCreateForm({ ...createForm, paidLeaveDays: e.target.value })} />
                  </div>
                  <div>
                    <Label>Payment Mode</Label>
                    <Select value={createForm.paymentMode}
                      onValueChange={v => setCreateForm({ ...createForm, paymentMode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extra Allowances</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Special Allowance</Label>
                    <Input type="number" placeholder="0"
                      value={createForm.extraAllowances.special}
                      onChange={e => setCreateForm({
                        ...createForm,
                        extraAllowances: { ...createForm.extraAllowances, special: e.target.value },
                      })} />
                  </div>
                  <div>
                    <Label>Other Allowance</Label>
                    <Input type="number" placeholder="0"
                      value={createForm.extraAllowances.other}
                      onChange={e => setCreateForm({
                        ...createForm,
                        extraAllowances: { ...createForm.extraAllowances, other: e.target.value },
                      })} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extra Deductions</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>TDS</Label>
                    <Input type="number" placeholder="0"
                      value={createForm.extraDeductions.tds}
                      onChange={e => setCreateForm({
                        ...createForm,
                        extraDeductions: { ...createForm.extraDeductions, tds: e.target.value },
                      })} />
                  </div>
                  <div>
                    <Label>Other Deduction</Label>
                    <Input type="number" placeholder="0"
                      value={createForm.extraDeductions.other}
                      onChange={e => setCreateForm({
                        ...createForm,
                        extraDeductions: { ...createForm.extraDeductions, other: e.target.value },
                      })} />
                  </div>
                </div>
                <div>
                  <Label>Remarks</Label>
                  <Input placeholder="Optional note" value={createForm.remarks}
                    onChange={e => setCreateForm({ ...createForm, remarks: e.target.value })} />
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleCreate}>
                  Create Record
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Process All */}
          <Button variant="outline" className="gap-1.5 text-xs sm:text-sm h-9" onClick={handleProcess}>
            <CheckCircle className="h-3.5 w-3.5" /> Process All
          </Button>

          {/* Refresh */}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={loadPayroll}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Paid",      value: fmt(stats.totalNetPaid),      icon: <CheckCircle className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "To Be Processed", value: fmt(stats.totalNetProcessed), icon: <TrendingUp   className="h-4 w-4" />, color: "text-blue-600",    bg: "bg-blue-50"    },
          { label: "Pending/Draft",   value: fmt(stats.totalPending),      icon: <Clock        className="h-4 w-4" />, color: "text-orange-600",  bg: "bg-orange-50"  },
          { label: "Headcount",       value: stats.headcount + " emp",     icon: <Users        className="h-4 w-4" />, color: "text-purple-600",  bg: "bg-purple-50"  },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Report Download Section ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Download className="h-4 w-4 text-orange-500" /> Download Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
            <div>
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "monthly" && (
              <div>
                <Label className="text-xs">Month</Label>
                <Input type="month" value={reportMonth} className="h-8 text-xs w-36"
                  onChange={e => setReportMonth(e.target.value)} />
              </div>
            )}

            {(reportType === "weekly" || reportType === "custom") && (
              <>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={reportStart} className="h-8 text-xs w-36"
                    onChange={e => setReportStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={reportEnd} className="h-8 text-xs w-36"
                    onChange={e => setReportEnd(e.target.value)} />
                </div>
              </>
            )}

            <Button onClick={downloadReport} className="h-8 text-xs gap-1.5 bg-orange-500 hover:bg-orange-600">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search employee…" value={search}
            className="pl-8 h-9 text-sm"
            onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="intern">Intern</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-gray-50 border-b">
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Month / Period</TableHead>
                  <TableHead className="text-xs">Attendance</TableHead>
                  <TableHead className="text-xs">Basic</TableHead>
                  <TableHead className="text-xs">Gross</TableHead>
                  <TableHead className="text-xs">Deductions</TableHead>
                  <TableHead className="text-xs font-bold">Net Salary</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-400 py-16 text-sm">
                      No payroll records found.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((rec) => (
                  <TableRow key={rec._id} className="hover:bg-orange-50/40 transition-colors">

                    {/* Employee */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(rec.userId?.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate max-w-[100px]">
                            {rec.userId?.name || "-"}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[100px] capitalize">
                            {rec.role}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Month */}
                    <TableCell>
                      <div className="text-xs font-semibold">{rec.month}</div>
                      {rec.periodStart && (
                        <div className="text-[10px] text-gray-400">
                          {format(new Date(rec.periodStart), "d MMM")}
                          {" – "}
                          {format(new Date(rec.periodEnd!), "d MMM yyyy")}
                        </div>
                      )}
                    </TableCell>

                    {/* Attendance */}
                    <TableCell>
                      <div className="text-xs">
                        <span className="text-green-600 font-medium">{rec.presentDays}P</span>
                        {" / "}
                        <span className="text-red-500">{rec.leaveDays}L</span>
                        {" / "}
                        <span className="text-gray-400">{rec.workingDays}W</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">{fmt(rec.basicSalary)}</TableCell>
                    <TableCell className="text-xs text-blue-600 font-medium">{fmt(rec.grossSalary)}</TableCell>
                    <TableCell className="text-xs text-red-500">-{fmt(rec.totalDeductions)}</TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-emerald-600">{fmt(rec.netSalary)}</span>
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${statusColor[rec.status]}`}>
                        {statusIcon[rec.status]}
                        {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          title="Download Payslip" onClick={() => downloadPayslip(rec)}>
                          <Download className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          title="Edit" onClick={() => openEdit(rec)}>
                          <Edit2 className="h-3.5 w-3.5 text-orange-500" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          title="Delete" onClick={() => handleDelete(rec._id)}>
                          <Trash className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t text-xs text-gray-400">
              Showing {filtered.length} of {records.length} records
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Dialog ── */}
      {editRecord && (
        <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Payroll — {editRecord.userId?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Present Days</Label>
                  <Input type="number" value={editForm.presentDays}
                    onChange={e => setEditForm({ ...editForm, presentDays: e.target.value })} />
                </div>
                <div>
                  <Label>Leave Days</Label>
                  <Input type="number" value={editForm.leaveDays}
                    onChange={e => setEditForm({ ...editForm, leaveDays: e.target.value })} />
                </div>
                <div>
                  <Label>TDS Deduction</Label>
                  <Input type="number" value={editForm.tds}
                    onChange={e => setEditForm({ ...editForm, tds: e.target.value })} />
                </div>
                <div>
                  <Label>Other Deduction</Label>
                  <Input type="number" value={editForm.otherDeduction}
                    onChange={e => setEditForm({ ...editForm, otherDeduction: e.target.value })} />
                </div>
                <div>
                  <Label>Special Allowance</Label>
                  <Input type="number" value={editForm.specialAllowance}
                    onChange={e => setEditForm({ ...editForm, specialAllowance: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status}
                    onValueChange={v => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={editForm.paymentMode}
                    onValueChange={v => setEditForm({ ...editForm, paymentMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Remarks</Label>
                <Input value={editForm.remarks}
                  onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={handleEdit}>
                  Save Changes
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setEditRecord(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
