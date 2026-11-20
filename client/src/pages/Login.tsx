import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../store/authStore";
import { ApiError } from "../lib/api";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname;
  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success("Welcome back");
      const role = useAuth.getState().user?.role;
      navigate(
        from ??
          (role === "admin" ? "/admin" : role === "agent" ? "/agent" : "/"),
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Login failed");
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1>Log in</h1>
      <input type="email" placeholder="Email" {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}
      <input type="password" placeholder="Password" {...register("password")} />
      {errors.password && <p>{errors.password.message}</p>}
      <button disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
      <p>
        No account? <Link to="/register">Sign up</Link>
      </p>
    </form>
  );
}
