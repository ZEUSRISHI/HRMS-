import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../ui/table";
import { userManagementApi } from "@/services/api";
import {
  Users, UserPlus, Search, RefreshCw, Pencil, Trash2,
  ShieldCheck, ShieldOff, KeyRound, Eye, EyeOff,
  UserCheck,
} from "lucide-react";

/* ── types ── */
interface UserRecord {
  _id:              string;
  name:             string;
  email:            string;
  role:             string;
  phone:            string;
  dob:              string;
  department:       string;
  designation:      string;
  address:          string;
  joiningDate:      string;
  gender:           string;
  emergencyContact: string;
  avatar:           string;
  isActive:         boolean;
  createdAt:        string;
}

const initForm = {
  name:             "",
  email:            "",
  password:         "",
  role:             "employee",
  phone:            "",
  dob:              "",
  department:       "",
  designation:      "",
  address:          "",
  joiningDate:      "",
  gender:           "",
  emergencyContact: "",
};

const ROLES = ["all", "admin", "manager", "hr", "employee"];

/* ── helpers ── */
const roleColor = (r: string) => {
  if (r === "admin")   return "bg-red-500 text-white";
  if (r === "hr")      return "bg-blue-500 text-white";
  if (r === "manager") return "bg-purple-500 text-white";
  return "bg-gray-500 text-white";
};

/* ── reusable field component ── */
const Field = ({
  label, value, onChange, type = "text",
  required = false, placeholder = "", options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
  options?: { value: string; label: string }[];
}) => (
  <div>
    <label className="text-xs font-semibold text-gray-700 mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {options ? (
      <select
        className="border p-2 rounded w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input
        type={type}
        className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    )}
  </div>
);

/* ================================================================
   COMPONENT
   ================================================================ */
export function UserManagementModule() {

  /* ── state ── */
  const [users,        setUsers]        = useState<UserRecord[]>([]);
  const [stats,        setStats]        = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);

  /* filters */
  const [searchQ,      setSearchQ]      = useState("");
  const [filterRole,   setFilterRole]   = useState("all");
  const [filterActive, setFilterActive] = useState("all");

  /* dialogs */
  const [createOpen,   setCreateOpen]   = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [viewOpen,     setViewOpen]     = useState(false);
  const [resetOpen,    setResetOpen]    = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);

  /* selected */
  const [selected,     setSelected]     = useState<UserRecord | null>(null);

  /* forms */
  const [form,         setForm]         = useState(initForm);
  const [editForm,     setEditForm]     = useState<any>({});
  const [newPassword,  setNewPassword]  = useState("");
  const [showPwd,      setShowPwd]      = useState(false);
  const [showEditPwd,  setShowEditPwd]  = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);

  /* ── helpers ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const setF  = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const setEF = (k: string, v: any) => setEditForm((f: any) => ({ ...f, [k]: v }));

  /* ── load ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterRole   !== "all") params.role     = filterRole;
      if (filterActive !== "all") params.isActive = filterActive;
      if (searchQ.trim())         params.search   = searchQ.trim();
      params.limit = 100;

      const [usersRes, statsRes] = await Promise.all([
        userManagementApi.getAll(params),
        userManagementApi.getStats(),
      ]);
      setUsers(usersRes.users   || []);
      setStats(statsRes.stats   || null);
    } catch (err: any) {
      showToast(err.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterActive, searchQ]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── create ── */
  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      showToast("Name, email and password are required", "error"); return;
    }
    if (form.password.length < 6) {
      showToast("Password must be at least 6 characters", "error"); return;
    }
    try {
      setSubmitting(true);
      await userManagementApi.create(form);
      showToast("✅ User created successfully");
      setForm(initForm);
      setCreateOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create user", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── open edit ── */
  const openEdit = (user: UserRecord) => {
    setSelected(user);
    setEditForm({
      name:             user.name,
      email:            user.email,
      role:             user.role,
      phone:            user.phone,
      dob:              user.dob,
      department:       user.department,
      designation:      user.designation,
      address:          user.address,
      joiningDate:      user.joiningDate,
      gender:           user.gender,
      emergencyContact: user.emergencyContact,
      password:         "",
    });
    setShowEditPwd(false);
    setEditOpen(true);
  };

  /* ── update ── */
  const handleUpdate = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      const payload = { ...editForm };
      if (!payload.password || payload.password.trim().length === 0) {
        delete payload.password;
      } else if (payload.password.trim().length < 6) {
        showToast("Password must be at least 6 characters", "error"); return;
      }
      await userManagementApi.update(selected._id, payload);
      showToast("✅ User updated successfully");
      setEditOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update user", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── toggle status ── */
  const handleToggleStatus = async (user: UserRecord) => {
    try {
      await userManagementApi.toggleStatus(user._id);
      showToast(`✅ User ${user.isActive ? "deactivated" : "activated"}`);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to toggle status", "error");
    }
  };

  /* ── reset password ── */
  const handleResetPassword = async () => {
    if (!selected) return;
    if (!newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error"); return;
    }
    try {
      setSubmitting(true);
      await userManagementApi.resetPassword(selected._id, newPassword);
      showToast("✅ Password reset successfully");
      setNewPassword("");
      setResetOpen(false);
    } catch (err: any) {
      showToast(err.message || "Failed to reset password", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      await userManagementApi.delete(selected._id);
      showToast(`✅ User "${selected.name}" deleted`);
      setDeleteOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete user", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 py-4">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 px-5 py-3 rounded-xl shadow-lg z-50 text-white text-sm font-medium transition-all ${
          toast.type === "error" ? "bg-red-600" : "bg-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users size={22} className="text-gray-700" />
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg border hover:bg-gray-50 text-gray-500"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          {/* ── CREATE BUTTON ── */}
          <Button
            onClick={() => { setForm(initForm); setCreateOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <UserPlus size={16} /> Add New User
          </Button>
        </div>
      </div>

      {/* ── STATS ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
          {[
            { label: "Total",    value: stats.total,            cls: "bg-gray-900 text-white"   },
            { label: "Active",   value: stats.active,           cls: "bg-green-600 text-white"  },
            { label: "Inactive", value: stats.inactive,         cls: "bg-red-500 text-white"    },
            { label: "Admin",    value: stats.byRole?.admin,    cls: "bg-red-400 text-white"    },
            { label: "Manager",  value: stats.byRole?.manager,  cls: "bg-purple-500 text-white" },
            { label: "HR",       value: stats.byRole?.hr,       cls: "bg-blue-500 text-white"   },
            { label: "Employee", value: stats.byRole?.employee, cls: "bg-gray-500 text-white"   },
          ].map(s => (
            <div key={s.label} className={`rounded-xl px-4 py-3 flex flex-col items-center ${s.cls}`}>
              <span className="text-2xl font-bold">{s.value ?? 0}</span>
              <span className="text-xs mt-0.5 opacity-80">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── FILTERS ── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="border pl-8 pr-3 py-2 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Search by name, email, department…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                    filterRole === r
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                  }`}
                >
                  {r === "all" ? "All Roles" : r}
                </button>
              ))}
            </div>
            <select
              className="border p-2 rounded-lg text-sm bg-white min-w-[130px]"
              value={filterActive}
              onChange={e => setFilterActive(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── TABLE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users size={17} />
            All Users
            <span className="ml-auto text-xs text-gray-400 font-normal bg-gray-100 px-3 py-1 rounded-full">
              {users.length} record{users.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">No users found.</p>
          ) : (
            <Table className="min-w-[900px] text-sm">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Joined</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user._id} className="hover:bg-gray-50 align-middle">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                          user.role === "admin"   ? "bg-red-500"    :
                          user.role === "hr"      ? "bg-blue-500"   :
                          user.role === "manager" ? "bg-purple-500" :
                          "bg-gray-500"
                        }`}>
                          {user.avatar
                            ? <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                            : user.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-[11px] text-gray-400">{user.designation || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${roleColor(user.role)} text-[11px]`}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">{user.department || "—"}</TableCell>
                    <TableCell className="text-gray-600">{user.phone || "—"}</TableCell>
                    <TableCell className="text-gray-500 text-xs">
                      {user.joiningDate || user.createdAt?.slice(0, 10) || "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {user.isActive ? "● Active" : "○ Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => { setSelected(user); setViewOpen(true); }}
                          className="p-1.5 rounded-lg border hover:bg-blue-50 text-blue-500 hover:text-blue-700"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-lg border hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700"
                          title="Edit user"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1.5 rounded-lg border ${
                            user.isActive
                              ? "hover:bg-orange-50 text-orange-500 hover:text-orange-700"
                              : "hover:bg-green-50 text-green-500 hover:text-green-700"
                          }`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                        </button>
                        <button
                          onClick={() => { setSelected(user); setNewPassword(""); setShowResetPwd(false); setResetOpen(true); }}
                          className="p-1.5 rounded-lg border hover:bg-yellow-50 text-yellow-600 hover:text-yellow-800"
                          title="Reset password"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => { setSelected(user); setDeleteOpen(true); }}
                          className="p-1.5 rounded-lg border hover:bg-red-50 text-red-500 hover:text-red-700"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          CREATE DIALOG
          ================================================================ */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setForm(initForm); }}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} /> Create New User
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new user to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <Field label="Full Name"  value={form.name}  onChange={v => setF("name", v)}  required placeholder="e.g. Ravi Kumar" />
            <Field label="Email"      value={form.email} onChange={v => setF("email", v)} required type="email" placeholder="ravi@company.com" />

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className="border p-2 pr-9 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setF("password", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Field label="Role" value={form.role} onChange={v => setF("role", v)} options={[
              { value: "employee", label: "Employee" },
              { value: "manager",  label: "Manager"  },
              { value: "hr",       label: "HR"        },
              { value: "admin",    label: "Admin"     },
            ]} />
            <Field label="Phone"        value={form.phone}        onChange={v => setF("phone", v)}        placeholder="+91 9XXXXXXXXX" />
            <Field label="Date of Birth" value={form.dob}         onChange={v => setF("dob", v)}          type="date" />
            <Field label="Department"   value={form.department}   onChange={v => setF("department", v)}   placeholder="e.g. Engineering" />
            <Field label="Designation"  value={form.designation}  onChange={v => setF("designation", v)}  placeholder="e.g. Software Engineer" />
            <Field label="Joining Date" value={form.joiningDate}  onChange={v => setF("joiningDate", v)}  type="date" />
            <Field label="Gender"       value={form.gender}       onChange={v => setF("gender", v)}       options={[
              { value: "",       label: "— Select —" },
              { value: "male",   label: "Male"   },
              { value: "female", label: "Female" },
              { value: "other",  label: "Other"  },
            ]} />
            <div className="sm:col-span-2">
              <Field label="Address"           value={form.address}          onChange={v => setF("address", v)}          placeholder="Full address" />
            </div>
            <div className="sm:col-span-2">
              <Field label="Emergency Contact" value={form.emergencyContact} onChange={v => setF("emergencyContact", v)} placeholder="+91 9XXXXXXXXX" />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={submitting}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitting
              ? <span className="flex items-center gap-2 justify-center"><RefreshCw size={14} className="animate-spin" /> Creating...</span>
              : "Create User"
            }
          </Button>
        </DialogContent>
      </Dialog>

      {/* ================================================================
          EDIT DIALOG
          ================================================================ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={18} /> Edit User — {selected?.name}
            </DialogTitle>
            <DialogDescription>
              Update the user's profile information below.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <Field label="Full Name" value={editForm.name  || ""} onChange={v => setEF("name", v)}  required />
            <Field label="Email"     value={editForm.email || ""} onChange={v => setEF("email", v)} required type="email" />

            {/* New password */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
              </label>
              <div className="relative">
                <input
                  type={showEditPwd ? "text" : "password"}
                  className="border p-2 pr-9 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="Enter new password or leave blank"
                  value={editForm.password || ""}
                  onChange={e => setEF("password", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPwd(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showEditPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Field label="Role" value={editForm.role || "employee"} onChange={v => setEF("role", v)} options={[
              { value: "employee", label: "Employee" },
              { value: "manager",  label: "Manager"  },
              { value: "hr",       label: "HR"        },
              { value: "admin",    label: "Admin"     },
            ]} />
            <Field label="Phone"         value={editForm.phone        || ""} onChange={v => setEF("phone", v)}        placeholder="+91 9XXXXXXXXX" />
            <Field label="Date of Birth" value={editForm.dob          || ""} onChange={v => setEF("dob", v)}          type="date" />
            <Field label="Department"    value={editForm.department   || ""} onChange={v => setEF("department", v)}   placeholder="e.g. Engineering" />
            <Field label="Designation"   value={editForm.designation  || ""} onChange={v => setEF("designation", v)}  placeholder="e.g. Software Engineer" />
            <Field label="Joining Date"  value={editForm.joiningDate  || ""} onChange={v => setEF("joiningDate", v)}  type="date" />
            <Field label="Gender"        value={editForm.gender       || ""} onChange={v => setEF("gender", v)}       options={[
              { value: "",       label: "— Select —" },
              { value: "male",   label: "Male"   },
              { value: "female", label: "Female" },
              { value: "other",  label: "Other"  },
            ]} />
            <div className="sm:col-span-2">
              <Field label="Address"           value={editForm.address          || ""} onChange={v => setEF("address", v)}          placeholder="Full address" />
            </div>
            <div className="sm:col-span-2">
              <Field label="Emergency Contact" value={editForm.emergencyContact || ""} onChange={v => setEF("emergencyContact", v)} placeholder="+91 9XXXXXXXXX" />
            </div>
          </div>

          <Button
            onClick={handleUpdate}
            disabled={submitting}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitting
              ? <span className="flex items-center gap-2 justify-center"><RefreshCw size={14} className="animate-spin" /> Saving...</span>
              : "Save Changes"
            }
          </Button>
        </DialogContent>
      </Dialog>

      {/* ================================================================
          VIEW DIALOG
          ================================================================ */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck size={18} /> User Details
            </DialogTitle>
            <DialogDescription>
              Full profile information for this user.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ${
                  selected.role === "admin"   ? "bg-red-500"    :
                  selected.role === "hr"      ? "bg-blue-500"   :
                  selected.role === "manager" ? "bg-purple-500" :
                  "bg-gray-500"
                }`}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.name}</p>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge className={`${roleColor(selected.role)} text-[10px]`}>{selected.role}</Badge>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      selected.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {selected.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Phone",             selected.phone            || "—"],
                  ["Date of Birth",     selected.dob              || "—"],
                  ["Department",        selected.department       || "—"],
                  ["Designation",       selected.designation      || "—"],
                  ["Joining Date",      selected.joiningDate      || "—"],
                  ["Gender",            selected.gender           || "—"],
                  ["Emergency Contact", selected.emergencyContact || "—"],
                  ["Account Created",   selected.createdAt?.slice(0, 10) || "—"],
                ].map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800 capitalize">{val}</p>
                  </div>
                ))}
                {selected.address && (
                  <div className="col-span-2 bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Address</p>
                    <p className="font-medium text-gray-800">{selected.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================
          RESET PASSWORD DIALOG
          ================================================================ */}
      <Dialog open={resetOpen} onOpenChange={open => { setResetOpen(open); if (!open) setNewPassword(""); }}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} /> Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{selected?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-700 mb-1 block">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showResetPwd ? "text" : "password"}
                className="border p-2 pr-9 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowResetPwd(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showResetPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <Button
            onClick={handleResetPassword}
            disabled={submitting}
            className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {submitting ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ================================================================
          DELETE CONFIRM DIALOG
          ================================================================ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 size={18} /> Delete User
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
            <p className="text-sm text-red-700">
              Are you sure you want to permanently delete{" "}
              <strong>{selected?.name}</strong>?
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting
                ? "Deleting..."
                : <span className="flex items-center gap-2 justify-center"><Trash2 size={14} /> Delete</span>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
