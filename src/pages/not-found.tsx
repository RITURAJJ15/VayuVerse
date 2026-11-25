import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground/30">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This page doesn&apos;t exist.
      </p>
      <Link to="/" className="mt-8">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
