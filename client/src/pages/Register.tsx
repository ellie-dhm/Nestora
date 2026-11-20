import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../store/authStore";
import { ApiError } from "../lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["buyer", "agent"]),
});
type FormData = z.infer<typeof schema>;

export default function Register() {
  const registerUser = useAuth((s) => s.register);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "buyer" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data);
      toast.success("Account created");
      navigate(data.role === "agent" ? "/agent" : "/");
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        // show the server's field errors under the matching inputs
        Object.entries(e.fields).forEach(([field, msgs]) =>
          setError(field as keyof FormData, { message: msgs[0] }),
        );
      }
      toast.error(e instanceof ApiError ? e.message : "Sign up failed");
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1>Create an account</h1>
      <input placeholder="Name" {...register("name")} />
      {errors.name && <p>{errors.name.message}</p>}
      <input type="email" placeholder="Email" {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}
      <input type="password" placeholder="Password" {...register("password")} />
      {errors.password && <p>{errors.password.message}</p>}
      <select {...register("role")}>
        <option value="buyer">I'm looking for a property</option>
        <option value="agent">I'm an agent listing properties</option>
      </select>
      <button disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Sign up"}
      </button>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
