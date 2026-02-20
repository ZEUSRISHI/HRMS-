"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/app/contexts/AuthContext";

/* ================= TYPES ================= */

type Employee = {
  id: string;
  empCode: string;

  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  department: string;
  designation: string;

  joiningDate: string;
  employmentType: string;
  salary: string;

  aadhaar: string;
  pan: string;
  bankAccount: string;

  resumeName: string;
  idProofName: string;

  status: "active" | "inactive";
};

const KEY = "hr_employee_records";

/* ================= COMPONENT ================= */

export default function EmployeeRecordsModule() {
  const { currentUser } = useAuth();

  const canEdit =
    currentUser?.role === "hr" || currentUser?.role === "admin";

  const [list, setList] = useState<Employee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm: Employee = {
    id: "",
    empCode: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    joiningDate: "",
    employmentType: "",
    salary: "",
    aadhaar: "",
    pan: "",
    bankAccount: "",
    resumeName: "",
    idProofName: "",
    status: "active"
  };

  const [form, setForm] = useState<Employee>(emptyForm);

  /* ================= LOAD / SAVE ================= */

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        setList(JSON.parse(saved));
      } catch {
        setList([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(list));
  }, [list]);

  /* ================= HELPERS ================= */

  const updateField = (k: keyof Employee, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const generateEmpCode = () => {
    return "EMP" + (list.length + 1).toString().padStart(4, "0");
  };

  const validate = () => {
    if (!form.firstName.trim()) {
      alert("First name required");
      return false;
    }
    if (!form.email.includes("@")) {
      alert("Valid email required");
      return false;
    }
    if (!form.department.trim()) {
      alert("Department required");
      return false;
    }
    if (!form.joiningDate) {
      alert("Joining date required");
      return false;
    }
    return true;
  };

  /* ================= FILE HANDLERS ================= */

  const handleResume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateField("resumeName", file.name);
  };

  const handleIdProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateField("idProofName", file.name);
  };

  /* ================= SAVE ================= */

  const saveEmployee = () => {
    if (!canEdit) {
      alert("No permission");
      return;
    }

    if (!validate()) return;

    if (editingId) {
      setList(prev =>
        prev.map(e => (e.id === editingId ? form : e))
      );
      setEditingId(null);
    } else {
      setList(prev => [
        ...prev,
        {
          ...form,
          id: Date.now().toString(),
          empCode: generateEmpCode()
        }
      ]);
    }

    setForm(emptyForm);
  };

  const editEmployee = (emp: Employee) => {
    if (!canEdit) return;
    setForm(emp);
    setEditingId(emp.id);
  };

  const deleteEmployee = (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete employee?")) return;
    setList(prev => prev.filter(e => e.id !== id));
  };

  /* ================= OFFER LETTER ================= */

  const downloadOfferLetter = (emp: Employee) => {
    const text = `
OFFER LETTER

Employee: ${emp.firstName} ${emp.lastName}
Employee ID: ${emp.empCode}
Designation: ${emp.designation}
Department: ${emp.department}
Joining Date: ${emp.joiningDate}
Salary: ${emp.salary}

Welcome to the company.

HR Department
`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = emp.empCode + "_offer.txt";
    a.click();
  };

  /* ================= EXPORT ================= */

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(list);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employees.xlsx");
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">

      <h2 className="text-2xl font-bold">
        Employee Records — HR Module
      </h2>

      {/* ===== FORM ===== */}

      {canEdit && (
        <div className="border rounded-xl p-4 grid grid-cols-3 gap-4 bg-white shadow">

          <input className="border p-2 rounded"
            placeholder="First Name *"
            value={form.firstName}
            onChange={e => updateField("firstName", e.target.value)}
          />

          <input className="border p-2 rounded"
            placeholder="Last Name"
            value={form.lastName}
            onChange={e => updateField("lastName", e.target.value)}
          />

          <input className="border p-2 rounded"
            placeholder="Email"
            value={form.email}
            onChange={e => updateField("email", e.target.value)}
          />

          <input className="border p-2 rounded"
            placeholder="Phone"
            value={form.phone}
            onChange={e => updateField("phone", e.target.value)}
          />

          <input className="border p-2 rounded"
            placeholder="Department"
            value={form.department}
            onChange={e => updateField("department", e.target.value)}
          />

          <input className="border p-2 rounded"
            placeholder="Designation"
            value={form.designation}
            onChange={e => updateField("designation", e.target.value)}
          />

          <input className="border p-2 rounded"
            type="date"
            value={form.joiningDate}
            onChange={e => updateField("joiningDate", e.target.value)}
          />

          <select className="border p-2 rounded"
            value={form.employmentType}
            onChange={e => updateField("employmentType", e.target.value)}
          >
            <option value="">Employment Type</option>
            <option>Full Time</option>
            <option>Part Time</option>
            <option>Contract</option>
            <option>Intern</option>
          </select>

          <input className="border p-2 rounded"
            placeholder="Salary"
            value={form.salary}
            onChange={e => updateField("salary", e.target.value)}
          />

          <input className="border p-2 rounded"
            placeholder="Aadhaar"
            value={form.aadhaar}
            onChange={e => updateField("aadhaar", e.target.value)}
          />

          <input className="border p-2 rounded"
            placeholder="PAN"
            value={form.pan}
            onChange={e => updateField("pan", e.target.value)}
          />

          <input className="border p-2 rounded"
            placeholder="Bank Account"
            value={form.bankAccount}
            onChange={e => updateField("bankAccount", e.target.value)}
          />

          {/* ===== Resume Upload ===== */}
          <div>
            <label className="text-sm font-medium">
              Upload Resume (PDF/DOC)
            </label>
            <input type="file" onChange={handleResume}/>
            <div className="text-xs">{form.resumeName}</div>
          </div>

          {/* ===== ID Proof Upload ===== */}
          <div>
            <label className="text-sm font-medium">
              Upload ID Proof
            </label>
            <input type="file" onChange={handleIdProof}/>
            <div className="text-xs">{form.idProofName}</div>
          </div>

          <button
            onClick={saveEmployee}
            className="bg-blue-600 text-white rounded px-4 py-2 col-span-3"
          >
            {editingId ? "Update Employee" : "Add Employee"}
          </button>
        </div>
      )}

      {/* ===== ACTION BAR ===== */}

      <button
        onClick={exportExcel}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Export to Excel
      </button>

      {/* ===== TABLE ===== */}

      <table className="w-full border text-sm bg-white">
        <thead className="bg-gray-100">
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Dept</th>
            <th>Designation</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {list.map(emp => (
            <tr key={emp.id} className="border-t">
              <td>{emp.empCode}</td>
              <td>{emp.firstName} {emp.lastName}</td>
              <td>{emp.department}</td>
              <td>{emp.designation}</td>
              <td>{emp.status}</td>
              <td className="space-x-2">
                <button onClick={() => downloadOfferLetter(emp)}>
                  Offer
                </button>

                {canEdit && (
                  <>
                    <button onClick={() => editEmployee(emp)}>Edit</button>
                    <button onClick={() => deleteEmployee(emp.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}

          {list.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-400">
                No employees added
              </td>
            </tr>
          )}
        </tbody>
      </table>

    </div>
  );
}