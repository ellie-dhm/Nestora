import { Link } from "react-router-dom";
import type { Property } from "../lib/types";
import { formatPrice } from "../lib/format";

export default function PropertyCard({ property: p }: { property: Property }) {
  return (
    <Link to={`/properties/${p.id}`} className="card">
      {p.images[0] ? (
        <img
          src={p.images[0]}
          alt={p.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : (
        <div className="card-img-placeholder">No photo</div>
      )}
      <div className="card-body">
        <p className="card-price">{formatPrice(p.price, p.listing_type)}</p>
        <h3>{p.title}</h3>
        <p className="card-meta">
          {p.bedrooms} bd · {p.bathrooms} ba · {p.type}
        </p>
        <p className="card-meta">{p.city}</p>
      </div>
    </Link>
  );
}
