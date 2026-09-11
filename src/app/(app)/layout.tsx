import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16 sm:pt-16 sm:pb-0">
      <TopBar />
      {children}
      <BottomNav />
    </div>
  );
}
