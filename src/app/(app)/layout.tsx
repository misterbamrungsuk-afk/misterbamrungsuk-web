import { TabBar } from "@/components/shell";
import SOSButton from "@/components/sos";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame safe-bottom">
      {children}
      <TabBar unread={1} />
      <SOSButton />
    </div>
  );
}
