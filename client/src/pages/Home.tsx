import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { PropertyPage } from "../lib/types";
import PropertyCard from "../components/PropertyCard";
import PropertyCardSkeleton from "../components/PropertyCardSkeleton";
import EmptyState from "../components/EmptyState";

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<PropertyPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const query = params.toString();

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api<PropertyPage>(`/api/properties?${query}`, { signal: ctrl.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(e.message ?? "Could not load properties");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [query, retry]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of fd.entries()) {
      const v = String(value).trim();
      if (v) next.set(key, v);
    }
    setParams(next); // a new search always goes back to page 1
  };

  const goToPage = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasFilters = [...params.keys()].some((k) => k !== "page");

  return (
    <main className="container">
      <h1>Find your next home</h1>

      <form key={query} className="filters" onSubmit={onSubmit}>
        <input
          name="city"
          placeholder="City"
          defaultValue={params.get("city") ?? ""}
        />
        <select
          name="listing_type"
          defaultValue={params.get("listing_type") ?? ""}
        >
          <option value="">Buy or rent</option>
          <option value="sale">For sale</option>
          <option value="rent">For rent</option>
        </select>
        <select name="type" defaultValue={params.get("type") ?? ""}>
          <option value="">Any type</option>
          <option value="apartment">Apartment</option>
          <option value="house">House</option>
          <option value="studio">Studio</option>
        </select>
        <input
          name="min_price"
          type="number"
          min="0"
          placeholder="Min price"
          defaultValue={params.get("min_price") ?? ""}
        />
        <input
          name="max_price"
          type="number"
          min="0"
          placeholder="Max price"
          defaultValue={params.get("max_price") ?? ""}
        />
        <input
          name="bedrooms"
          type="number"
          min="0"
          placeholder="Min bedrooms"
          defaultValue={params.get("bedrooms") ?? ""}
        />
        <button type="submit">Search</button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams(new URLSearchParams())}
          >
            Clear
          </button>
        )}
      </form>

      {error ? (
        <EmptyState
          title="Something went wrong"
          message={error}
          action={
            <button onClick={() => setRetry((n) => n + 1)}>Try again</button>
          }
        />
      ) : loading ? (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="No properties found"
          message={
            hasFilters
              ? "Try widening your search or clearing the filters."
              : "No listings yet. Check back soon."
          }
          action={
            hasFilters ? (
              <button onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="result-count">{data?.total} properties</p>
          <div className="grid">
            {data?.items.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
          {data && data.pages > 1 && (
            <div className="pagination">
              <button
                disabled={data.page <= 1}
                onClick={() => goToPage(data.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {data.page} of {data.pages}
              </span>
              <button
                disabled={data.page >= data.pages}
                onClick={() => goToPage(data.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
