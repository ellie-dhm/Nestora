import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../store/authStore";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        Nestora
      </Link>
      <div className="nav-links">
        {user?.role === "buyer" && <Link to="/my-inquiries">My inquiries</Link>}
        {(user?.role === "agent" || user?.role === "admin") && (
          <Link to="/agent">Dashboard</Link>
        )}
        {user?.role === "admin" && <Link to="/admin">Admin</Link>}
        {user ? (
          <>
            <span className="nav-user">{user.name}</span>
            <button onClick={onLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
