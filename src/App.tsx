import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ParkRidgeDataProvider } from "./contexts/ParkRidgeDataContext";
import { AppShell } from "./components/layout/AppShell";
import { DiscoverPage } from "./pages/DiscoverPage";
import { SearchPage } from "./pages/SearchPage";
import { PropertyPage } from "./pages/PropertyPage";
import { BlocksPage } from "./pages/BlocksPage";
import { BlockDetailPage } from "./pages/BlockDetailPage";
import { NeighborhoodsPage } from "./pages/NeighborhoodsPage";
import { NeighborhoodDetailPage } from "./pages/NeighborhoodDetailPage";
import { CitywidePage } from "./pages/CitywidePage";
import { MapsPage } from "./pages/MapsPage";
import { DataSourcesPage } from "./pages/DataSourcesPage";
import { ROUTES } from "./lib/routes";

export default function App() {
  return (
    <BrowserRouter>
      <ParkRidgeDataProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path={ROUTES.discover} element={<DiscoverPage />} />
            <Route path={ROUTES.search} element={<SearchPage />} />
            <Route path={ROUTES.propertyPattern} element={<PropertyPage />} />
            <Route path={ROUTES.blocks} element={<BlocksPage />} />
            <Route path={ROUTES.blockPattern} element={<BlockDetailPage />} />
            <Route path={ROUTES.neighborhoods} element={<NeighborhoodsPage />} />
            <Route path={ROUTES.neighborhoodPattern} element={<NeighborhoodDetailPage />} />
            <Route path={ROUTES.parkRidge} element={<CitywidePage />} />
            <Route path={ROUTES.maps} element={<MapsPage />} />
            <Route path={ROUTES.dataSources} element={<DataSourcesPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ParkRidgeDataProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="page-container">
      <div className="empty-state">
        <strong style={{ color: "rgba(255,255,255,0.70)", fontSize: "1.1rem", marginBottom: 8, display: "block" }}>
          Page not found
        </strong>
        <p style={{ margin: 0, fontSize: "0.82rem" }}>
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="link-pill" style={{ marginTop: 16 }}>Back to Discover</a>
      </div>
    </div>
  );
}
