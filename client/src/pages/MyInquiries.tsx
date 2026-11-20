import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api, ApiError } from "../lib/api";
import type { Inquiry } from "../lib/types";
import EmptyState from "../components/EmptyState";

const schema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be under 1000 characters"),
});
type FormData = z.infer<typeof schema>;

function InquiryItem({
  inquiry,
  onChanged,
  onDeleted,
}: {
  inquiry: Inquiry;
  onChanged: (i: Inquiry) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { message: inquiry.message },
  });

  const save = async (data: FormData) => {
    try {
      const { inquiry: updated } = await api<{ inquiry: Inquiry }>(
        `/api/inquiries/${inquiry.id}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );
      onChanged({ ...inquiry, ...updated });
      setEditing(false);
      toast.success("Inquiry updated");
    } catch (e) {
      if (e instanceof ApiError && e.fields?.message) {
        setError("message", { message: e.fields.message[0] });
      }
      toast.error(e instanceof ApiError ? e.message : "Could not update");
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this inquiry? This can't be undone.")) return;
    setDeleting(true);
    try {
      await api(`/api/inquiries/${inquiry.id}`, { method: "DELETE" });
      onDeleted(inquiry.id);
      toast.success("Inquiry deleted");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete");
      setDeleting(false);
    }
  };

  return (
    <article className="inquiry-item">
      <header>
        <div>
          <Link to={`/properties/${inquiry.property_id}`}>
            <strong>{inquiry.property_title}</strong>
          </Link>
          <span className="card-meta"> · {inquiry.property_city}</span>
        </div>
        <span className={`status-badge ${inquiry.status}`}>
          {inquiry.status}
        </span>
      </header>

      {editing ? (
        <form onSubmit={handleSubmit(save)} noValidate>
          <textarea rows={4} {...register("message")} />
          {errors.message && (
            <p className="field-error">{errors.message.message}</p>
          )}
          <div className="row">
            <button disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="inquiry-message">{inquiry.message}</p>
      )}

      {inquiry.reply && (
        <div className="inquiry-reply">
          <strong>Agent's reply</strong>
          <p>{inquiry.reply}</p>
        </div>
      )}

      <footer>
        <span className="card-meta">
          {new Date(inquiry.created_at).toLocaleDateString()}
        </span>
        {!editing && (
          <div className="row">
            {inquiry.status === "new" && (
              <button type="button" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            <button
              className="danger"
              type="button"
              onClick={remove}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}

export default function MyInquiries() {
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    api<{ items: Inquiry[] }>("/api/inquiries/mine")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message ?? "Could not load your inquiries"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="container">
      <h1>My inquiries</h1>

      {error ? (
        <EmptyState
          title="Something went wrong"
          message={error}
          action={<button onClick={load}>Try again</button>}
        />
      ) : items === null ? (
        <div className="inquiry-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="inquiry-item skeleton" aria-hidden="true">
              <div className="sk-line w-40" />
              <div className="sk-line w-80" />
              <div className="sk-line w-60" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          message="When you contact an agent about a property, it will show up here."
          action={<Link to="/">Browse properties</Link>}
        />
      ) : (
        <div className="inquiry-list">
          {items.map((i) => (
            <InquiryItem
              key={i.id}
              inquiry={i}
              onChanged={(u) =>
                setItems((cur) => cur!.map((x) => (x.id === u.id ? u : x)))
              }
              onDeleted={(id) =>
                setItems((cur) => cur!.filter((x) => x.id !== id))
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}
