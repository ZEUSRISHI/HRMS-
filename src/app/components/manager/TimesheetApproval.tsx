import { useState } from "react";

type Timesheet = {
  id: string;
  employeeName: string;
  date: string;
  hours: number;
  status: "pending" | "approved" | "rejected";
};

export default function TimesheetApproval() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([
    {
      id: "1",
      employeeName: "John",
      date: "2026-02-17",
      hours: 8,
      status: "pending",
    },
  ]);

  const updateStatus = (id: string, status: Timesheet["status"]) => {
    setTimesheets(prev =>
      prev.map(t => (t.id === id ? { ...t, status } : t))
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="font-semibold mb-4">Timesheet Approval</h2>

      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Hours</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {timesheets.map(t => (
            <tr key={t.id} className="border-b">
              <td>{t.employeeName}</td>
              <td>{t.date}</td>
              <td>{t.hours}</td>
              <td className="capitalize">{t.status}</td>
              <td className="space-x-2">
                <button
                  onClick={() => updateStatus(t.id, "approved")}
                  className="px-2 py-1 bg-green-500 text-white rounded"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(t.id, "rejected")}
                  className="px-2 py-1 bg-red-500 text-white rounded"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
