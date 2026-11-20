export interface Property {
  id: string;
  agent_id: string;
  agent_name?: string;
  title: string;
  description: string;
  price: number;
  type: "apartment" | "house" | "studio";
  listing_type: "sale" | "rent";
  bedrooms: number;
  bathrooms: number;
  city: string;
  status: "available" | "sold" | "rented";
  images: string[];
  created_at: string;
}

export interface PropertyPage {
  items: Property[];
  total: number;
  page: number;
  pages: number;
}

export interface Inquiry {
  id: string;
  property_id: string;
  user_id: string;
  message: string;
  status: "new" | "replied" | "closed";
  reply: string | null;
  created_at: string;
  property_title?: string;
  property_city?: string;
  buyer_name?: string;
  buyer_email?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "agent" | "admin";
  created_at: string;
  listings: number;
  inquiries: number;
}

export interface AdminStats {
  users: number;
  agents: number;
  properties: number;
  available: number;
  inquiries: number;
  new_inquiries: number;
}
