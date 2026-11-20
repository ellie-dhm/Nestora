import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api, ApiError } from "../lib/api";
import type { Property } from "../lib/types";

const parseImages = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const isUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(120, "Title is too long"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description is too long"),
  price: z.string().regex(/^[1-9]\d*$/, "Enter a price greater than 0"),
  type: z.enum(["apartment", "house", "studio"]),
  listing_type: z.enum(["sale", "rent"]),
  bedrooms: z.string().regex(/^\d{1,2}$/, "Enter a number from 0 to 20"),
  bathrooms: z.string().regex(/^\d{1,2}$/, "Enter a number from 0 to 20"),
  city: z
    .string()
    .trim()
    .min(2, "City is required")
    .max(80, "City is too long"),
  status: z.enum(["available", "sold", "rented"]),
  imagesText: z.string().refine((v) => {
    const urls = parseImages(v);
    return urls.length <= 10 && urls.every(isUrl);
  }, "Up to 10 image URLs, one per line, each starting with http:// or https://"),
});
type FormData = z.infer<typeof schema>;

export default function PropertyForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Property;
  onSaved: (p: Property) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          title: initial.title,
          description: initial.description,
          price: String(initial.price),
          type: initial.type,
          listing_type: initial.listing_type,
          bedrooms: String(initial.bedrooms),
          bathrooms: String(initial.bathrooms),
          city: initial.city,
          status: initial.status,
          imagesText: initial.images.join("\n"),
        }
      : {
          type: "apartment",
          listing_type: "sale",
          bedrooms: "1",
          bathrooms: "1",
          status: "available",
          imagesText: "",
        },
  });

  const onSubmit = async (d: FormData) => {
    const body = {
      title: d.title,
      description: d.description,
      price: Number(d.price),
      type: d.type,
      listing_type: d.listing_type,
      bedrooms: Number(d.bedrooms),
      bathrooms: Number(d.bathrooms),
      city: d.city,
      status: d.status,
      images: parseImages(d.imagesText),
    };
    try {
      const { property } = await api<{ property: Property }>(
        initial ? `/api/properties/${initial.id}` : "/api/properties",
        { method: initial ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      toast.success(initial ? "Listing updated" : "Listing created");
      onSaved(property);
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [field, msgs] of Object.entries(e.fields)) {
          const name = field === "images" ? "imagesText" : field;
          if (name in schema.shape)
            setError(name as keyof FormData, { message: msgs[0] });
        }
      }
      toast.error(
        e instanceof ApiError ? e.message : "Could not save the listing",
      );
    }
  };

  const Err = ({ name }: { name: keyof FormData }) =>
    errors[name] ? (
      <p className="field-error">{errors[name]?.message}</p>
    ) : null;

  return (
    <form
      className="property-form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h2>{initial ? "Edit listing" : "New listing"}</h2>

      <label>
        Title
        <input {...register("title")} />
      </label>
      <Err name="title" />

      <label>
        Description
        <textarea rows={5} {...register("description")} />
      </label>
      <Err name="description" />

      <div className="form-grid">
        <label>
          Listing type
          <select {...register("listing_type")}>
            <option value="sale">For sale</option>
            <option value="rent">For rent (monthly)</option>
          </select>
        </label>
        <label>
          Property type
          <select {...register("type")}>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="studio">Studio</option>
          </select>
        </label>
        <label>
          Price (EUR)
          <input inputMode="numeric" {...register("price")} />
          <Err name="price" />
        </label>
        <label>
          City
          <input {...register("city")} />
          <Err name="city" />
        </label>
        <label>
          Bedrooms
          <input inputMode="numeric" {...register("bedrooms")} />
          <Err name="bedrooms" />
        </label>
        <label>
          Bathrooms
          <input inputMode="numeric" {...register("bathrooms")} />
          <Err name="bathrooms" />
        </label>
        <label>
          Status
          <select {...register("status")}>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="rented">Rented</option>
          </select>
        </label>
      </div>

      <label>
        Image URLs (one per line, max 10)
        <textarea
          rows={4}
          placeholder="https://..."
          {...register("imagesText")}
        />
      </label>
      <Err name="imagesText" />

      <div className="row">
        <button disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save listing"}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
