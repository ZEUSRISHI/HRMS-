import { ReactNode } from "react";
import Sidebar from "./Sidebar"; // adjust if path differs

type Props = {
  children: ReactNode;
};

export default function AppLayout({ children }: Props) {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">

      {/* Sidebar */}
      <aside className="w-64 border-r bg-white hidden md:block">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

    </div>
  );
}