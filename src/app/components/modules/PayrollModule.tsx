import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DollarSign, Download, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mockPayroll, mockUsers } from '../../data/mockData';
import { format } from 'date-fns';

export function PayrollModule() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'admin';

  const payrollRecords = isAdmin 
    ? mockPayroll 
    : mockPayroll.filter(p => p.userId === currentUser.id);

  const totalProcessed = mockPayroll
    .filter(p => p.status === 'processed')
    .reduce((sum, p) => sum + p.netSalary, 0);

  const totalPending = mockPayroll
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.netSalary, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Payroll Management</h1>
          <p className="text-sm text-muted-foreground">Track salary, payslips, and payment status</p>
        </div>
        {isAdmin && (
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Process Payroll
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600">${totalProcessed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-orange-600">${totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{mockUsers.filter(u => u.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
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
                {isAdmin && <TableHead>Employee</TableHead>}
                <TableHead>Month</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollRecords.map(record => {
                const user = mockUsers.find(u => u.id === record.userId);
                return (
                  <TableRow key={record.id}>
                    {isAdmin && <TableCell className="font-medium">{user?.name}</TableCell>}
                    <TableCell>{format(new Date(record.month), 'MMMM yyyy')}</TableCell>
                    <TableCell>${record.basicSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">+${record.allowances.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">-${record.deductions.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">${record.netSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'processed' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.paymentDate ? format(new Date(record.paymentDate), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="gap-2">
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

      {/* Payslip Detail (for non-admin users) */}
      {!isAdmin && payrollRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Payslip Details</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const latestPayroll = payrollRecords[0];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Month</p>
                      <p className="font-semibold">{format(new Date(latestPayroll.month), 'MMMM yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={latestPayroll.status === 'processed' ? 'default' : 'secondary'}>
                        {latestPayroll.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Salary Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Basic Salary</span>
                        <span className="font-medium">${latestPayroll.basicSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span className="text-sm">Allowances</span>
                        <span className="font-medium">+${latestPayroll.allowances.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span className="text-sm">Deductions</span>
                        <span className="font-medium">-${latestPayroll.deductions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="font-semibold">Net Salary</span>
                        <span className="font-semibold">${latestPayroll.netSalary.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {latestPayroll.paymentDate && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Payment Date: </span>
                        <span className="font-medium">{format(new Date(latestPayroll.paymentDate), 'MMMM d, yyyy')}</span>
                      </p>
                    </div>
                  )}

                  <Button className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download Payslip
                  </Button>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
