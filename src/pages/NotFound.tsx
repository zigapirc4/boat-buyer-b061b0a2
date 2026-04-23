import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Ship } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center app-page-bg px-4">
      <div className="text-center section-card p-8 max-w-md w-full">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/15 text-primary border border-primary/25 flex items-center justify-center">
          <Ship className="h-5 w-5" />
        </div>
        <h1 className="mb-2 text-4xl font-bold text-primary">404</h1>
        <p className="mb-5 text-base text-muted-foreground">This page does not exist.</p>
        <Link to="/" className="top-nav-cta inline-flex">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
