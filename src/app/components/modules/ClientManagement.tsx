import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import {
  Building2,
  DollarSign,
  FileText,
  Plus,
  TrendingUp,
  Download,
} from "lucide-react";
import { clientApi } from "@/services/api";

type ClientType = {
  _id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  description?: string;
  status?: "active" | "inactive";
  outstandingBalance?: number;
};

type InvoiceType = {
  _id: string;
  clientId?: {
    _id?: string;
    name?: string;
    company?: string;
    email?: string;
  } | string;
  invoiceNumber?: string;
  amount?: number;
  paidAmount?: number;
  status?: string;
  date?: string;
  dueDate?: string;
};

export function ClientManagement() {
  const [clients, setClients] = useState<ClientType[]>([]);
  const [invoices, setInvoices] = useState<InvoiceType[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null);
  const [selectedClientInvoices, setSelectedClientInvoices] = useState<InvoiceType[]>([]);
  const [clientInvoicesLoading, setClientInvoicesLoading] = useState(false);
  const [clientInvoicesOpen, setClientInvoicesOpen] = useState(false);

  const [clientForm, setClientForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "",
    invoiceNumber: "",
    amount: "",
    date: "",
    dueDate: "",
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
      showMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.email) {
      return alert("Fill required fields");
    }

    try {
      await clientApi.create(clientForm);
      showMessage("✅ Client added successfully");
      setClientForm({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        description: "",
      });
      await loadData();
    } catch (err: any) {
      showMessage("❌ " + err.message);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.clientId || !invoiceForm.amount) {
      return alert("Fill required fields");
    }

    try {
      await clientApi.createInvoice({
        ...invoiceForm,
        amount: Number(invoiceForm.amount),
      });

      showMessage("💰 Invoice created successfully");
      setInvoiceForm({
        clientId: "",
        invoiceNumber: "",
        amount: "",
        date: "",
        dueDate: "",
      });

      await loadData();

      if (selectedClient && selectedClient._id === invoiceForm.clientId) {
        await handleViewClientInvoices(selectedClient);
      }
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

      if (selectedClient?._id === id) {
        setSelectedClient(null);
        setSelectedClientInvoices([]);
        setClientInvoicesOpen(false);
      }
    } catch (err: any) {
      showMessage("❌ " + err.message);
    }
  };

  const handleViewClientInvoices = async (client: ClientType) => {
    try {
      setSelectedClient(client);
      setClientInvoicesOpen(true);
      setClientInvoicesLoading(true);

      const res = await clientApi.getInvoicesByClient(client._id);

      const sortedInvoices = [...(res.invoices || [])].sort((a, b) =>
        String(a.invoiceNumber || "").localeCompare(
          String(b.invoiceNumber || ""),
          undefined,
          { numeric: true, sensitivity: "base" }
        )
      );

      setSelectedClientInvoices(sortedInvoices);
    } catch (err: any) {
      showMessage("❌ " + err.message);
      setSelectedClientInvoices([]);
    } finally {
      setClientInvoicesLoading(false);
    }
  };

  const downloadReport = () => {
    const escapeCsv = (value: any) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csv = "Client Name,Company,Email,Outstanding Balance\n";
    clients.forEach((c) => {
      csv += [
        escapeCsv(c.name),
        escapeCsv(c.company),
        escapeCsv(c.email),
        escapeCsv(c.outstandingBalance || 0),
      ].join(",") + "\n";
    });

    csv += "\nInvoice Number,Client,Amount,Status\n";
    invoices.forEach((inv) => {
      const clientName =
        typeof inv.clientId === "object" ? inv.clientId?.name || "-" : "-";

      csv += [
        escapeCsv(inv.invoiceNumber),
        escapeCsv(clientName),
        escapeCsv(inv.amount || 0),
        escapeCsv(inv.status || "-"),
      ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client_invoice_report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalOutstanding = clients.reduce(
    (s, c) => s + (c.outstandingBalance || 0),
    0
  );
  const activeClients = clients.filter((c) => c.status === "active").length;
  const totalInvoiced = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`px-4 py-2 rounded text-sm ${
            message.startsWith("✅") || message.startsWith("💰")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-semibold text-lg">Client & Payment Tracking</h1>
          <p className="text-sm text-gray-500">
            Manage clients, invoices and payments
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadReport} className="gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-center">Add New Client</DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <Input
                  placeholder="Name *"
                  value={clientForm.name}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Company"
                  value={clientForm.company}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, company: e.target.value })
                  }
                />
                <Input
                  placeholder="Email *"
                  value={clientForm.email}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, email: e.target.value })
                  }
                />
                <Input
                  placeholder="Phone"
                  value={clientForm.phone}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, phone: e.target.value })
                  }
                />
                <Textarea
                  placeholder="Address"
                  value={clientForm.address}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, address: e.target.value })
                  }
                />
                <Textarea
                  placeholder="Description (Optional)"
                  value={clientForm.description}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, description: e.target.value })
                  }
                />
                <div className="flex justify-center">
                  <Button className="min-w-[180px]" onClick={handleAddClient}>
                    Add Client
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Active Clients",
            value: activeClients,
            icon: <Building2 className="h-4 w-4" />,
          },
          {
            title: "Total Invoiced",
            value: `₹${totalInvoiced.toLocaleString()}`,
            icon: <FileText className="h-4 w-4" />,
          },
          {
            title: "Payments Received",
            value: `₹${totalPaid.toLocaleString()}`,
            icon: <DollarSign className="h-4 w-4" />,
          },
          {
            title: "Outstanding",
            value: `₹${totalOutstanding.toLocaleString()}`,
            icon: <TrendingUp className="h-4 w-4" />,
          },
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

      <Card>
        <CardHeader>
          <CardTitle>Clients ({clients.length})</CardTitle>
        </CardHeader>

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
                  <TableCell
                    className="font-medium text-blue-600 cursor-pointer hover:underline"
                    onClick={() => handleViewClientInvoices(c)}
                  >
                    {c.name}
                  </TableCell>
                  <TableCell>{c.company || "-"}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>₹{(c.outstandingBalance || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewClientInvoices(c)}
                      >
                        View Invoices
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClient(c._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col items-center justify-center gap-3 text-center">
          <CardTitle className="text-center">Create Invoice</CardTitle>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="mx-auto">
                Create Invoice
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-center">Create Invoice</DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={invoiceForm.clientId}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, clientId: e.target.value })
                  }
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="Invoice Number"
                  value={invoiceForm.invoiceNumber}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      invoiceNumber: e.target.value,
                    })
                  }
                />

                <Input
                  type="number"
                  placeholder="Amount"
                  value={invoiceForm.amount}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, amount: e.target.value })
                  }
                />

                <Input
                  type="date"
                  value={invoiceForm.date}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, date: e.target.value })
                  }
                />

                <Input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })
                  }
                />

                <div className="flex justify-center">
                  <Button className="min-w-[180px]" onClick={handleCreateInvoice}>
                    Create Invoice
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <Dialog open={clientInvoicesOpen} onOpenChange={setClientInvoicesOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-center">
              {selectedClient?.name || "Client"} Invoices ({selectedClientInvoices.length})
            </DialogTitle>
          </DialogHeader>

          {clientInvoicesLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedClientInvoices.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center">
              No invoices found for this client.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {selectedClientInvoices.map((inv) => {
                  const clientName =
                    typeof inv.clientId === "object"
                      ? inv.clientId?.name || "-"
                      : selectedClient?.name || "-";

                  return (
                    <TableRow key={inv._id}>
                      <TableCell>{inv.invoiceNumber || "-"}</TableCell>
                      <TableCell>{clientName}</TableCell>
                      <TableCell>₹{(inv.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                          {inv.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{inv.date ? inv.date.slice(0, 10) : "-"}</TableCell>
                      <TableCell>{inv.dueDate ? inv.dueDate.slice(0, 10) : "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
