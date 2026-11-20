export const formatPrice = (price: number, listing: "sale" | "rent") =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price) + (listing === "rent" ? " / month" : "");
