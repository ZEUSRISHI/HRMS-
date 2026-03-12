import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../ui/table";
import { DollarSign, FileText, Trash, Download } from "lucide-react";
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
  const isAdmin = currentUser?.role === "admin";
  const isHR    = currentUser?.role === "hr";

  const [records, setRecords]   = useState<PayrollRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadPayroll = async () => {
    try {
      setLoading(true);
      const data = isAdmin || isHR
        ? await payrollApi.getAll()
        : await payrollApi.getMy();
      setRecords(data.records || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayroll(); }, []);

  const totalProcessed = records
    .filter((p) => p.status === "processed")
    .reduce((sum, p) => sum + p.netSalary, 0);

  const totalPending = records
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.netSalary, 0);

  const handleProcessPayroll = async () => {
    try {
      await payrollApi.process();
      showToast("✅ All pending payrolls processed successfully");
      await loadPayroll();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const handleUpdatePayroll = async (id: string, allowances: number) => {
    try {
      await payrollApi.update(id, { allowances });
      showToast("✅ Payroll updated");
      await loadPayroll();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

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

  const downloadReport = () => {
    if (!records.length) return alert("No payroll records to download.");
    const headers = ["Employee","Month","Basic","Allowances","Deductions","Net","Status","Payment Date"];
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

  if (!currentUser) return null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-semibold text-lg">Payroll Management</h1>
          <p className="text-sm text-gray-500">Track salary, payslips and payment status</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button className="gap-2" onClick={handleProcessPayroll}>
              <FileText className="h-4 w-4" /> Process Payroll
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadReport}>
              <Download className="h-4 w-4" /> Download Report
            </Button>
          </div>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex justify-between pb-2">
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
          <CardHeader className="flex justify-between pb-2">
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
          <CardHeader className="flex justify-between pb-2">
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
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  {(isAdmin || isHR) && <TableHead>Employee</TableHead>}
                  <TableHead>Month</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record._id}>
                    {(isAdmin || isHR) && (
                      <TableCell>{record.userId?.name || "-"}</TableCell>
                    )}
                    <TableCell>{record.month}</TableCell>
                    <TableCell>₹{record.basicSalary?.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">+₹{record.allowances?.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">-₹{record.deductions?.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">₹{record.netSalary?.toLocaleString()}</TableCell>
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
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline"
                            onClick={() => handleUpdatePayroll(record._id, record.allowances + 100)}>
                            +Allowance
                          </Button>
                          <Button size="sm" variant="destructive"
                            onClick={() => handleDeletePayroll(record._id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}