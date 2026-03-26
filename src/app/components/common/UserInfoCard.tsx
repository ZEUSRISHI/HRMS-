import { useAuth } from "../../contexts/AuthContext";

export default function UserInfoCard() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold">
          {currentUser.name.charAt(0)}
        </div>

        <div>
          <p className="font-semibold">{currentUser.name}</p>
          <p className="text-sm text-gray-500 capitalize">
            {currentUser.role}
          </p>
          <p className="text-xs text-gray-400">{currentUser.email}</p>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Logged in user
      </div>
    </div>
  );
}
