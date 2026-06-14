import { createContext, useContext } from "react";
import { useParkRidgeData, type ParkRidgeDataState } from "../hooks/useParkRidgeData";
import { decoratePermitPressure } from "../lib/permitPressure";
import { useMemo } from "react";
import type { ParcelCollection } from "../lib/parcelTypes";

type ParkRidgeDataContextValue = ParkRidgeDataState & {
  pressureDecoratedParcels: ParcelCollection | null;
};

const ParkRidgeDataContext = createContext<ParkRidgeDataContextValue | null>(null);

export function ParkRidgeDataProvider({ children }: { children: React.ReactNode }) {
  const data = useParkRidgeData();
  const pressureDecoratedParcels = useMemo(
    () => decoratePermitPressure(data.parcels, 5),
    [data.parcels]
  );

  return (
    <ParkRidgeDataContext.Provider value={{ ...data, pressureDecoratedParcels }}>
      {children}
    </ParkRidgeDataContext.Provider>
  );
}

export function useParkRidgeContext(): ParkRidgeDataContextValue {
  const ctx = useContext(ParkRidgeDataContext);
  if (!ctx) throw new Error("useParkRidgeContext must be used within ParkRidgeDataProvider");
  return ctx;
}
