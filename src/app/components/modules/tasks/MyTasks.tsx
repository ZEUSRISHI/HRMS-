import { useTasks } from "../../contexts/TaskContext";
import { useAuth } from "../contexts/AuthContext";

export default function MyTasks() {
  const { tasks, updateStatus } = useTasks();
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const myTasks = tasks.filter(
    (t) => t.assignedTo === currentUser.id
  );

  return (
    <div className="grid gap-4">
      {myTasks.map((task) => (
        <div key={task.id} className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold">{task.title}</h3>
          <p className="text-sm text-gray-500">{task.description}</p>

          <p className="text-xs mt-1">Due: {task.dueDate}</p>

          {/* STATUS UPDATE */}
          <select
            value={task.status}
            onChange={(e) =>
              updateStatus(task.id, e.target.value as any)
            }
            className="mt-2 border rounded px-2 py-1"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      ))}
    </div>
  );
}
