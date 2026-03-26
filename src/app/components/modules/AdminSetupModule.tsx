import { useEffect, useState } from "react";

/* ===== UI ===== */
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/* ===== AUTH ===== */
import { useAuth } from "../../contexts/AuthContext";

/* ================= TYPES ================= */

type Org = {
  id: string;
  name: string;
};

type Dept = {
  id: string;
  name: string;
  orgId: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "hr" | "manager";
};

type RolePerm = {
  role: string;
  permissions: string;
};

/* ================= STORAGE KEYS ================= */

const ORG_KEY = "orgs";
const DEPT_KEY = "depts";
const USER_KEY = "system_users";
const ROLE_KEY = "role_perms";

/* ================= COMPONENT ================= */

export default function AdminSetupModule() {
  const { currentUser } = useAuth();

  /* ===== STATE ===== */
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RolePerm[]>([]);

  const [orgName, setOrgName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptOrg, setDeptOrg] = useState("");

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"hr" | "manager">("hr");

  const [roleName, setRoleName] = useState("");
  const [rolePerm, setRolePerm] = useState("");

  /* ===== LOAD STORAGE ===== */
  useEffect(() => {
    setOrgs(JSON.parse(localStorage.getItem(ORG_KEY) || "[]"));
    setDepts(JSON.parse(localStorage.getItem(DEPT_KEY) || "[]"));
    setUsers(JSON.parse(localStorage.getItem(USER_KEY) || "[]"));
    setRoles(JSON.parse(localStorage.getItem(ROLE_KEY) || "[]"));
  }, []);

  useEffect(() => localStorage.setItem(ORG_KEY, JSON.stringify(orgs)), [orgs]);
  useEffect(() => localStorage.setItem(DEPT_KEY, JSON.stringify(depts)), [depts]);
  useEffect(() => localStorage.setItem(USER_KEY, JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem(ROLE_KEY, JSON.stringify(roles)), [roles]);

  /* ===== ADMIN GUARD ===== */
  if (currentUser?.role !== "admin") {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Admin access only
      </div>
    );
  }

  /* ================= ACTIONS ================= */

  const addOrg = () => {
    if (!orgName) return;
    setOrgs(prev => [...prev, { id: Date.now().toString(), name: orgName }]);
    setOrgName("");
  };

  const addDept = () => {
    if (!deptName || !deptOrg) return;
    setDepts(prev => [
      ...prev,
      { id: Date.now().toString(), name: deptName, orgId: deptOrg }
    ]);
    setDeptName("");
    setDeptOrg("");
  };

  const addUser = () => {
    if (!userName || !userEmail || !userPassword) return;

    const newUser: User = {
      id: Date.now().toString(),
      name: userName,
      email: userEmail,
      password: userPassword,
      role: userRole
    };

    setUsers(prev => [...prev, newUser]);
    setUserName("");
    setUserEmail("");
    setUserPassword("");
    setUserRole("hr");
  };

  const addRolePerm = () => {
    if (!roleName || !rolePerm) return;
    setRoles(prev => [...prev, { role: roleName, permissions: rolePerm }]);
    setRoleName("");
    setRolePerm("");
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6 p-6 max-w-4xl">

      <h1 className="text-xl font-semibold">Admin — Organization & Roles Setup</h1>

      {/* ORGANIZATION */}
      <Card>
        <CardHeader><CardTitle>Create Organization</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            placeholder="Organization name"
          />
          <Button onClick={addOrg}>Add</Button>
        </CardContent>
        <CardContent>
          <ul>{orgs.map(o => <li key={o.id}>{o.name}</li>)}</ul>
        </CardContent>
      </Card>

      {/* DEPARTMENT */}
      <Card>
        <CardHeader><CardTitle>Create Department</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            value={deptName}
            onChange={e => setDeptName(e.target.value)}
            placeholder="Department name"
          />
          <Select onValueChange={setDeptOrg} value={deptOrg}>
            <SelectTrigger>
              <SelectValue placeholder="Select Organization" />
            </SelectTrigger>
            <SelectContent>
              {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addDept}>Add Department</Button>
        </CardContent>
        <CardContent>
          <ul>{depts.map(d => {
            const org = orgs.find(o => o.id === d.orgId);
            return <li key={d.id}>{d.name} ({org?.name || "Unknown Org"})</li>;
          })}</ul>
        </CardContent>
      </Card>

      {/* USERS */}
      <Card>
        <CardHeader><CardTitle>Add Users (HR / Manager)</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            placeholder="Name"
            value={userName}
            onChange={e => setUserName(e.target.value)}
          />
          <Input
            placeholder="Email"
            value={userEmail}
            onChange={e => setUserEmail(e.target.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={userPassword}
            onChange={e => setUserPassword(e.target.value)}
          />
          <Select
            value={userRole}
            onValueChange={(v: "hr" | "manager") => setUserRole(v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addUser}>Add User</Button>
        </CardContent>
        <CardContent>
          <table className="w-full border border-gray-300 text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ROLES */}
      <Card>
        <CardHeader><CardTitle>Define Role Permissions</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            placeholder="Role name"
            value={roleName}
            onChange={e => setRoleName(e.target.value)}
          />
          <Input
            placeholder="Permissions (comma separated)"
            value={rolePerm}
            onChange={e => setRolePerm(e.target.value)}
          />
          <Button onClick={addRolePerm}>Save Role</Button>
        </CardContent>
        <CardContent>
          <ul>
            {roles.map((r, i) => <li key={i}>{r.role} → {r.permissions}</li>)}
          </ul>
        </CardContent>
      </Card>

    </div>
  );
}
