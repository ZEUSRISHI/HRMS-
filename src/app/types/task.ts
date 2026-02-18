export type TaskStatus = "pending" | "in-progress" | "completed";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  status: TaskStatus;
}
