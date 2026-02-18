import { useMemo } from "react";

type Metric = {
  employee: string;
  completed: number;
  pending: number;
};

export default function PerformanceDashboard() {
  const data: Metric[] = useMemo(
    () => [
      { employee: "John", completed: 12, pending: 3 },
      { employee: "Sara", completed: 9, pending: 5 },
      { employee: "David", completed: 15, pending: 1 },
    ],
    []
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="font-semibold mb-4">Team Performance</h2>

      <div className="space-y-3">
        {data.map(d => (
          <div key={d.employee} className="border rounded-lg p-3">
            <p className="font-medium">{d.employee}</p>
            <p className="text-sm text-gray-600">
              Completed: {d.completed} | Pending: {d.pending}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
