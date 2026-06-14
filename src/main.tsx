import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/global.css";
import { ParkRidgeDataProvider } from "./contexts/ParkRidgeDataContext";
import { AppRouter } from "./routes/AppRouter";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ParkRidgeDataProvider>
        <AppRouter />
      </ParkRidgeDataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
