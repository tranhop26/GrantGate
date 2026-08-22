import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { HomePage } from "@/pages/HomePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CreateMilestonePage } from "@/pages/CreateMilestonePage";
import { MilestonePage } from "@/pages/MilestonePage";
import { ArchitecturePage } from "@/pages/ArchitecturePage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/milestones/new" element={<CreateMilestonePage />} />
        <Route path="/milestones/:id" element={<MilestonePage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
      </Routes>
    </AppShell>
  );
}
