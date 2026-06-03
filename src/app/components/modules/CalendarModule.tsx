import { useEffect, useState, useCallback, useRef } from "react";
import {
  Building2, DollarSign, FileText, Plus, TrendingUp,
  Download, Mail, Trash2, Eye, X, Edit2, RefreshCw,
  ChevronRight, AlertCircle, CheckCircle2, Search,
  ExternalLink, Upload, Paperclip,
} from "lucide-react";
import { clientApi } from "@/services/api";

/* ══════════ TYPES ══════════ */
type InvoiceItem = { description: string; quantity: number; unitPrice: number; total: number };

type ClientDocument = {
  _id: string; name: string; originalName?: string; size?: number; uploadedAt?: string;
};

type Client = {
  _id: string; name: string; company?: string; email: string;
  phone?: string; address?: string; description?: string; gstNumber?: string;
  status?: "active" | "inactive"; outstandingBalance?: number;
  documents?: ClientDocument[];
};

type Invoice = {
  _id: string;
  clientId?: { _id?: string; name?: string; company?: string; email?: string; gstNumber?: string } | string;
  invoiceNumber?: string; amount?: number; subtotal?: number;
  tax?: number; taxAmount?: number; discount?: number; paidAmount?: number;
  status?: string; date?: string; dueDate?: string;
  items?: InvoiceItem[]; notes?: string; paymentMode?: string; emailSent?: boolean;
};

const EMPTY_ITEM: InvoiceItem = { description: "", quantity: 1, unitPrice: 0, total: 0 };

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue:   "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

function fmtBytes(b: number) {
  if (!b) return "—";
  if (b < 1024)        return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

/* ══════════ MAIN COMPONENT ══════════ */
export function ClientManagement() {
  const [clients,  setClients]  = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ msg: string; type: "success" | "error" } | null>(null);

  /* modals */
  const [showAddClient,      setShowAddClient]      = useState(false);
  const [showEditClient,     setShowEditClient]      = useState<Client | null>(null);
  const [showCreateInvoice,  setShowCreateInvoice]  = useState(false);
  const [showClientInvoices, setShowClientInvoices] = useState<Client | null>(null);
  const [showPDFViewer,      setShowPDFViewer]      = useState<{ url: string; title: string } | null>(null);
  const [showEditInvoice,    setShowEditInvoice]    = useState<Invoice | null>(null);
  const [showDocuments,      setShowDocuments]      = useState<Client | null>(null);

  const [clientInvoices,  setClientInvoices]  = useState<Invoice[]>([]);
  const [ciLoading,       setCiLoading]       = useState(false);
  const [searchClients,   setSearchClients]   = useState("");

  const [documents,     setDocuments]     = useState<ClientDocument[]>([]);
  const [docsLoading,   setDocsLoading]   = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [docName,       setDocName]       = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* forms */
  const [clientForm, setClientForm] = useState({
    name: "", company: "", email: "", phone: "", address: "",
    description: "", gstNumber: "", status: "active",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "", invoiceNumber: "", date: "", dueDate: "",
    tax: "0", discount: "0", notes: "", paymentMode: "", sendEmail: false,
    items: [{ ...EMPTY_ITEM }] as InvoiceItem[],
  });
  const [editInvForm, setEditInvForm] = useState<Partial<Invoice>>({});

  /* ── Toast ── */
  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Load ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cRes, iRes] = await Promise.all([clientApi.getAll(), clientApi.getInvoices()]);
      setClients(cRes.clients   || []);
      setInvoices(iRes.invoices || []);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Invoice item helpers ── */
  const updateItem = (idx: number, field: keyof InvoiceItem, value: string) => {
    setInvoiceForm(prev => {
      const items = [...prev.items];
      const item  = { ...items[idx], [field]: field === "description" ? value : Number(value) };
      item.total  = item.quantity * item.unitPrice;
      items[idx]  = item;
      return { ...prev, items };
    });
  };
  const addItem    = () => setInvoiceForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i: number) => setInvoiceForm(p => ({ ...p, items: p.items.filter((_, x) => x !== i) }));

  const subtotal  = invoiceForm.items.reduce((s, i) => s + i.total, 0);
  const taxAmt    = parseFloat(((Number(invoiceForm.tax) / 100) * subtotal).toFixed(2));
  const netAmount = parseFloat((subtotal + taxAmt - Number(invoiceForm.discount)).toFixed(2));

  /* ── Client CRUD ── */
  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.email) return showToast("Name and Email are required", "error");
    try {
      await clientApi.create(clientForm);
      showToast("Client added successfully");
      setShowAddClient(false);
      setClientForm({ name: "", company: "", email: "", phone: "", address: "", description: "", gstNumber: "", status: "active" });
      await loadData();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleEditClient = async () => {
    if (!showEditClient) return;
    try {
      await clientApi.update(showEditClient._id, clientForm);
      showToast("Client updated successfully");
      setShowEditClient(null);
      await loadData();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm("Delete this client? This cannot be undone.")) return;
    try {
      await clientApi.delete(id);
      showToast("Client deleted");
      setShowClientInvoices(null);
      await loadData();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  /* ── Invoice CRUD ── */
  const handleCreateInvoice = async () => {
    if (!invoiceForm.clientId) return showToast("Please select a client", "error");
    if (invoiceForm.items.some(i => !i.description || i.unitPrice <= 0))
      return showToast("Fill all item details", "error");
    try {
      const res = await clientApi.createInvoice({
        clientId: invoiceForm.clientId, invoiceNumber: invoiceForm.invoiceNumber || undefined,
        items: invoiceForm.items, tax: Number(invoiceForm.tax), discount: Number(invoiceForm.discount),
        date: invoiceForm.date || undefined, dueDate: invoiceForm.dueDate || undefined,
        paymentMode: invoiceForm.paymentMode, notes: invoiceForm.notes, sendEmail: invoiceForm.sendEmail,
      });
      showToast(res.message || "Invoice created successfully");
      setShowCreateInvoice(false);
      setInvoiceForm({ clientId: "", invoiceNumber: "", date: "", dueDate: "", tax: "0", discount: "0", notes: "", paymentMode: "", sendEmail: false, items: [{ ...EMPTY_ITEM }] });
      await loadData();
      if (showClientInvoices) await loadClientInvoices(showClientInvoices);
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleUpdateInvoice = async () => {
    if (!showEditInvoice) return;
    try {
      await clientApi.updateInvoice(showEditInvoice._id, editInvForm);
      showToast("Invoice updated");
      setShowEditInvoice(null);
      await loadData();
      if (showClientInvoices) await loadClientInvoices(showClientInvoices);
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await clientApi.deleteInvoice(id);
      showToast("Invoice deleted");
      await loadData();
      if (showClientInvoices) await loadClientInvoices(showClientInvoices);
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleViewPDF = async (id: string, title: string) => {
    try {
      const url = await clientApi.viewInvoicePDF(id);
      setShowPDFViewer({ url, title });
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDownloadPDF = async (id: string, num: string) => {
    try {
      await clientApi.downloadInvoicePDF(id, num);
      showToast("PDF downloaded");
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleResendEmail = async (id: string) => {
    try {
      await clientApi.resendInvoiceEmail(id);
      showToast("Invoice email resent successfully");
    } catch (err: any) { showToast(err.message, "error"); }
  };

  /* ── Client invoices ── */
  const loadClientInvoices = async (client: Client) => {
    setCiLoading(true);
    try {
      const res = await clientApi.getInvoicesByClient(client._id);
      setClientInvoices(res.invoices || []);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setCiLoading(false); }
  };

  const openClientInvoices = async (client: Client) => {
    setShowClientInvoices(client);
    await loadClientInvoices(client);
  };

  /* ── Documents ── */
  const openDocuments = async (client: Client) => {
    setShowDocuments(client);
    setDocsLoading(true);
    try {
      const res = await clientApi.getDocuments(client._id);
      setDocuments(res.documents || []);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setDocsLoading(false); }
  };

  const handleUploadDocument = async (file: File) => {
    if (!showDocuments) return;
    if (file.type !== "application/pdf") return showToast("Only PDF files allowed", "error");
    if (file.size > 15 * 1024 * 1024) return showToast("File size must be under 15MB", "error");
    setUploading(true);
    try {
      await clientApi.uploadDocument(showDocuments._id, file, docName || file.name);
      showToast("Document uploaded successfully");
      setDocName("");
      const res = await clientApi.getDocuments(showDocuments._id);
      setDocuments(res.documents || []);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setUploading(false); }
  };

  const handleViewDocument = async (docId: string, name: string) => {
    if (!showDocuments) return;
    try {
      const url = await clientApi.viewDocument(showDocuments._id, docId);
      setShowPDFViewer({ url, title: name });
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!showDocuments || !window.confirm("Delete this document?")) return;
    try {
      await clientApi.deleteDocument(showDocuments._id, docId);
      showToast("Document deleted");
      setDocuments(d => d.filter(x => x._id !== docId));
    } catch (err: any) { showToast(err.message, "error"); }
  };

  /* ── CSV ── */
  const downloadReport = () => {
    let csv = "Client Name,Company,Email,GST/TIN,Outstanding\n";
    clients.forEach(c => { csv += `"${c.name}","${c.company || ""}","${c.email}","${c.gstNumber || ""}",${c.outstandingBalance || 0}\n`; });
    csv += "\nInvoice No,Client,Subtotal,Tax,Discount,Amount,Status\n";
    invoices.forEach(i => {
      const cn = typeof i.clientId === "object" ? i.clientId?.name || "" : "";
      csv += `"${i.invoiceNumber}","${cn}",${i.subtotal || 0},${i.taxAmount || 0},${i.discount || 0},${i.amount || 0},"${i.status || ""}"\n`;
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "client_invoice_report.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  /* ── Stats ── */
  const totalOutstanding = clients.reduce((s, c) => s + (c.outstandingBalance || 0), 0);
  const activeClients    = clients.filter(c => c.status === "active").length;
  const totalInvoiced    = invoices.reduce((s, i) => s + (i.amount    || 0), 0);
  const totalPaid        = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchClients.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(searchClients.toLowerCase()) ||
    c.email.toLowerCase().includes(searchClients.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading data...</p>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all animate-in slide-in-from-top-2
          ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-800" : "bg-white border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
              <span>HRMS</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Client & Payment Tracking</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client & Payment Tracking</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage clients, invoices and payments</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => loadData()}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={downloadReport}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => { setClientForm({ name: "", company: "", email: "", phone: "", address: "", description: "", gstNumber: "", status: "active" }); setShowAddClient(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 shadow-sm transition">
              <Plus className="w-4 h-4" /> Add Client
            </button>
            <button onClick={() => setShowCreateInvoice(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-sm transition">
              <FileText className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Clients",    value: activeClients,                              icon: Building2,  color: "text-blue-600",   bg: "bg-blue-50"   },
            { label: "Total Invoiced",    value: `₹${totalInvoiced.toLocaleString("en-IN")}`, icon: FileText,   color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Payments Received", value: `₹${totalPaid.toLocaleString("en-IN")}`,     icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Outstanding",       value: `₹${totalOutstanding.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Clients table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Clients</h2>
              <p className="text-xs text-slate-400 mt-0.5">{clients.length} total clients</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search clients..." value={searchClients} onChange={e => setSearchClients(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-300 w-56" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Client", "Company", "Email", "GST/TIN", "Outstanding", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">No clients found</td></tr>
                ) : filtered.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50/60 transition group">
                    <td className="px-6 py-4">
                      <button onClick={() => openClientInvoices(c)}
                        className="font-semibold text-slate-900 hover:text-orange-600 transition text-sm flex items-center gap-1 group">
                        {c.name}<ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.company || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">{c.gstNumber || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${(c.outstandingBalance || 0) > 0 ? "text-orange-600" : "text-slate-400"}`}>
                        ₹{(c.outstandingBalance || 0).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
                        ${c.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {c.status || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openClientInvoices(c)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
                          <Eye className="w-3 h-3" /> Invoices
                        </button>
                        {/* Documents button */}
                        <button onClick={() => openDocuments(c)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition">
                          <Paperclip className="w-3 h-3" /> Docs
                        </button>
                        <button onClick={() => {
                          setClientForm({ name: c.name, company: c.company || "", email: c.email, phone: c.phone || "", address: c.address || "", description: c.description || "", gstNumber: c.gstNumber || "", status: c.status || "active" });
                          setShowEditClient(c);
                        }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteClient(c._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent invoices */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
              <p className="text-xs text-slate-400 mt-0.5">{invoices.length} total invoices</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Invoice No", "Client", "Amount", "Status", "Date", "Due Date", "Actions"].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">No invoices yet</td></tr>
                ) : invoices.slice(0, 10).map(inv => {
                  const cn = typeof inv.clientId === "object" ? inv.clientId?.name || "—" : "—";
                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4"><span className="text-sm font-semibold text-slate-900">{inv.invoiceNumber || "—"}</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cn}</td>
                      <td className="px-6 py-4"><span className="text-sm font-bold text-slate-900">₹{(inv.amount || 0).toLocaleString("en-IN")}</span></td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[inv.status || "pending"] || STATUS_COLORS.pending}`}>
                          {inv.status || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{inv.date ? new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleViewPDF(inv._id, inv.invoiceNumber || "INV")} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" title="View PDF"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDownloadPDF(inv._id, inv.invoiceNumber || "INV")} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Download PDF"><Download className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleResendEmail(inv._id)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition" title="Send Email"><Mail className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setShowEditInvoice(inv); setEditInvForm({ status: inv.status, paymentMode: inv.paymentMode, notes: inv.notes }); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteInvoice(inv._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════ */}

      {/* Add/Edit Client Modal */}
      {(showAddClient || showEditClient) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{showEditClient ? "Edit Client" : "Add New Client"}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Fill in the client details below</p>
              </div>
              <button onClick={() => { setShowAddClient(false); setShowEditClient(null); }} className="p-2 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Full Name *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="John Doe" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Company</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Acme Corp" value={clientForm.company} onChange={e => setClientForm({ ...clientForm, company: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Email *</label>
                  <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="john@acme.com" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Phone</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="+91 98765 43210" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
                </div>
              </div>
              {/* GST/TIN field */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">GST / TIN Number</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
                  placeholder="e.g. 29ABCDE1234F1Z5" value={clientForm.gstNumber}
                  onChange={e => setClientForm({ ...clientForm, gstNumber: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Address</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  placeholder="123 Business Park, City" value={clientForm.address} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Optional" value={clientForm.description} onChange={e => setClientForm({ ...clientForm, description: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                    value={clientForm.status} onChange={e => setClientForm({ ...clientForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddClient(false); setShowEditClient(null); }}
                  className="flex-1 py-2.5 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                <button onClick={showEditClient ? handleEditClient : handleAddClient}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition shadow-sm">
                  {showEditClient ? "Save Changes" : "Add Client"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocuments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Documents — {showDocuments.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Upload and manage client PDF documents (max 15MB each)</p>
              </div>
              <button onClick={() => { setShowDocuments(null); setDocuments([]); }} className="p-2 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Upload area */}
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-blue-400", "bg-blue-50/30"); }}
                onDragLeave={e => { e.currentTarget.classList.remove("border-blue-400", "bg-blue-50/30"); }}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-blue-400", "bg-blue-50/30");
                  const file = e.dataTransfer.files[0];
                  if (file) handleUploadDocument(file);
                }}
              >
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Click or drag & drop a PDF here</p>
                <p className="text-xs text-slate-400 mt-1">PDF only · Max 15MB</p>
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadDocument(f); e.target.value = ""; }} />
              </div>

              {/* Optional name */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Document Label (optional)</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Contract 2025, NDA, Purchase Order"
                  value={docName} onChange={e => setDocName(e.target.value)} />
              </div>

              {uploading && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-sm text-blue-700 font-medium">Uploading document...</span>
                </div>
              )}

              {/* Document list */}
              {docsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc._id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                      <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-xs text-slate-400">
                          {fmtBytes(doc.size || 0)} · {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleViewDocument(doc._id, doc.name)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteDocument(doc._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create Invoice</h2>
                <p className="text-xs text-slate-500 mt-0.5">Fill in invoice details and line items</p>
              </div>
              <button onClick={() => setShowCreateInvoice(false)} className="p-2 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Client *</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                    value={invoiceForm.clientId} onChange={e => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}>
                    <option value="">Select a client</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.name} {c.company ? `— ${c.company}` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Invoice Number <span className="text-slate-400 font-normal">(auto if blank)</span></label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="INV-001" value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Invoice Date</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    value={invoiceForm.date} onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Due Date</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                </div>
              </div>
              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600">Line Items *</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50 transition">
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Description</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-500 w-16">Qty</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-500 w-28">Unit Price</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-500 w-24">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceForm.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="p-1.5">
                            <input className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                              placeholder="e.g. Web Development Services"
                              value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                          </td>
                          <td className="p-1.5">
                            <input type="number" min="1" className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-300"
                              value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} />
                          </td>
                          <td className="p-1.5">
                            <input type="number" min="0" className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-300"
                              value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)} />
                          </td>
                          <td className="p-1.5 text-right pr-3 font-bold text-slate-700">₹{item.total.toLocaleString("en-IN")}</td>
                          <td className="p-1.5">
                            {invoiceForm.items.length > 1 && (
                              <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 p-0.5 transition"><X className="w-3.5 h-3.5" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Tax (%)</label>
                  <input type="number" min="0" max="100" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    value={invoiceForm.tax} onChange={e => setInvoiceForm({ ...invoiceForm, tax: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Discount (₹)</label>
                  <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    value={invoiceForm.discount} onChange={e => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Mode</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                    value={invoiceForm.paymentMode} onChange={e => setInvoiceForm({ ...invoiceForm, paymentMode: e.target.value })}>
                    <option value="">Select</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-medium text-slate-700">₹{subtotal.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Tax ({invoiceForm.tax}%)</span><span className="font-medium text-slate-700">₹{taxAmt.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Discount</span><span className="font-medium text-red-500">- ₹{Number(invoiceForm.discount).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-1">
                    <span className="text-slate-800">Net Payable</span>
                    <span className="text-emerald-600">₹{netAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  placeholder="Payment terms, bank details, etc."
                  value={invoiceForm.notes} onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={invoiceForm.sendEmail} onChange={e => setInvoiceForm({ ...invoiceForm, sendEmail: e.target.checked })} />
                  <div className={`w-10 h-5 rounded-full transition ${invoiceForm.sendEmail ? "bg-orange-500" : "bg-slate-200"}`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${invoiceForm.sendEmail ? "translate-x-5" : ""}`}></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Send invoice email after creation</p>
                  <p className="text-xs text-slate-400">PDF will be attached and sent to the client's email</p>
                </div>
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateInvoice(false)} className="flex-1 py-2.5 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                <button onClick={handleCreateInvoice} className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition shadow-sm">Create Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Invoices Modal */}
      {showClientInvoices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{showClientInvoices.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {showClientInvoices.company && `${showClientInvoices.company} · `}
                  {showClientInvoices.gstNumber && `GST: ${showClientInvoices.gstNumber} · `}
                  {showClientInvoices.email} · Outstanding: <span className="font-semibold text-orange-600">₹{(showClientInvoices.outstandingBalance || 0).toLocaleString("en-IN")}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCreateInvoice(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition">
                  <Plus className="w-3 h-3" /> New Invoice
                </button>
                <button onClick={() => { setShowClientInvoices(null); setClientInvoices([]); }} className="p-2 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {ciLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : clientInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <FileText className="w-10 h-10 text-slate-200" />
                  <p className="text-sm text-slate-400">No invoices found for this client</p>
                  <button onClick={() => setShowCreateInvoice(true)} className="text-xs font-semibold text-orange-600 hover:underline">Create first invoice</button>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      {["Invoice No", "Amount", "Tax", "Discount", "Net", "Status", "Date", "Due", "Email", "Actions"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {clientInvoices.map(inv => (
                      <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3 text-sm font-bold text-slate-900">{inv.invoiceNumber || "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">₹{(inv.subtotal || 0).toLocaleString("en-IN")}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">₹{(inv.taxAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">₹{(inv.discount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-5 py-3"><span className="text-sm font-bold text-emerald-600">₹{(inv.amount || 0).toLocaleString("en-IN")}</span></td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[inv.status || "pending"] || STATUS_COLORS.pending}`}>
                            {inv.status || "pending"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{inv.date ? new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                        <td className="px-5 py-3">
                          {inv.emailSent
                            ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3 h-3" /> Sent</span>
                            : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => handleViewPDF(inv._id, inv.invoiceNumber || "INV")} className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDownloadPDF(inv._id, inv.invoiceNumber || "INV")} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"><Download className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleResendEmail(inv._id)} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition"><Mail className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setShowEditInvoice(inv); setEditInvForm({ status: inv.status, paymentMode: inv.paymentMode, notes: inv.notes }); }} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteInvoice(inv._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Edit Invoice</h2>
              <button onClick={() => setShowEditInvoice(null)} className="p-2 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  value={editInvForm.status || ""} onChange={e => setEditInvForm({ ...editInvForm, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Mode</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  value={editInvForm.paymentMode || ""} onChange={e => setEditInvForm({ ...editInvForm, paymentMode: e.target.value })}>
                  <option value="">Select</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  value={editInvForm.notes || ""} onChange={e => setEditInvForm({ ...editInvForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEditInvoice(null)} className="flex-1 py-2.5 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                <button onClick={handleUpdateInvoice} className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPDFViewer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-slate-900">{showPDFViewer.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={showPDFViewer.url} download={`${showPDFViewer.title}.pdf`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button onClick={() => { URL.revokeObjectURL(showPDFViewer.url); setShowPDFViewer(null); }} className="p-2 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={showPDFViewer.url} className="w-full h-full border-0" title="Document Viewer" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
