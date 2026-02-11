import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Building2, DollarSign, FileText, Plus, TrendingUp } from 'lucide-react';
import { mockClients, mockInvoices, mockProjects } from '../../data/mockData';
import { format } from 'date-fns';

export function ClientManagement() {
  const totalOutstanding = mockClients.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const activeClients = mockClients.filter(c => c.status === 'active').length;
  const totalInvoiced = mockInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = mockInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Client & Payment Tracking</h1>
          <p className="text-sm text-muted-foreground">Manage clients, invoices, and payment status</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client Name</Label>
                <Input placeholder="Enter client name..." />
              </div>
              <div>
                <Label>Company</Label>
                <Input placeholder="Enter company name..." />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="client@company.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" placeholder="+1234567890" />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea placeholder="Enter address..." rows={3} />
              </div>
              <Button className="w-full">Add Client</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{activeClients}</div>
            <p className="text-xs text-muted-foreground">Total clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">${(totalInvoiced / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments Received</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600">${(totalPaid / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">Collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-orange-600">${(totalOutstanding / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">Pending payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockClients.map(client => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.company}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.totalProjects}</TableCell>
                  <TableCell className={client.outstandingBalance > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                    ${client.outstandingBalance.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">View Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Invoice Management</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Client</Label>
                  <select className="w-full border rounded-md px-3 py-2">
                    <option>Select client</option>
                    {mockClients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Project</Label>
                  <select className="w-full border rounded-md px-3 py-2">
                    <option>Select project</option>
                    {mockProjects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Invoice Number</Label>
                  <Input placeholder="INV-2026-XXX" />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Invoice Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                <Button className="w-full">Create Invoice</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockInvoices.map(invoice => {
                const client = mockClients.find(c => c.id === invoice.clientId);
                const balance = invoice.amount - invoice.paidAmount;
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{client?.name}</TableCell>
                    <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">${invoice.paidAmount.toLocaleString()}</TableCell>
                    <TableCell className={balance > 0 ? 'text-orange-600 font-medium' : ''}>
                      ${balance.toLocaleString()}
                    </TableCell>
                    <TableCell>{format(new Date(invoice.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === 'paid' ? 'default' :
                          invoice.status === 'overdue' ? 'destructive' : 'secondary'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Record Payment</Button>
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
