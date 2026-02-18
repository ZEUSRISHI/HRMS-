import { createContext, useContext, useState, ReactNode } from "react";

export type Timesheet = {
  id: string;
  employeeId: string;
  employeeName: string;
  hours: number;
  date: string;
  status: "pending" | "approved" | "rejected";
};

type TimesheetContextType = {
  timesheets: Timesheet[];
  approveTimesheet: (id: string) => void;
  rejectTimesheet: (id: string) => void;
  addTimesheet: (sheet: Timesheet) => void;
};

const TimesheetContext = createContext<TimesheetContextType | undefined>(undefined);

export function TimesheetProvider({ children }: { children: ReactNode }) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);

  const approveTimesheet = (id: string) => {
    setTimesheets(prev =>
      prev.map(t => (t.id === id ? { ...t, status: "approved" } : t))
    );
  };

  const rejectTimesheet = (id: string) => {
    setTimesheets(prev =>
      prev.map(t => (t.id === id ? { ...t, status: "rejected" } : t))
    );
  };

  const addTimesheet = (sheet: Timesheet) => {
    setTimesheets(prev => [...prev, sheet]);
  };

  return (
    <TimesheetContext.Provider
      value={{ timesheets, approveTimesheet, rejectTimesheet, addTimesheet }}
    >
      {children}
    </TimesheetContext.Provider>
  );
}

export const useTimesheets = () => {
  const ctx = useContext(TimesheetContext);
  if (!ctx) throw new Error("useTimesheets must be used within provider");
  return ctx;
};
