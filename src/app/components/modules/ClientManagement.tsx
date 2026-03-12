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
import { Textarea } from "../ui/textarea";
import { Building2, DollarSign, FileText, Plus, TrendingUp, Download } from "lucide-react";
import { clientApi } from "@/services/api";

export function ClientManagement() {
  const [clients, setClients]   = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(true);

  const [clientForm, setClientForm] = useState({
    name: "", company: "", email: "", phone: "", address: "", description: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "", invoiceNumber: "", amount: "", date: "", dueDate: "",
  });

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, iRes] = await Promise.all([
        clientApi.getAll(),
        clientApi.getInvoices(),
      ]);
      setClients(cRes.clients || []);
      setInvoices(iRes.invoices || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.email) return alert("Fill required fields");
    try {
      await clientApi.create(clientForm);
      showMessage("✅ Client added successfully");
      setClientForm({ name: "", company: "", email: "", phone: "", address: "", description: "" });
      await loadData();
    } catch (err: any) {
      showMessage("❌ " + err.message);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.clientId || !invoiceForm.amount) return alert("Fill required fields");
    try {
      await clientApi.createInvoice({
        ...invoiceForm,
        amount: Number(invoiceForm.amount),
      });
      showMessage("💰 Invoice created successfully");
      setInvoiceForm({ clientId: "", invoiceNumber: "", amount: "", date: "", dueDate: "" });
      await loadData();
    } catch (err: any) {
      showMessage("❌ " + err.message);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm("Delete client?")) return;
    try {
      await clientApi.delete(id);
      showMessage("✅ Client deleted");
      await loadData();
    } catch (err: any) {
      showMessage("❌ " + err.message);
    }
  };

  const downloadReport = () => {
    let csv = "Client Name,Company,Email,Outstanding Balance\n";
    clients.forEach((c) => {
      csv += `${c.name},${c.company},${c.email},${c.outstandingBalance}\n`;
    });
    csv += "\nInvoice Number,Client,Amount,Status\n";
    invoices.forEach((inv) => {
      csv += `${inv.invoiceNumber},${inv.clientId?.name || "-"},${inv.amount},${inv.status}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client_invoice_report.csv";
    a.click();
  };

  const totalOutstanding = clients.reduce((s, c) => s + (c.outstandingBalance || 0), 0);
  const activeClients    = clients.filter((c) => c.status === "active").length;
  const totalInvoiced    = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid        = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {message && (
        <div className={`px-4 py-2 rounded text-sm ${message.startsWith("✅") || message.startsWith("💰")
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"}`}>
          {message}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-semibold text-lg">Client & Payment Tracking</h1>
          <p className="text-sm text-gray-500">Manage clients, invoices and payments</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadReport} className="gap-2">
            <Download className="h-4 w-4" /> Download Report
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Name *" value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
                <Input placeholder="Company" value={clientForm.company}
                  onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} />
                <Input placeholder="Email *" value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
                <Input placeholder="Phone" value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
                <Textarea placeholder="Address" value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} />
                <Textarea placeholder="Description (Optional)" value={clientForm.description}
                  onChange={(e) => setClientForm({ ...clientForm, description: e.target.value })} />
                <Button className="w-full" onClick={handleAddClient}>Add Client</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Active Clients", value: activeClients, icon: <Building2 className="h-4 w-4" /> },
          { title: "Total Invoiced", value: `₹${totalInvoiced.toLocaleString()}`, icon: <FileText className="h-4 w-4" /> },
          { title: "Payments Received", value: `₹${totalPaid.toLocaleString()}`, icon: <DollarSign className="h-4 w-4" /> },
          { title: "Outstanding", value: `₹${totalOutstanding.toLocaleString()}`, icon: <TrendingUp className="h-4 w-4" /> },
        ].map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm">{s.title}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent>
              <div className="font-semibold text-lg">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CLIENT TABLE */}
      <Card>
        <CardHeader><CardTitle>Clients ({clients.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c._id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.company}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>₹{c.outstandingBalance?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive"
                      onClick={() => handleDeleteClient(c._id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* INVOICES */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle>Invoices ({invoices.length})</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">Create Invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <select className="border rounded px-3 py-2 w-full"
                  value={invoiceForm.clientId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}>
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <Input placeholder="Invoice Number" value={invoiceForm.invoiceNumber}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} />
                <Input type="number" placeholder="Amount" value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
                <Input type="date" value={invoiceForm.date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })} />
                <Input type="date" value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                <Button className="w-full" onClick={handleCreateInvoice}>Create Invoice</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv._id}>
                  <TableCell>{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.clientId?.name || "-"}</TableCell>
                  <TableCell>₹{inv.amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}