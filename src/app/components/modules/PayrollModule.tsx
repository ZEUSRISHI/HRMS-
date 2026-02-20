import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DollarSign, Download, FileText } from "lucide-react";
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

  // ✅ load payroll
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRecords(JSON.parse(saved));
    } else {
      setRecords(mockPayroll);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockPayroll));
    }
  }, []);

  // ✅ persist payroll
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  // ✅ guard — prevents TS + runtime crash
  if (!currentUser) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading payroll module...
      </div>
    );
  }

  const isHR = currentUser.role === "hr";
  const isAdmin = currentUser.role === "admin";

  // ✅ role filtering
  const payrollRecords =
    isHR || isAdmin
      ? records
      : records.filter((p) => p.userId === currentUser.id);

  // ✅ totals
  const totalProcessed = records
    .filter((p) => p.status === "processed")
    .reduce((sum, p) => sum + p.netSalary, 0);

  const totalPending = records
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.netSalary, 0);

  // ✅ HR only processing
  function processPayroll() {
    if (!isHR) return;

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
    alert("Payroll processed and saved locally");
  }

  // ================= UI =================

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Payroll Management</h1>
          <p className="text-sm text-muted-foreground">
            Track salary, payslips, and payment status
          </p>
        </div>

        {/* ✅ HR only button */}
        {isHR && (
          <Button className="gap-2" onClick={processPayroll}>
            <FileText className="h-4 w-4" />
            Process Payroll
          </Button>
        )}
      </div>

      {/* ===== Summary ===== */}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm">Total Processed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600">
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
            <div className="font-semibold text-orange-600">
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
            <div className="font-semibold">
              {mockUsers.filter((u) => u.status === "active").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Table ===== */}

      <Card>
        <CardHeader className="flex justify-between">
          <CardTitle>Payroll Records</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {(isHR || isAdmin) && <TableHead>Employee</TableHead>}
                <TableHead>Month</TableHead>
                <TableHead>Basic</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {payrollRecords.map((record) => {
                const user = mockUsers.find(
                  (u) => u.id === record.userId
                );

                return (
                  <TableRow key={record.id}>
                    {(isHR || isAdmin) && (
                      <TableCell>{user?.name ?? "-"}</TableCell>
                    )}

                    <TableCell>
                      {format(new Date(record.month), "MMMM yyyy")}
                    </TableCell>

                    <TableCell>${record.basicSalary}</TableCell>

                    <TableCell className="text-green-600">
                      +${record.allowances}
                    </TableCell>

                    <TableCell className="text-red-600">
                      -${record.deductions}
                    </TableCell>

                    <TableCell className="font-semibold">
                      ${record.netSalary}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          record.status === "processed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {record.paymentDate
                        ? format(
                            new Date(record.paymentDate),
                            "MMM d, yyyy"
                          )
                        : "-"}
                    </TableCell>

                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                        Payslip
                      </Button>
                    </TableCell>
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