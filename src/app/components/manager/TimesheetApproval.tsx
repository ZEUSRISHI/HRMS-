import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

// Type for timesheet
type Timesheet = {
  id: string;
  employee: string;
  date: string;
  hours: number;
  status: "pending" | "approved" | "rejected";
};

// Mock data
const mockTimesheets: Timesheet[] = [
  { id: "1", employee: "Alice", date: "2026-02-15", hours: 8, status: "pending" },
  { id: "2", employee: "Bob", date: "2026-02-14", hours: 7, status: "approved" },
  { id: "3", employee: "Charlie", date: "2026-02-13", hours: 9, status: "pending" },
];

export default function TimesheetApproval() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>(mockTimesheets);

  const handleApprove = (id: string) => {
    setTimesheets(ts =>
      ts.map(t => (t.id === id ? { ...t, status: "approved" } : t))
    );
  };

  const handleReject = (id: string) => {
    setTimesheets(ts =>
      ts.map(t => (t.id === id ? { ...t, status: "rejected" } : t))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timesheet Approval</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {timesheets.map(ts => (
          <div key={ts.id} className="flex justify-between items-center border p-3 rounded">
            <div>
              <p className="font-medium">{ts.employee}</p>
              <p className="text-sm text-gray-500">
                {ts.date} • {ts.hours} hours
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  ts.status === "approved"
                    ? "default"
                    : ts.status === "rejected"
                    ? "destructive"
                    : "secondary"
                }
              >
                {ts.status}
              </Badge>
              {ts.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => handleApprove(ts.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(ts.id)}>
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
