import { useAuth } from "../../contexts/AuthContext";
import { useUsers } from "../../contexts/UserContext";
import CreateTask from "./CreateTask";

export default function ManagerTasks() {
  const { currentUser } = useAuth();
  const { users } = useUsers();

  if (!currentUser || currentUser.role !== "manager") {
    return <p>Access denied</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Task Module</h1>
      <CreateTask users={users} />
    </div>
  );
}
