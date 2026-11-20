import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api, ApiError } from "../lib/api";
import type { AdminStats, AdminUser, Property } from "../lib/types";
import { formatPrice } from "../lib/format";
import { useAuth } from "../store/authStore";
import EmptyState from "../components/EmptyState";

function Skeletons() {
  return (
    <div className="inquiry-list">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="inquiry-item skeleton" aria-hidden="true">
          <div className="sk-line w-40" />
          <div className="sk-line w-80" />
        </div>
      ))}
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setStats(null);
    api<{ stats: AdminStats }>("/api/admin/stats")
      .then((d) => setStats(d.stats))
      .catch((e) => setError(e.message ?? "Could not load stats"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <EmptyState
        title="Something went wrong"
        message={error}
        action={<button onClick={load}>Try again</button>}
      />
    );

  const cards: [string, number | undefined][] = [
    ["Users", stats?.users],
    ["Agents", stats?.agents],
    ["Listings", stats?.properties],
    ["Available", stats?.available],
    ["Inquiries", stats?.inquiries],
    ["New inquiries", stats?.new_inquiries],
  ];

  return (
    <div className="stat-grid">
      {cards.map(([label, value]) => (
        <div key={label} className={stats ? "stat-card" : "stat-card skeleton"}>
          <p className="stat-value">{stats ? value : "\u00A0"}</p>
          <p className="card-meta">{label}</p>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const me = useAuth((s) => s.user);
  const [items, setItems] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    api<{ items: AdminUser[] }>("/api/admin/users")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message ?? "Could not load users"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (u: AdminUser, role: AdminUser["role"]) => {
    if (role === u.role) return;
    if (!window.confirm(`Change ${u.name} from ${u.role} to ${role}?`)) return;
    setBusyId(u.id);
    try {
      const { user } = await api<{ user: AdminUser }>(
        `/api/admin/users/${u.id}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
        },
      );
      setItems((cur) =>
        cur!.map((x) => (x.id === u.id ? { ...x, role: user.role } : x)),
      );
      toast.success(`${u.name} is now ${role}`);
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not change the role",
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (u: AdminUser) => {
    if (
      !window.confirm(
        `Delete ${u.name}? Their ${u.listings} listings and ${u.inquiries} inquiries will be deleted too.`,
      )
    )
      return;
    setBusyId(u.id);
    try {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      setItems((cur) => cur!.filter((x) => x.id !== u.id));
      toast.success("User deleted");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not delete the user",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (error)
    return (
      <EmptyState
        title="Something went wrong"
        message={error}
        action={<button onClick={load}>Try again</button>}
      />
    );
  if (items === null) return <Skeletons />;

  const q = search.trim().toLowerCase();
  const shown = q
    ? items.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    : items;

  return (
    <>
      <input
        className="table-search"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {shown.length === 0 ? (
        <EmptyState title="No users found" message="Try a different search." />
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Listings</th>
                <th>Inquiries</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {isMe && " (you)"}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={isMe || busyId === u.id}
                        onChange={(e) =>
                          changeRole(u, e.target.value as AdminUser["role"])
                        }
                        aria-label={`Role for ${u.name}`}
                      >
                        <option value="buyer">Buyer</option>
                        <option value="agent">Agent</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{u.listings}</td>
                    <td>{u.inquiries}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="danger"
                        disabled={isMe || busyId === u.id}
                        onClick={() => remove(u)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ListingsTab() {
  const [items, setItems] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    api<{ items: Property[] }>("/api/admin/properties")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message ?? "Could not load listings"));
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
      setItems((cur) =>
        cur!.map((x) =>
          x.id === p.id ? { ...x, status: property.status } : x,
        ),
      );
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

  if (error)
    return (
      <EmptyState
        title="Something went wrong"
        message={error}
        action={<button onClick={load}>Try again</button>}
      />
    );
  if (items === null) return <Skeletons />;

  const q = search.trim().toLowerCase();
  const shown = q
    ? items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          (p.agent_name ?? "").toLowerCase().includes(q),
      )
    : items;

  return (
    <>
      <input
        className="table-search"
        placeholder="Search by title, city or agent"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {shown.length === 0 ? (
        <EmptyState
          title="No listings found"
          message={
            q ? "Try a different search." : "No listings have been created yet."
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Agent</th>
                <th>City</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/properties/${p.id}`}>{p.title}</Link>
                  </td>
                  <td>{p.agent_name}</td>
                  <td>{p.city}</td>
                  <td>{formatPrice(p.price, p.listing_type)}</td>
                  <td>
                    <select
                      value={p.status}
                      disabled={busyId === p.id}
                      onChange={(e) =>
                        changeStatus(p, e.target.value as Property["status"])
                      }
                      aria-label={`Status for ${p.title}`}
                    >
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="rented">Rented</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="danger"
                      disabled={busyId === p.id}
                      onClick={() => remove(p)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState<"overview" | "users" | "listings">("overview");
  const tabs = [
    ["overview", "Overview"],
    ["users", "Users"],
    ["listings", "Listings"],
  ] as const;

  return (
    <main className="container">
      <h1>Admin panel</h1>
      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <OverviewTab />
      ) : tab === "users" ? (
        <UsersTab />
      ) : (
        <ListingsTab />
      )}
    </main>
  );
}
