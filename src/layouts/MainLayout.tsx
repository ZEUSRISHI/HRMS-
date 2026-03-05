import Sidebar from "./Sidebar";
import Header from "../app/components/Header";

type Props = {
  children: React.ReactNode;
  onNavigate: (module: any) => void;
};

export default function MainLayout({ children, onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ===== SIDEBAR ===== */}
      <Sidebar />

      {/* ===== RIGHT SIDE CONTENT ===== */}
      <div className="flex-1 flex flex-col">

        {/* ===== HEADER ===== */}
        <Header onNavigate={onNavigate} />

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

      </div>

    </div>
  );
}