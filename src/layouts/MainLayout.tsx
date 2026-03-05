import Header from "../app/components/Header";

type Props = {
  children: React.ReactNode;
  onNavigate: (module: any) => void;
};

export default function MainLayout({ children, onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ===== HEADER ===== */}
      {/* sticky header for mobile */}
      <div className="sticky top-0 z-50">
        <Header onNavigate={onNavigate} />
      </div>

      {/* ===== PAGE CONTENT ===== */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>

    </div>
  );
}