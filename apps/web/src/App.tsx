import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";

const HomePage = lazy(() =>
  import("@/pages/HomePage").then(({ HomePage: Page }) => ({ default: Page })),
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then(({ DashboardPage: Page }) => ({ default: Page })),
);
const CreateMilestonePage = lazy(() =>
  import("@/pages/CreateMilestonePage").then(({ CreateMilestonePage: Page }) => ({ default: Page })),
);
const MilestonePage = lazy(() =>
  import("@/pages/MilestonePage").then(({ MilestonePage: Page }) => ({ default: Page })),
);
const ArchitecturePage = lazy(() =>
  import("@/pages/ArchitecturePage").then(({ ArchitecturePage: Page }) => ({ default: Page })),
);

function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-label="Loading page">
      Loading GrantGate…
    </div>
  );
}

export function App() {
  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/milestones/new" element={<CreateMilestonePage />} />
          <Route path="/milestones/:id" element={<MilestonePage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
