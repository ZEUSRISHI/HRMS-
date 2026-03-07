import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { DollarSign, FileText, Trash, Download } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { mockPayroll, mockUsers } from "../../data/mockData";
import { format } from "date-fns";

type PayrollRecord = {
  id: string;
  userId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "pending" | "processed";
  paymentDate?: string;
};

const STORAGE_KEY = "startup_payroll_records";

export function PayrollModule() {
  const auth = useAuth();
  const currentUser = auth?.currentUser ?? null;

  const [records, setRecords] = useState<PayrollRecord[]>([]);

  // ================= LOAD =================
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRecords(JSON.parse(saved));
    } else {
      setRecords(mockPayroll);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockPayroll));
    }
  }, []);

  // ================= SAVE =================
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  if (!currentUser) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading payroll module...
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";

  // ================= FILTER =================
  const payrollRecords = isAdmin
    ? records
    : records.filter((p) => p.userId === currentUser.id);

  // ================= TOTALS =================
  const totalProcessed = records
    .filter((p) => p.status === "processed")
    .reduce((sum, p) => sum + p.netSalary, 0);

  const totalPending = records
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.netSalary, 0);

  // ================= CRUD =================
  function addPayroll(userId: string) {
    if (!isAdmin) return;

    const basicSalary = 5000;
    const allowances = 500;
    const deductions = 300;

    const newRecord: PayrollRecord = {
      id: crypto.randomUUID(),
      userId,
      month: new Date().toISOString(),
      basicSalary,
      allowances,
      deductions,
      netSalary: basicSalary + allowances - deductions,
      status: "pending",
    };

    setRecords((prev) => [...prev, newRecord]);
  }

  function updatePayroll(id: string) {
    if (!isAdmin) return;

    const updated = records.map((p) =>
      p.id === id
        ? {
            ...p,
            allowances: p.allowances + 100,
            netSalary: p.basicSalary + (p.allowances + 100) - p.deductions,
          }
        : p
    );

    setRecords(updated);
  }

  function deletePayroll(id: string) {
    if (!isAdmin) return;
    setRecords(records.filter((p) => p.id !== id));
  }

  function processPayroll() {
    if (!isAdmin) return;

    const updated = records.map((p) =>
      p.status === "pending"
        ? {
            ...p,
            status: "processed" as const,
            paymentDate: new Date().toISOString(),
          }
        : p
    );

    setRecords(updated);
    alert("Payroll processed successfully and saved locally.");
  }

  // ================= DOWNLOAD REPORT =================
  function downloadReport() {
    if (!records.length) return alert("No payroll records to download.");

    const headers = [
      "Employee",
      "Month",
      "Basic Salary",
      "Allowances",
      "Deductions",
      "Net Salary",
      "Status",
      "Payment Date",
    ];

    const rows = records.map((r) => {
      const user = mockUsers.find((u) => u.id === r.userId);
      return [
        user?.name ?? "-",
        format(new Date(r.month), "MMMM yyyy"),
        r.basicSalary,
        r.allowances,
        r.deductions,
        r.netSalary,
        r.status,
        r.paymentDate ? format(new Date(r.paymentDate), "MMM d, yyyy") : "-",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `payroll_report_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  }

  // ================= UI =================
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="font-semibold text-lg mb-1">Payroll Management</h1>
          <p className="text-sm text-muted-foreground">
            Track salary, payslips, and payment status
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {isAdmin && (
            <>
              <Button className="gap-2 w-full md:w-auto" onClick={processPayroll}>
                <FileText className="h-4 w-4" />
                Process Payroll
              </Button>

              <Button
                className="gap-2 w-full md:w-auto"
                variant="outline"
                onClick={downloadReport}
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            </>
          )}
        </div>

      </div>

      {/* ===== SUMMARY ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm">Total Processed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600 text-lg">
              ${totalProcessed.toLocaleString()}
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
              ${totalPending.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm">Employees</CardTitle>
            <FileText className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-lg">
              {mockUsers.filter((u) => u.status === "active").length}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ===== TABLE ===== */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle>Payroll Records</CardTitle>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => addPayroll(mockUsers[0].id)}>
              Add Payroll
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Employee</TableHead>}
                  <TableHead>Month</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {payrollRecords.map((record) => {
                  const user = mockUsers.find((u) => u.id === record.userId);
                  return (
                    <TableRow key={record.id}>
                      {isAdmin && <TableCell>{user?.name ?? "-"}</TableCell>}
                      <TableCell>{format(new Date(record.month), "MMMM yyyy")}</TableCell>
                      <TableCell>${record.basicSalary}</TableCell>
                      <TableCell className="text-green-600">+${record.allowances}</TableCell>
                      <TableCell className="text-red-600">-${record.deductions}</TableCell>
                      <TableCell className="font-semibold">${record.netSalary}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === "processed" ? "default" : "secondary"}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.paymentDate ? format(new Date(record.paymentDate), "MMM d, yyyy") : "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => updatePayroll(record.id)}>
                              Update
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deletePayroll(record.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>

            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}