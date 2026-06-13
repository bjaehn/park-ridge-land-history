import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ParkRidgeDataProvider } from "./contexts/ParkRidgeDataContext";
import { AppShell } from "./components/layout/AppShell";
import { ROUTES } from "./lib/routes";

const DiscoverPage          = lazy(() => import("./pages/DiscoverPage").then(m => ({ default: m.DiscoverPage })));
const SearchPage            = lazy(() => import("./pages/SearchPage").then(m => ({ default: m.SearchPage })));
const PropertyPage          = lazy(() => import("./pages/PropertyPage").then(m => ({ default: m.PropertyPage })));
const BlocksPage            = lazy(() => import("./pages/BlocksPage").then(m => ({ default: m.BlocksPage })));
const BlockDetailPage       = lazy(() => import("./pages/BlockDetailPage").then(m => ({ default: m.BlockDetailPage })));
const NeighborhoodsPage     = lazy(() => import("./pages/NeighborhoodsPage").then(m => ({ default: m.NeighborhoodsPage })));
const NeighborhoodDetailPage = lazy(() => import("./pages/NeighborhoodDetailPage").then(m => ({ default: m.NeighborhoodDetailPage })));
const CitywidePage          = lazy(() => import("./pages/CitywidePage").then(m => ({ default: m.CitywidePage })));
const MapsPage              = lazy(() => import("./pages/MapsPage").then(m => ({ default: m.MapsPage })));
const DataSourcesPage       = lazy(() => import("./pages/DataSourcesPage").then(m => ({ default: m.DataSourcesPage })));

export default function App() {
  return (
    <BrowserRouter>
      <ParkRidgeDataProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path={ROUTES.discover}             element={<Suspense fallback={<PageLoader />}><DiscoverPage /></Suspense>} />
            <Route path={ROUTES.search}               element={<Suspense fallback={<PageLoader />}><SearchPage /></Suspense>} />
            <Route path={ROUTES.propertyPattern}      element={<Suspense fallback={<PageLoader />}><PropertyPage /></Suspense>} />
            <Route path={ROUTES.blocks}               element={<Suspense fallback={<PageLoader />}><BlocksPage /></Suspense>} />
            <Route path={ROUTES.blockPattern}         element={<Suspense fallback={<PageLoader />}><BlockDetailPage /></Suspense>} />
            <Route path={ROUTES.neighborhoods}        element={<Suspense fallback={<PageLoader />}><NeighborhoodsPage /></Suspense>} />
            <Route path={ROUTES.neighborhoodPattern}  element={<Suspense fallback={<PageLoader />}><NeighborhoodDetailPage /></Suspense>} />
            <Route path={ROUTES.parkRidge}            element={<Suspense fallback={<PageLoader />}><CitywidePage /></Suspense>} />
            <Route path={ROUTES.maps}                 element={<Suspense fallback={<PageLoader />}><MapsPage /></Suspense>} />
            <Route path={ROUTES.dataSources}          element={<Suspense fallback={<PageLoader />}><DataSourcesPage /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ParkRidgeDataProvider>
    </BrowserRouter>
  );
}

function PageLoader() {
  return (
    <div className="page-container">
      <div className="loading-spinner">
        <div className="spinner-dot" />
        <div className="spinner-dot" />
        <div className="spinner-dot" />
        <span>Loading…</span>
      </div>
    </div>
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
