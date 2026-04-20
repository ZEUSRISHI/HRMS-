import { useEffect, useState } from "react";
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { helpdeskApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import {
  TicketCheck, Plus, Filter, RefreshCw, Trash2,
  MessageSquare, ChevronDown, ChevronUp, AlertCircle,
  Clock, CheckCircle2, XCircle,
} from "lucide-react";

/* ─────────── constants ─────────── */

const CATEGORIES = [
  "payroll", "attendance", "leave", "task",
  "project", "timesheet", "onboarding", "access", "other",
];

const PRIORITIES = ["low", "medium", "high", "critical"];

const STATUSES = ["open", "in_progress", "resolved", "closed"];

const priorityColor: Record<string, string> = {
  low:      "bg-gray-100 text-gray-700",
  medium:   "bg-blue-100 text-blue-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const statusColor: Record<string, string> = {
  open:        "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100  text-blue-700",
  resolved:    "bg-green-100 text-green-700",
  closed:      "bg-gray-100  text-gray-600",
};

const statusIcon: Record<string, React.ReactElement> = {
  open:        <AlertCircle  className="h-3 w-3" />,
  in_progress: <Clock        className="h-3 w-3" />,
  resolved:    <CheckCircle2 className="h-3 w-3" />,
  closed:      <XCircle      className="h-3 w-3" />,
};

/* ─────────── helpers ─────────── */

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";

/* =====================================================================
   MAIN MODULE
   ===================================================================== */

export function HelpdeskModule() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const currentUserId = (currentUser as any)?._id ?? (currentUser as any)?.id ?? "";

  /* state */
  const [tickets,    setTickets]    = useState<any[]>([]);
  const [stats,      setStats]      = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [message,    setMessage]    = useState("");
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});

  /* filters (admin only) */
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  /* create form — non-admin only */
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "payroll", priority: "medium",
  });

  /* edit form — raiser editing own open ticket */
  const [editOpen, setEditOpen] = useState(false);
  const [editId,   setEditId]   = useState("");
  const [editForm, setEditForm] = useState({
    title: "", description: "", category: "", priority: "",
  });

  /* admin manage dialog */
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminId,   setAdminId]   = useState("");
  const [adminForm, setAdminForm] = useState({
    status: "", priority: "", resolutionNote: "",
  });

  /* ── load ── */
  const load = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const params: any = {};
        if (filterStatus)   params.status   = filterStatus;
        if (filterCategory) params.category = filterCategory;
        if (filterPriority) params.priority = filterPriority;

        const [tRes, sRes] = await Promise.all([
          helpdeskApi.getAll(params),
          helpdeskApi.getStats(),
        ]);
        setTickets(tRes.tickets || []);
        setStats(sRes.stats || null);
      } else {
        const tRes = await helpdeskApi.getMy();
        setTickets(tRes.tickets || []);
      }
    } catch (err: any) {
      showMsg("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterStatus, filterCategory, filterPriority]);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3500);
  };

  /* ── create (non-admin only) ── */
  const handleCreate = async () => {
    if (!form.title || !form.description) {
      return alert("Title and description are required.");
    }
    try {
      await helpdeskApi.create(form);
      showMsg("✅ Ticket raised successfully");
      setForm({ title: "", description: "", category: "payroll", priority: "medium" });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      showMsg("❌ " + err.message);
    }
  };

  /* ── edit own ticket (non-admin raiser only) ── */
  const openEdit = (ticket: any) => {
    setEditId(ticket._id);
    setEditForm({
      title:       ticket.title,
      description: ticket.description,
      category:    ticket.category,
      priority:    ticket.priority,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    try {
      await helpdeskApi.editMine(editId, editForm);
      showMsg("✅ Ticket updated");
      setEditOpen(false);
      await load();
    } catch (err: any) {
      showMsg("❌ " + err.message);
    }
  };

  /* ── admin: manage ticket ── */
  const openAdmin = (ticket: any) => {
    setAdminId(ticket._id);
    setAdminForm({
      status:         ticket.status,
      priority:       ticket.priority,
      resolutionNote: ticket.resolutionNote || "",
    });
    setAdminOpen(true);
  };

  const handleAdminUpdate = async () => {
    try {
      await helpdeskApi.update(adminId, adminForm);
      showMsg("✅ Ticket updated successfully");
      setAdminOpen(false);
      await load();
    } catch (err: any) {
      showMsg("❌ " + err.message);
    }
  };

  /* ── delete ── */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this ticket?")) return;
    try {
      await helpdeskApi.delete(id);
      showMsg("✅ Ticket deleted");
      await load();
    } catch (err: any) {
      showMsg("❌ " + err.message);
    }
  };

  /* ── comments ── */
  const handleAddComment = async (ticketId: string) => {
    const text = commentMap[ticketId]?.trim();
    if (!text) return;
    try {
      await helpdeskApi.addComment(ticketId, text);
      setCommentMap((prev) => ({ ...prev, [ticketId]: "" }));
      showMsg("💬 Comment added");
      await load();
    } catch (err: any) {
      showMsg("❌ " + err.message);
    }
  };

  const handleDeleteComment = async (ticketId: string, commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await helpdeskApi.deleteComment(ticketId, commentId);
      showMsg("✅ Comment deleted");
      await load();
    } catch (err: any) {
      showMsg("❌ " + err.message);
    }
  };

  /* ── expand row ── */
  const toggleExpand = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id));

  /* ====================================================
     RENDER
     ==================================================== */

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── flash message ── */}
      {message && (
        <div className={`px-4 py-2 rounded text-sm font-medium ${
          message.startsWith("✅") || message.startsWith("💬")
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}>
          {message}
        </div>
      )}

      {/* ── header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-semibold text-lg flex items-center gap-2">
            <TicketCheck className="h-5 w-5 text-orange-500" />
            Helpdesk
          </h1>
          <p className="text-sm text-gray-500">
            {isAdmin
              ? "Review and resolve all support tickets raised by your team"
              : "Raise and track your support tickets"}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={load} className="gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>

          {/* ── "Raise Ticket" button: HIDDEN for admin ── */}
          {!isAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4" /> Raise Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Raise a Support Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input
                    placeholder="Title *"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Describe your issue in detail *"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Category</label>
                      <select
                        className="border rounded px-3 py-2 w-full text-sm capitalize"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                      <select
                        className="border rounded px-3 py-2 w-full text-sm capitalize"
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={handleCreate}
                  >
                    Submit Ticket
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── admin stats cards ── */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Tickets", value: stats.total,      color: "text-gray-700"   },
            { label: "Open",          value: stats.open,       color: "text-yellow-600" },
            { label: "In Progress",   value: stats.inProgress, color: "text-blue-600"   },
            { label: "Critical",      value: stats.critical,   color: "text-red-600"    },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── admin filters ── */}
      {isAdmin && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="h-4 w-4 text-gray-400" />

              <select
                className="border rounded px-3 py-1.5 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>

              <select
                className="border rounded px-3 py-1.5 text-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="border rounded px-3 py-1.5 text-sm"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {(filterStatus || filterCategory || filterPriority) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterStatus("");
                    setFilterCategory("");
                    setFilterPriority("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── tickets table ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin
              ? `All Tickets (${tickets.length})`
              : `My Tickets (${tickets.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <TicketCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {isAdmin ? "No tickets to resolve" : "You haven't raised any tickets yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Raised By</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <React.Fragment key={ticket._id}>

                      {/* ── main row ── */}
                      <TableRow
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleExpand(ticket._id)}
                      >
                        <TableCell className="font-mono text-xs text-orange-600 font-semibold">
                          {ticket.ticketNumber}
                        </TableCell>
                        <TableCell className="font-medium max-w-[180px] truncate">
                          {ticket.title}
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {ticket.category}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColor[ticket.priority]}`}>
                            {ticket.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit capitalize ${statusColor[ticket.status]}`}>
                            {statusIcon[ticket.status]}
                            {ticket.status.replace("_", " ")}
                          </span>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-sm">
                            {ticket.raisedBy?.name}
                            <span className="ml-1 text-xs text-gray-400 capitalize">
                              ({ticket.raisedBy?.role})
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-gray-500">
                          {fmt(ticket.createdAt)}
                        </TableCell>

                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">

                            {/* ── ADMIN: Manage button only ── */}
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                                onClick={() => openAdmin(ticket)}
                              >
                                Manage
                              </Button>
                            )}

                            {/* ── ADMIN: Delete ticket ── */}
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs h-7 px-2"
                                onClick={() => handleDelete(ticket._id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}

                            {/* ── NON-ADMIN: Edit own open ticket ── */}
                            {!isAdmin &&
                              ticket.raisedBy?._id === currentUserId &&
                              ticket.status === "open" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                  onClick={() => openEdit(ticket)}
                                >
                                  Edit
                                </Button>
                              )}

                            {/* ── NON-ADMIN: Delete own open ticket ── */}
                            {!isAdmin &&
                              ticket.raisedBy?._id === currentUserId &&
                              ticket.status === "open" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs h-7 px-2"
                                  onClick={() => handleDelete(ticket._id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}

                            {/* expand/collapse */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2"
                              onClick={() => toggleExpand(ticket._id)}
                            >
                              {expanded === ticket._id
                                ? <ChevronUp className="h-3 w-3" />
                                : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* ── expanded detail row ── */}
                      {expanded === ticket._id && (
                        <TableRow>
                          <TableCell
                            colSpan={isAdmin ? 8 : 7}
                            className="bg-gray-50 p-4"
                          >
                            <div className="space-y-4">

                              {/* description */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                  Description
                                </p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {ticket.description}
                                </p>
                              </div>

                              {/* resolution note — shown to everyone when present */}
                              {ticket.resolutionNote && (
                                <div className="bg-green-50 border border-green-200 rounded p-3">
                                  <p className="text-xs font-semibold text-green-700 mb-1">
                                    Resolution Note
                                  </p>
                                  <p className="text-sm text-green-800">
                                    {ticket.resolutionNote}
                                  </p>
                                  {ticket.resolvedAt && (
                                    <p className="text-xs text-green-600 mt-1">
                                      Resolved on {fmt(ticket.resolvedAt)}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* comments thread */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  Comments ({ticket.comments?.length || 0})
                                </p>

                                <div className="space-y-2 mb-3">
                                  {(ticket.comments || []).map((c: any) => (
                                    <div
                                      key={c._id}
                                      className="flex items-start gap-2 bg-white border rounded p-2"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className="text-xs font-semibold">
                                            {c.author?.name}
                                          </span>
                                          <span className="text-xs text-gray-400 capitalize">
                                            ({c.author?.role})
                                          </span>
                                          <span className="text-xs text-gray-400 ml-auto">
                                            {fmt(c.createdAt)}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-700">{c.text}</p>
                                      </div>

                                      {/* delete comment — admin or comment author */}
                                      {(isAdmin ||
                                        (c.author as any)?._id === currentUserId) && (
                                        <button
                                          onClick={() =>
                                            handleDeleteComment(ticket._id, c._id)
                                          }
                                          className="text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* add comment — available to everyone on non-closed tickets */}
                                {ticket.status !== "closed" && (
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Add a comment..."
                                      className="text-sm h-8"
                                      value={commentMap[ticket._id] || ""}
                                      onChange={(e) =>
                                        setCommentMap((prev) => ({
                                          ...prev,
                                          [ticket._id]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleAddComment(ticket._id);
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-8 bg-orange-500 hover:bg-orange-600"
                                      onClick={() => handleAddComment(ticket._id)}
                                    >
                                      Send
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── edit own ticket dialog (non-admin only) ── */}
      {!isAdmin && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                rows={4}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <select
                    className="border rounded px-3 py-2 w-full text-sm capitalize"
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                  <select
                    className="border rounded px-3 py-2 w-full text-sm capitalize"
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({ ...editForm, priority: e.target.value })
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleEdit}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── admin manage ticket dialog ── */}
      {isAdmin && (
        <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select
                  className="border rounded px-3 py-2 w-full text-sm capitalize"
                  value={adminForm.status}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, status: e.target.value })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                <select
                  className="border rounded px-3 py-2 w-full text-sm capitalize"
                  value={adminForm.priority}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, priority: e.target.value })
                  }
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Resolution Note
                  <span className="text-gray-400 ml-1">(visible to the ticket raiser)</span>
                </label>
                <Textarea
                  placeholder="Describe how the issue was resolved..."
                  rows={4}
                  value={adminForm.resolutionNote}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, resolutionNote: e.target.value })
                  }
                />
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleAdminUpdate}
              >
                Update Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
