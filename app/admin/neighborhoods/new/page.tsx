import { NeighborhoodForm } from "../_NeighborhoodForm";

export default function NewNeighborhoodPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
          Admin · Neighborhoods
        </p>
        <h1 className="text-2xl font-bold text-text-primary">New Neighborhood</h1>
      </div>
      <NeighborhoodForm />
    </div>
  );
}
