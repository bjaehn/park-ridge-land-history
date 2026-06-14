/**
 * AppRouter — centralized route wiring for Park Ridge Land History.
 *
 * Route structure:
 *   /            → HomePage        (landing, hero, search)
 *   /explore     → App             (full map explorer — bypasses AppLayout)
 *
 * Within AppLayout (top nav + page chrome):
 *   /properties/:pin         → PropertyDetailPage
 *   /blocks                  → BlocksPage
 *   /blocks/:blockId         → BlockDetailPage
 *   /neighborhoods           → NeighborhoodsPage
 *   /neighborhoods/:id       → NeighborhoodDetailPage
 *   /city                    → CityPage
 *   /maps                    → MapsPage
 *   /sources                 → SourcesPage
 *   /about                   → AboutPage
 *   *                        → NotFoundPage
 *
 * To add a new route:
 *   1. Add an entry to ROUTES in routeConfig.ts.
 *   2. Create a page component in src/pages/.
 *   3. Import it here and add a <Route> inside the appropriate group.
 */

import { Routes, Route } from "react-router-dom";
import App from "../App";
import { AppLayout } from "../layouts/AppLayout";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PropertyDetailPage } from "../pages/properties/PropertyDetailPage";
import { BlocksPage } from "../pages/blocks/BlocksPage";
import { BlockDetailPage } from "../pages/blocks/BlockDetailPage";
import { NeighborhoodsPage } from "../pages/neighborhoods/NeighborhoodsPage";
import { NeighborhoodDetailPage } from "../pages/neighborhoods/NeighborhoodDetailPage";
import { CityPage } from "../pages/city/CityPage";
import { MapsPage } from "../pages/maps/MapsPage";
import { SourcesPage } from "../pages/sources/SourcesPage";
import { AboutPage } from "../pages/about/AboutPage";

export function AppRouter() {
  return (
    <Routes>
      {/* Full map explorer — full-screen, no AppLayout nav */}
      <Route path="/explore" element={<App />} />

      {/* All other routes use AppLayout (top nav + page chrome) */}
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />

        {/* Properties */}
        <Route path="properties/:pin" element={<PropertyDetailPage />} />

        {/* Blocks */}
        <Route path="blocks" element={<BlocksPage />} />
        <Route path="blocks/:blockId" element={<BlockDetailPage />} />

        {/* Neighborhoods */}
        <Route path="neighborhoods" element={<NeighborhoodsPage />} />
        <Route path="neighborhoods/:neighborhoodId" element={<NeighborhoodDetailPage />} />

        {/* City */}
        <Route path="city" element={<CityPage />} />

        {/* Maps */}
        <Route path="maps" element={<MapsPage />} />

        {/* Reference */}
        <Route path="sources" element={<SourcesPage />} />
        <Route path="about" element={<AboutPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
