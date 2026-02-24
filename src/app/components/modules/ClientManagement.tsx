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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Building2, DollarSign, FileText, Plus, TrendingUp } from "lucide-react";
import { format } from "date-fns";

/* ================= TYPES ================= */

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
  totalProjects: number;
  outstandingBalance: number;
}

interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  date: string;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
}

/* ================= LOCAL STORAGE KEYS ================= */

const CLIENT_KEY = "startup_clients";
const INVOICE_KEY = "startup_invoices";

/* ================= COMPONENT ================= */

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [message, setMessage] = useState("");

  const [clientForm, setClientForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "",
    invoiceNumber: "",
    amount: "",
    date: "",
    dueDate: "",
  });

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    const c = localStorage.getItem(CLIENT_KEY);
    const i = localStorage.getItem(INVOICE_KEY);
    if (c) setClients(JSON.parse(c));
    if (i) setInvoices(JSON.parse(i));
  }, []);

  const saveClients = (data: Client[]) => {
    localStorage.setItem(CLIENT_KEY, JSON.stringify(data));
    setClients(data);
  };

  const saveInvoices = (data: Invoice[]) => {
    localStorage.setItem(INVOICE_KEY, JSON.stringify(data));
    setInvoices(data);
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  /* ================= ADD CLIENT ================= */

  const handleAddClient = () => {
    if (!clientForm.name || !clientForm.email) return alert("Fill required fields");

    const newClient: Client = {
      id: crypto.randomUUID(),
      ...clientForm,
      status: "active",
      totalProjects: 0,
      outstandingBalance: 0,
    };

    const updated = [...clients, newClient];
    saveClients(updated);
    showMessage("✅ Client added successfully");

    setClientForm({ name: "", company: "", email: "", phone: "", address: "" });
  };

  /* ================= CREATE INVOICE ================= */

  const handleCreateInvoice = () => {
    if (!invoiceForm.clientId || !invoiceForm.amount) return alert("Fill required fields");

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      clientId: invoiceForm.clientId,
      invoiceNumber: invoiceForm.invoiceNumber,
      amount: Number(invoiceForm.amount),
      paidAmount: 0,
      date: invoiceForm.date,
      dueDate: invoiceForm.dueDate,
      status: "pending",
    };

    const updatedInvoices = [...invoices, newInvoice];
    saveInvoices(updatedInvoices);

    /* Update outstanding balance */
    const updatedClients = clients.map((c) =>
      c.id === invoiceForm.clientId
        ? { ...c, outstandingBalance: c.outstandingBalance + Number(invoiceForm.amount) }
        : c
    );
    saveClients(updatedClients);

    showMessage("💰 Invoice created successfully");

    setInvoiceForm({
      clientId: "",
      invoiceNumber: "",
      amount: "",
      date: "",
      dueDate: "",
    });
  };

  /* ================= STATS ================= */

  const totalOutstanding = clients.reduce((s, c) => s + c.outstandingBalance, 0);
  const activeClients = clients.filter((c) => c.status === "active").length;
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
          {message}
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between">
        <div>
          <h1 className="font-semibold mb-2">Client & Payment Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Manage clients, invoices, and payment status
          </p>
        </div>

        {/* ADD CLIENT */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input placeholder="Name"
                value={clientForm.name}
                onChange={(e)=>setClientForm({...clientForm,name:e.target.value})}/>
              <Input placeholder="Company"
                value={clientForm.company}
                onChange={(e)=>setClientForm({...clientForm,company:e.target.value})}/>
              <Input placeholder="Email"
                value={clientForm.email}
                onChange={(e)=>setClientForm({...clientForm,email:e.target.value})}/>
              <Input placeholder="Phone"
                value={clientForm.phone}
                onChange={(e)=>setClientForm({...clientForm,phone:e.target.value})}/>
              <Textarea placeholder="Address"
                value={clientForm.address}
                onChange={(e)=>setClientForm({...clientForm,address:e.target.value})}/>

              <Button onClick={handleAddClient}>Add Client</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Active Clients" value={activeClients} icon={<Building2 />} />
        <StatCard title="Total Invoiced" value={`$${totalInvoiced}`} icon={<FileText />} />
        <StatCard title="Payments Received" value={`$${totalPaid}`} icon={<DollarSign />} />
        <StatCard title="Outstanding" value={`$${totalOutstanding}`} icon={<TrendingUp />} />
      </div>

      {/* CLIENT TABLE */}
      <Card>
        <CardHeader><CardTitle>Clients</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(c=>(
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.company}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>${c.outstandingBalance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* INVOICE */}
      <Card>
        <CardHeader className="flex justify-between">
          <CardTitle>Invoices</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">Create Invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <select className="border rounded px-3 py-2"
                  value={invoiceForm.clientId}
                  onChange={(e)=>setInvoiceForm({...invoiceForm,clientId:e.target.value})}>
                  <option value="">Select Client</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <Input placeholder="Invoice Number"
                  value={invoiceForm.invoiceNumber}
                  onChange={(e)=>setInvoiceForm({...invoiceForm,invoiceNumber:e.target.value})}/>

                <Input type="number" placeholder="Amount"
                  value={invoiceForm.amount}
                  onChange={(e)=>setInvoiceForm({...invoiceForm,amount:e.target.value})}/>

                <Input type="date"
                  value={invoiceForm.date}
                  onChange={(e)=>setInvoiceForm({...invoiceForm,date:e.target.value})}/>

                <Input type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e)=>setInvoiceForm({...invoiceForm,dueDate:e.target.value})}/>

                <Button onClick={handleCreateInvoice}>Create Invoice</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv=>{
                const client = clients.find(c=>c.id===inv.clientId);
                return(
                  <TableRow key={inv.id}>
                    <TableCell>{inv.invoiceNumber}</TableCell>
                    <TableCell>{client?.name}</TableCell>
                    <TableCell>${inv.amount}</TableCell>
                    <TableCell><Badge>{inv.status}</Badge></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= REUSABLE STAT CARD ================= */

function StatCard({title,value,icon}:{title:string,value:any,icon:any}) {
  return (
    <Card>
      <CardHeader className="flex justify-between pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}