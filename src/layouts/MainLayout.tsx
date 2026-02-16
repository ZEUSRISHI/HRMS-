import Header from "../app/components/Header"; 

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* TOP HEADER */}
      <Header />

      {/* PAGE CONTENT */}
      <main className="flex-1">{children}</main>

    </div>
  );
}
