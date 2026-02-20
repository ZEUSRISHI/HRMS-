import { useEffect, useState } from "react";

/* ================= TYPES ================= */

type LeavePolicy = {
  workingHoursPerDay: string;
  workingDaysPerWeek: string;

  casualLeave: string;
  sickLeave: string;
  earnedLeave: string;

  carryForward: string;
  maxCarryForward: string;

  lateMarkAfterMinutes: string;
  halfDayAfterHours: string;

  approvalFlow: string;
  remoteWorkPolicy: string;

  notes: string;
};

const KEY = "hr_attendance_leave_policy";

/* ================= COMPONENT ================= */

export default function AttendanceLeaveModule() {
  const empty: LeavePolicy = {
    workingHoursPerDay: "",
    workingDaysPerWeek: "",

    casualLeave: "",
    sickLeave: "",
    earnedLeave: "",

    carryForward: "",
    maxCarryForward: "",

    lateMarkAfterMinutes: "",
    halfDayAfterHours: "",

    approvalFlow: "",
    remoteWorkPolicy: "",

    notes: ""
  };

  const [policy, setPolicy] = useState<LeavePolicy>(empty);
  const [saved, setSaved] = useState(false);

  /* ================= LOAD ================= */

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) setPolicy(JSON.parse(stored));
  }, []);

  /* ================= HELPERS ================= */

  const setField = (k: keyof LeavePolicy, v: string) =>
    setPolicy(p => ({ ...p, [k]: v }));

  const savePolicy = () => {
    localStorage.setItem(KEY, JSON.stringify(policy));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetPolicy = () => {
    if (!confirm("Reset policy?")) return;
    setPolicy(empty);
    localStorage.removeItem(KEY);
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* HEADER */}

      <div>
        <h2 className="text-2xl font-bold">
          Attendance & Leave Policy (Startup HR)
        </h2>
        <p className="text-sm text-gray-500">
          Define attendance rules and leave structure for your organization
        </p>
      </div>

      {/* WORK SCHEDULE */}

      <div className="border rounded-xl p-4 bg-white shadow space-y-4">
        <h3 className="font-semibold text-lg">Work Schedule</h3>

        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="Working Hours Per Day"
            value={policy.workingHoursPerDay}
            onChange={e => setField("workingHoursPerDay", e.target.value)}
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="Working Days Per Week"
            value={policy.workingDaysPerWeek}
            onChange={e => setField("workingDaysPerWeek", e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {/* LEAVE BALANCE */}

      <div className="border rounded-xl p-4 bg-white shadow space-y-4">
        <h3 className="font-semibold text-lg">Annual Leave Allocation</h3>

        <div className="grid grid-cols-3 gap-4">
          <input
            placeholder="Casual Leave / Year"
            value={policy.casualLeave}
            onChange={e => setField("casualLeave", e.target.value)}
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="Sick Leave / Year"
            value={policy.sickLeave}
            onChange={e => setField("sickLeave", e.target.value)}
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="Earned Leave / Year"
            value={policy.earnedLeave}
            onChange={e => setField("earnedLeave", e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {/* CARRY FORWARD */}

      <div className="border rounded-xl p-4 bg-white shadow space-y-4">
        <h3 className="font-semibold text-lg">Carry Forward Rules</h3>

        <div className="grid grid-cols-2 gap-4">
          <select
            value={policy.carryForward}
            onChange={e => setField("carryForward", e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">Carry Forward Allowed?</option>
            <option>Yes</option>
            <option>No</option>
          </select>

          <input
            placeholder="Max Carry Forward Days"
            value={policy.maxCarryForward}
            onChange={e => setField("maxCarryForward", e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {/* ATTENDANCE RULES */}

      <div className="border rounded-xl p-4 bg-white shadow space-y-4">
        <h3 className="font-semibold text-lg">Attendance Rules</h3>

        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="Late Mark After (minutes)"
            value={policy.lateMarkAfterMinutes}
            onChange={e => setField("lateMarkAfterMinutes", e.target.value)}
            className="border p-2 rounded w-full"
          />

          <input
            placeholder="Half Day If Less Than (hours worked)"
            value={policy.halfDayAfterHours}
            onChange={e => setField("halfDayAfterHours", e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {/* WORK POLICIES */}

      <div className="border rounded-xl p-4 bg-white shadow space-y-4">
        <h3 className="font-semibold text-lg">Work & Approval Policies</h3>

        <textarea
          placeholder="Leave Approval Flow (example: Employee → Manager → HR)"
          value={policy.approvalFlow}
          onChange={e => setField("approvalFlow", e.target.value)}
          className="border p-2 rounded w-full min-h-[100px]"
        />

        <textarea
          placeholder="Remote / Hybrid Work Policy"
          value={policy.remoteWorkPolicy}
          onChange={e => setField("remoteWorkPolicy", e.target.value)}
          className="border p-2 rounded w-full min-h-[100px]"
        />
      </div>

      {/* NOTES */}

      <div className="border rounded-xl p-4 bg-white shadow">
        <h3 className="font-semibold text-lg mb-2">Additional HR Notes</h3>

        <textarea
          placeholder="Startup specific attendance rules, probation rules, penalties, etc."
          value={policy.notes}
          onChange={e => setField("notes", e.target.value)}
          className="border p-2 rounded w-full min-h-[120px]"
        />
      </div>

      {/* ACTIONS */}

      <div className="flex gap-3">
        <button
          onClick={savePolicy}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Save Policy
        </button>

        <button
          onClick={resetPolicy}
          className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
        >
          Reset
        </button>

        {saved && (
          <span className="text-green-600 font-medium self-center">
            Saved ✓
          </span>
        )}
      </div>

    </div>
  );
}