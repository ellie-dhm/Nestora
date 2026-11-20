import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api, ApiError } from "../lib/api";
import type { Property } from "../lib/types";
import { formatPrice } from "../lib/format";
import { useAuth } from "../store/authStore";
import EmptyState from "../components/EmptyState";

const schema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be under 1000 characters"),
});
type FormData = z.infer<typeof schema>;

export default function PropertyDetails() {
  const { id } = useParams();
  const user = useAuth((s) => s.user);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    message: string;
    notFound: boolean;
  } | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setActiveImage(0);
    api<{ property: Property }>(`/api/properties/${id}`, {
      signal: ctrl.signal,
    })
      .then((d) => setProperty(d.property))
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError({
          message: e.message ?? "Could not load this property",
          notFound: e instanceof ApiError && e.status === 404,
        });
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [id]);

  const onSubmit = async (data: FormData) => {
    try {
      await api("/api/inquiries", {
        method: "POST",
        body: JSON.stringify({ property_id: id, message: data.message }),
      });
      toast.success("Inquiry sent. The agent will reply soon.");
      reset();
      setSent(true);
    } catch (e) {
      if (e instanceof ApiError && e.fields?.message) {
        setFieldError("message", { message: e.fields.message[0] });
      }
      toast.error(
        e instanceof ApiError ? e.message : "Could not send your inquiry",
      );
    }
  };

  if (loading) {
    return (
      <main className="container details">
        <div className="skeleton">
          <div className="card-img-placeholder gallery-main" />
          <div className="sk-line w-60" />
          <div className="sk-line w-40" />
          <div className="sk-line w-80" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container">
        <EmptyState
          title={error.notFound ? "Property not found" : "Something went wrong"}
          message={
            error.notFound
              ? "This listing doesn't exist or was removed."
              : error.message
          }
          action={<Link to="/">Back to search</Link>}
        />
      </main>
    );
  }

  if (!property) return null;
  const available = property.status === "available";

  return (
    <main className="container details">
      <Link to="/" className="back-link">
        ← Back to search
      </Link>

      <div className="details-layout">
        <section>
          {property.images.length > 0 ? (
            <>
              <img
                className="gallery-main"
                src={property.images[activeImage]}
                alt={property.title}
              />
              {property.images.length > 1 && (
                <div className="gallery-thumbs">
                  {property.images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      className={i === activeImage ? "thumb active" : "thumb"}
                      onClick={() => setActiveImage(i)}
                      aria-label={`Show photo ${i + 1}`}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card-img-placeholder gallery-main">No photos</div>
          )}

          <h1>{property.title}</h1>
          <p className="card-price big">
            {formatPrice(property.price, property.listing_type)}
          </p>
          <p className="card-meta">
            {property.bedrooms} bedrooms · {property.bathrooms} bathrooms ·{" "}
            {property.type} · {property.city}
          </p>
          {!available && (
            <p className="status-badge">This property is {property.status}</p>
          )}
          <h2>About this property</h2>
          <p className="description">{property.description}</p>
          {property.agent_name && (
            <p className="card-meta">Listed by {property.agent_name}</p>
          )}
        </section>

        <aside className="inquiry-box">
          <h2>Interested?</h2>
          {!available ? (
            <p>This property is no longer available for inquiries.</p>
          ) : !user ? (
            <p>
              <Link
                to="/login"
                state={{ from: { pathname: `/properties/${id}` } }}
              >
                Log in
              </Link>{" "}
              or <Link to="/register">create an account</Link> to contact the
              agent.
            </p>
          ) : user.role !== "buyer" ? (
            <p>Only buyer accounts can send inquiries.</p>
          ) : sent ? (
            <div>
              <p>Your inquiry was sent.</p>
              <Link to="/my-inquiries">View my inquiries</Link>
              <button type="button" onClick={() => setSent(false)}>
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <textarea
                rows={5}
                placeholder="Hi, I'd like to arrange a viewing..."
                {...register("message")}
              />
              {errors.message && (
                <p className="field-error">{errors.message.message}</p>
              )}
              <button disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send inquiry"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </main>
  );
}
