import { Link } from "react-router-dom";
import { ROUTES } from "../routes/routeConfig";

export function NotFoundPage() {
  return (
    <div className="content-page">
      <div className="content-page-inner">
        <div className="error-page">
          <h1 className="error-page-title">Page not found</h1>
          <p className="error-page-body">
            The page you were looking for doesn't exist or has moved.
          </p>
          <div className="error-page-links">
            <Link to={ROUTES.home.path} className="error-page-link">Go home</Link>
            <Link to={ROUTES.neighborhoods.path} className="error-page-link">Explore neighborhoods</Link>
            <Link to={ROUTES.city.path} className="error-page-link">City growth</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
