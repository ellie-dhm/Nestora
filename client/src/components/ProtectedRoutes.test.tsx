import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth, type Role } from "../store/authStore";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<ProtectedRoute roles={["agent"]} />}>
          <Route path="/agent" element={<p>Agent area</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const mkUser = (role: Role) => ({
  id: "1",
  name: "Test",
  email: "t@t.com",
  role,
});

beforeEach(() => useAuth.setState({ user: null, loading: false }));

describe("ProtectedRoute", () => {
  it("shows a loading state while the session is being checked", () => {
    useAuth.setState({ loading: true });
    renderAt("/agent");
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects logged-out visitors to the login page", () => {
    renderAt("/agent");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("sends a buyer away from the agent area", () => {
    useAuth.setState({ user: mkUser("buyer") });
    renderAt("/agent");
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("lets an agent in", () => {
    useAuth.setState({ user: mkUser("agent") });
    renderAt("/agent");
    expect(screen.getByText("Agent area")).toBeInTheDocument();
  });
});
