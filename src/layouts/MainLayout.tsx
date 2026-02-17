import Header from "../app/components/Header";

type Props = {
  children: React.ReactNode;
  onNavigate: (module: any) => void;
};

export default function MainLayout({ children, onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ===== HEADER (WITH NOTIFICATIONS + USER INFO) ===== */}
      <Header onNavigate={onNavigate} />

      {/* ===== PAGE CONTENT ===== */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

    </div>
  );
}
