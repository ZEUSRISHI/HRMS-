import { createContext, useContext, useState } from "react";

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

type TaskContextType = {
  tasks: Task[];
  createTask: (task: Task) => void;
  updateStatus: (id: string, status: TaskStatus) => void;
};

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const createTask = (task: Task) => {
    setTasks((prev) => [...prev, task]);
  };

  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  };

  return (
    <TaskContext.Provider value={{ tasks, createTask, updateStatus }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTasks must be used inside TaskProvider");
  return context;
}
