import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DollarSign, FileText, Trash, Download, Plus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { payrollApi } from "@/services/api";
import { format } from "date-fns";

interface PayrollRecord {
  _id: string;
  userId: any;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "pending" | "processed";
  paymentDate?: string;
}

export function PayrollModule() {
  const { currentUser } = useAuth();

  // ✅ Safely derive role — handles undefined, null, or casing differences
  const rawRole  = (currentUser as any)?._doc?.role
    ?? (currentUser as any)?.role
    ?? "";
  const role    = rawRole.toString().toLowerCase().trim();
  const isAdmin = role === "admin";
  const isHR    = role === "hr";
  const canView = isAdmin || isHR;

  const [records,    setRecords]    = useState<PayrollRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId:      "",
    month:       "",
    basicSalary: "",
    allowances:  "",
    deductions:  "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadPayroll = async () => {
    try {
      setLoading(true);
      // Re-derive role inside the function to avoid stale closure
      const r = (
        (currentUser as any)?._doc?.role ??
        (currentUser as any)?.role ??
        ""
      ).toString().toLowerCase().trim();

      const data = r === "admin" || r === "hr"
        ? await payrollApi.getAll()
        : await payrollApi.getMy();

      setRecords(data.records || []);
    } catch (err: any) {
      console.error("Payroll load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Re-run whenever currentUser changes so HR sees data after login
  useEffect(() => {
    if (!currentUser) return;
    loadPayroll();
  }, [currentUser]);

  /* ===== STATS ===== */
  const totalProcessed = records
    .filter((p) => p.status === "processed")
    .reduce((sum, p) => sum + p.netSalary, 0);

  const totalPending = records
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.netSalary, 0);

  /* ===== CREATE ===== */
  const handleCreate = async () => {
    if (!createForm.userId || !createForm.month || !createForm.basicSalary) {
      return showToast("❌ User ID, month and basic salary are required");
    }
    try {
      await payrollApi.create({
        userId:      createForm.userId,
        month:       createForm.month,
        basicSalary: Number(createForm.basicSalary),
        allowances:  Number(createForm.allowances  || 0),
        deductions:  Number(createForm.deductions  || 0),
      });
      showToast("✅ Payroll record created");
      setCreateOpen(false);
      setCreateForm({ userId: "", month: "", basicSalary: "", allowances: "", deductions: "" });
      await loadPayroll();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== PROCESS ===== */
  const handleProcessPayroll = async () => {
    if (!window.confirm("Process all pending payrolls?")) return;
    try {
      await payrollApi.process();
      showToast("✅ All pending payrolls processed successfully");
      await loadPayroll();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== UPDATE ALLOWANCE ===== */
  const handleUpdatePayroll = async (id: string, allowances: number) => {
    try {
      await payrollApi.update(id, { allowances });
      showToast("✅ Allowance updated");
      await loadPayroll();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== DELETE ===== */
  const handleDeletePayroll = async (id: string) => {
    if (!window.confirm("Delete this payroll record?")) return;
    try {
      await payrollApi.delete(id);
      showToast("✅ Payroll record deleted");
      await loadPayroll();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== DOWNLOAD CSV ===== */
  const downloadReport = () => {
    if (!records.length) return alert("No payroll records to download.");
    const headers = ["Employee", "Month", "Basic", "Allowances", "Deductions", "Net", "Status", "Payment Date"];
    const rows = records.map((r) => [
      r.userId?.name || "-",
      r.month,
      r.basicSalary,
      r.allowances,
      r.deductions,
      r.netSalary,
      r.status,
      r.paymentDate ? format(new Date(r.paymentDate), "MMM d, yyyy") : "-",
    ]);
    const csv = "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `payroll_report_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  /* ===== PAYSLIP ===== */
  const downloadPayslip = (record: PayrollRecord) => {
    const employeeName = record.userId?.name || "Employee";
    const html = `
      <html><head><title>Payslip - ${record.month}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h2 { color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td, th { padding: 10px 14px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .net { font-size: 1.2em; font-weight: bold; color: #16a34a; }
        .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; }
      </style></head>
      <body>
        <h2>Payslip — ${record.month}</h2>
        <p><strong>Employee:</strong> ${employeeName}</p>
        <p><strong>Email:</strong> ${record.userId?.email || "-"}</p>
        <p><strong>Status:</strong> ${record.status}</p>
        ${record.paymentDate
          ? `<p><strong>Payment Date:</strong> ${format(new Date(record.paymentDate), "MMM d, yyyy")}</p>`
          : ""}
        <table>
          <tr><th>Component</th><th>Amount</th></tr>
          <tr><td>Basic Salary</td><td>₹${record.basicSalary?.toLocaleString()}</td></tr>
          <tr><td>Allowances</td><td style="color:green">+₹${record.allowances?.toLocaleString()}</td></tr>
          <tr><td>Deductions</td><td style="color:red">-₹${record.deductions?.toLocaleString()}</td></tr>
          <tr><td><strong>Net Salary</strong></td><td class="net">₹${record.netSalary?.toLocaleString()}</td></tr>
        </table>
        <div class="footer">Generated on ${format(new Date(), "MMM d, yyyy")} — HRMS System</div>
      </body></html>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank");
    win?.print();
  };

  /* ===== GUARDS ===== */
  if (!currentUser) return null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-semibold text-lg">Payroll Management</h1>
          <p className="text-sm text-gray-500">
            Track salary, payslips and payment status
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Add Payroll — admin only */}
          {isAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Payroll Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>User ID *</Label>
                    <Input
                      placeholder="MongoDB user _id"
                      value={createForm.userId}
                      onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Month * (e.g. 2025-04)</Label>
                    <Input
                      placeholder="YYYY-MM"
                      value={createForm.month}
                      onChange={(e) => setCreateForm({ ...createForm, month: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Basic Salary *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={createForm.basicSalary}
                      onChange={(e) => setCreateForm({ ...createForm, basicSalary: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Allowances</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={createForm.allowances}
                      onChange={(e) => setCreateForm({ ...createForm, allowances: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Deductions</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={createForm.deductions}
                      onChange={(e) => setCreateForm({ ...createForm, deductions: e.target.value })}
                    />
                  </div>
                  <Button className="w-full" onClick={handleCreate}>
                    Create Record
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Process Payroll — admin only */}
          {isAdmin && (
            <Button className="gap-2" onClick={handleProcessPayroll}>
              <FileText className="h-4 w-4" /> Process Payroll
            </Button>
          )}

          {/* Download Report — admin and HR */}
          {canView && (
            <Button variant="outline" className="gap-2" onClick={downloadReport}>
              <Download className="h-4 w-4" /> Download Report
            </Button>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Processed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600 text-lg">
              ₹{totalProcessed.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pending Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-orange-600 text-lg">
              ₹{totalPending.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Records</CardTitle>
            <FileText className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-lg">{records.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  {canView && <TableHead>Employee</TableHead>}
                  <TableHead>Month</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Payslip</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canView ? (isAdmin ? 10 : 9) : 8}
                      className="text-center text-gray-400 py-10"
                    >
                      No payroll records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record._id}>
                      {canView && (
                        <TableCell>{record.userId?.name || "-"}</TableCell>
                      )}
                      <TableCell>{record.month}</TableCell>
                      <TableCell>₹{record.basicSalary?.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">
                        +₹{record.allowances?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-red-600">
                        -₹{record.deductions?.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{record.netSalary?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.status === "processed" ? "default" : "secondary"}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.paymentDate
                          ? format(new Date(record.paymentDate), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => downloadPayslip(record)}
                        >
                          <Download className="h-3 w-3" /> Payslip
                        </Button>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdatePayroll(record._id, record.allowances + 100)}
                            >
                              +Allowance
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeletePayroll(record._id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
