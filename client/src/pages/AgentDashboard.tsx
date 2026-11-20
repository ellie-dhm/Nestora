import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api, ApiError } from "../lib/api";
import type { Inquiry, Property } from "../lib/types";
import { formatPrice } from "../lib/format";
import PropertyForm from "../components/PropertyForm";
import EmptyState from "../components/EmptyState";

function Skeletons() {
  return (
    <div className="inquiry-list">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="inquiry-item skeleton" aria-hidden="true">
          <div className="sk-line w-40" />
          <div className="sk-line w-80" />
        </div>
      ))}
    </div>
  );
}

function ListingsTab() {
  const [items, setItems] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<Property | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    api<{ items: Property[] }>("/api/properties/mine/list")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message ?? "Could not load your listings"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (p: Property, status: Property["status"]) => {
    setBusyId(p.id);
    try {
      const { property } = await api<{ property: Property }>(
        `/api/properties/${p.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        },
      );
      setItems((cur) => cur!.map((x) => (x.id === p.id ? property : x)));
      toast.success(`Marked as ${status}`);
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not update status",
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: Property) => {
    if (
      !window.confirm(`Delete "${p.title}"? Its inquiries will be deleted too.`)
    )
      return;
    setBusyId(p.id);
    try {
      await api(`/api/properties/${p.id}`, { method: "DELETE" });
      setItems((cur) => cur!.filter((x) => x.id !== p.id));
      toast.success("Listing deleted");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete");
    } finally {
      setBusyId(null);
    }
  };

  if (formFor) {
    return (
      <PropertyForm
        initial={formFor === "new" ? undefined : formFor}
        onCancel={() => setFormFor(null)}
        onSaved={(saved) => {
          setItems((cur) =>
            formFor === "new"
              ? [saved, ...(cur ?? [])]
              : (cur ?? []).map((x) => (x.id === saved.id ? saved : x)),
          );
          setFormFor(null);
        }}
      />
    );
  }

  return (
    <>
      <div className="row between">
        <h2>My listings</h2>
        <button className="primary" onClick={() => setFormFor("new")}>
          New listing
        </button>
      </div>

      {error ? (
        <EmptyState
          title="Something went wrong"
          message={error}
          action={<button onClick={load}>Try again</button>}
        />
      ) : items === null ? (
        <Skeletons />
      ) : items.length === 0 ? (
        <EmptyState
          title="No listings yet"
          message="Create your first listing and it will appear in the public search."
          action={
            <button className="primary" onClick={() => setFormFor("new")}>
              Create a listing
            </button>
          }
        />
      ) : (
        <div className="inquiry-list">
          {items.map((p) => (
            <article key={p.id} className="inquiry-item listing-row">
              {p.images[0] ? (
                <img src={p.images[0]} alt="" />
              ) : (
                <div className="card-img-placeholder thumb-box">No photo</div>
              )}
              <div className="listing-info">
                <Link to={`/properties/${p.id}`}>
                  <strong>{p.title}</strong>
                </Link>
                <p className="card-meta">
                  {p.city} · {formatPrice(p.price, p.listing_type)}
                </p>
                <select
                  value={p.status}
                  disabled={busyId === p.id}
                  onChange={(e) =>
                    changeStatus(p, e.target.value as Property["status"])
                  }
                  aria-label="Listing status"
                >
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="rented">Rented</option>
                </select>
              </div>
              <div className="row">
                <button
                  onClick={() => setFormFor(p)}
                  disabled={busyId === p.id}
                >
                  Edit
                </button>
                <button onClick={() => remove(p)} disabled={busyId === p.id}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function ReceivedItem({
  inquiry,
  onChanged,
}: {
  inquiry: Inquiry;
  onChanged: (i: Inquiry) => void;
}) {
  const [reply, setReply] = useState(inquiry.reply ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (status: "replied" | "closed") => {
    if (status === "replied" && reply.trim().length < 2) {
      setFieldError("Write a reply of at least 2 characters");
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      const { inquiry: updated } = await api<{ inquiry: Inquiry }>(
        `/api/inquiries/${inquiry.id}/reply`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            ...(reply.trim() ? { reply: reply.trim() } : {}),
          }),
        },
      );
      onChanged({ ...inquiry, ...updated });
      toast.success(status === "replied" ? "Reply sent" : "Inquiry closed");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not update the inquiry",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="inquiry-item">
      <header>
        <div>
          <Link to={`/properties/${inquiry.property_id}`}>
            <strong>{inquiry.property_title}</strong>
          </Link>
          <span className="card-meta">
            {" "}
            · from {inquiry.buyer_name} ({inquiry.buyer_email})
          </span>
        </div>
        <span className={`status-badge ${inquiry.status}`}>
          {inquiry.status}
        </span>
      </header>
      <p className="inquiry-message">{inquiry.message}</p>

      {inquiry.status !== "closed" ? (
        <>
          <textarea
            rows={3}
            placeholder="Write your reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          {fieldError && <p className="field-error">{fieldError}</p>}
          <div className="row">
            <button onClick={() => submit("replied")} disabled={busy}>
              {busy
                ? "Saving..."
                : inquiry.status === "replied"
                  ? "Update reply"
                  : "Send reply"}
            </button>
            <button onClick={() => submit("closed")} disabled={busy}>
              Close inquiry
            </button>
          </div>
        </>
      ) : (
        inquiry.reply && (
          <div className="inquiry-reply">
            <strong>Your reply</strong>
            <p>{inquiry.reply}</p>
          </div>
        )
      )}
      <p className="card-meta">
        {new Date(inquiry.created_at).toLocaleDateString()}
      </p>
    </article>
  );
}

function InquiriesTab() {
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    api<{ items: Inquiry[] }>("/api/inquiries/received")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message ?? "Could not load inquiries"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <h2>Inquiries</h2>
      {error ? (
        <EmptyState
          title="Something went wrong"
          message={error}
          action={<button onClick={load}>Try again</button>}
        />
      ) : items === null ? (
        <Skeletons />
      ) : items.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          message="When buyers contact you about a listing, it will show up here."
        />
      ) : (
        <div className="inquiry-list">
          {items.map((i) => (
            <ReceivedItem
              key={i.id}
              inquiry={i}
              onChanged={(u) =>
                setItems((cur) => cur!.map((x) => (x.id === u.id ? u : x)))
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function AgentDashboard() {
  const [tab, setTab] = useState<"listings" | "inquiries">("listings");
  return (
    <main className="container">
      <h1>Agent dashboard</h1>
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "listings"}
          className={tab === "listings" ? "active" : ""}
          onClick={() => setTab("listings")}
        >
          My listings
        </button>
        <button
          role="tab"
          aria-selected={tab === "inquiries"}
          className={tab === "inquiries" ? "active" : ""}
          onClick={() => setTab("inquiries")}
        >
          Inquiries
        </button>
      </div>
      {tab === "listings" ? <ListingsTab /> : <InquiriesTab />}
    </main>
  );
}
