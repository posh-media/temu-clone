import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { ProductRail } from "../components/product/ProductGrid";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useRecommended } from "../hooks/useCatalogue";

export default function NotFoundPage() {
  const suggestions = useRecommended("not-found", 12);

  return (
    <div className="shell py-4">
      <div className="rounded-card bg-white">
        <EmptyState
          icon={Compass}
          title="This page doesn't exist"
          description="The link may be broken, or the product may no longer be available."
          action={
            <div className="flex gap-2">
              <Link to="/">
                <Button>Back to home</Button>
              </Link>
              <Link to="/search">
                <Button variant="outline">Browse all products</Button>
              </Link>
            </div>
          }
        />
      </div>

      {suggestions.length > 0 && (
        <section className="mt-3 rounded-card bg-white px-3 py-3.5 md:px-4">
          <SectionHeader title="You may also like" />
          <ProductRail products={suggestions} />
        </section>
      )}
    </div>
  );
}
