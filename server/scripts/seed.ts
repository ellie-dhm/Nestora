import bcrypt from "bcrypt"; // use "bcryptjs" if that's what your auth.ts imports
import { pool } from "../src/db";

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80`;

// Unsplash photo ids
const APT = [
  "1560448204-e02f11c3d0e2",
  "1502672260266-1c1ef2d93688",
  "1522708323590-d24dbb6b0267",
  "1493809842364-78817add7ffb",
  "1554995207-c18c203602cb",
];
const HOUSE = [
  "1568605114967-8130f3a36994",
  "1512917774080-9991f1c4c750",
  "1564013799919-ab600027ffc6",
  "1600596542815-ffad4c1539a9",
  "1570129477492-45c003edd2be",
];
const KITCHEN = ["1484154218962-a197022b5858", "1556909114-f6e7ad7d3136"];

type Seed = {
  agent: 0 | 1;
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
};

const properties: Seed[] = [
  {
    agent: 0,
    title: "Bright canal-view apartment",
    description:
      "Light-filled apartment with large windows overlooking the canal, a modern kitchen and a quiet bedroom at the back.",
    price: 485000,
    type: "apartment",
    listing_type: "sale",
    bedrooms: 2,
    bathrooms: 1,
    city: "Amsterdam",
    status: "available",
    images: [APT[0], APT[1], KITCHEN[0]].map(img),
  },
  {
    agent: 0,
    title: "Modern loft in the Jordaan",
    description:
      "Open-plan loft with high ceilings and exposed beams, steps away from cafes, markets and the canals.",
    price: 2400,
    type: "apartment",
    listing_type: "rent",
    bedrooms: 1,
    bathrooms: 1,
    city: "Amsterdam",
    status: "available",
    images: [APT[3], APT[4]].map(img),
  },
  {
    agent: 1,
    title: "Family home with garden",
    description:
      "Spacious family house with a south-facing garden, a private driveway and a bright open kitchen.",
    price: 625000,
    type: "house",
    listing_type: "sale",
    bedrooms: 4,
    bathrooms: 2,
    city: "Utrecht",
    status: "available",
    images: [HOUSE[0], HOUSE[1], KITCHEN[1]].map(img),
  },
  {
    agent: 1,
    title: "Studio near Utrecht Centraal",
    description:
      "Compact, fully furnished studio a five-minute walk from the central station. Utilities included.",
    price: 1150,
    type: "studio",
    listing_type: "rent",
    bedrooms: 0,
    bathrooms: 1,
    city: "Utrecht",
    status: "available",
    images: [APT[2], APT[1]].map(img),
  },
  {
    agent: 0,
    title: "Renovated townhouse",
    description:
      "Fully renovated townhouse on a tree-lined street with a bright living room and a sunny patio.",
    price: 540000,
    type: "house",
    listing_type: "sale",
    bedrooms: 3,
    bathrooms: 2,
    city: "Rotterdam",
    status: "available",
    images: [HOUSE[2], HOUSE[3]].map(img),
  },
  {
    agent: 0,
    title: "Skyline penthouse",
    description:
      "Top-floor penthouse with a wraparound terrace and sweeping views across the river and the city.",
    price: 780000,
    type: "apartment",
    listing_type: "sale",
    bedrooms: 3,
    bathrooms: 2,
    city: "Rotterdam",
    status: "available",
    images: [APT[4], APT[0], KITCHEN[0]].map(img),
  },
  {
    agent: 1,
    title: "Cosy apartment by the beach",
    description:
      "Bright two-room apartment a few minutes from the beach, with a balcony and a shared bike storage.",
    price: 1650,
    type: "apartment",
    listing_type: "rent",
    bedrooms: 2,
    bathrooms: 1,
    city: "The Hague",
    status: "available",
    images: [APT[1], APT[3]].map(img),
  },
  {
    agent: 1,
    title: "Detached villa with pool",
    description:
      "Impressive detached villa with a heated pool, a landscaped garden and a double garage.",
    price: 1250000,
    type: "house",
    listing_type: "sale",
    bedrooms: 5,
    bathrooms: 3,
    city: "The Hague",
    status: "available",
    images: [HOUSE[1], HOUSE[4], KITCHEN[1]].map(img),
  },
  {
    agent: 0,
    title: "Student-friendly studio",
    description:
      "Affordable studio close to the university campus, with fast internet and a small private kitchen.",
    price: 850,
    type: "studio",
    listing_type: "rent",
    bedrooms: 0,
    bathrooms: 1,
    city: "Eindhoven",
    status: "available",
    images: [APT[2], APT[4]].map(img),
  },
  {
    agent: 1,
    title: "Spacious apartment with balcony",
    description:
      "Two-bedroom apartment with a sunny balcony, an elevator and a private storage room in the basement.",
    price: 320000,
    type: "apartment",
    listing_type: "sale",
    bedrooms: 2,
    bathrooms: 1,
    city: "Eindhoven",
    status: "available",
    images: [APT[0], APT[3]].map(img),
  },
  {
    agent: 0,
    title: "Garden apartment",
    description:
      "Ground-floor apartment with its own garden, ideal for anyone who wants outdoor space in the city.",
    price: 2100,
    type: "apartment",
    listing_type: "rent",
    bedrooms: 2,
    bathrooms: 1,
    city: "Amsterdam",
    status: "rented",
    images: [APT[1], KITCHEN[0]].map(img),
  },
  {
    agent: 1,
    title: "Charming terraced house",
    description:
      "Characterful terraced house with original details, a cosy living room and a small courtyard garden.",
    price: 2300,
    type: "house",
    listing_type: "rent",
    bedrooms: 3,
    bathrooms: 1,
    city: "Utrecht",
    status: "available",
    images: [HOUSE[3], HOUSE[0]].map(img),
  },
  {
    agent: 0,
    title: "New-build apartment",
    description:
      "Energy-efficient new-build apartment with floor heating, a large terrace and a parking space.",
    price: 1800,
    type: "apartment",
    listing_type: "rent",
    bedrooms: 2,
    bathrooms: 1,
    city: "Rotterdam",
    status: "available",
    images: [APT[3], APT[2], KITCHEN[1]].map(img),
  },
  {
    agent: 1,
    title: "Waterfront house",
    description:
      "Detached house directly on the water with a private jetty, a spacious living area and a rooftop terrace.",
    price: 895000,
    type: "house",
    listing_type: "sale",
    bedrooms: 4,
    bathrooms: 2,
    city: "Amsterdam",
    status: "sold",
    images: [HOUSE[4], HOUSE[2]].map(img),
  },
];

// property index, buyer index, message, status, reply
const inquiries: [
  number,
  0 | 1,
  string,
  "new" | "replied" | "closed",
  string | null,
][] = [
  [
    0,
    0,
    "Is the apartment still available? I'd love to arrange a viewing this week.",
    "replied",
    "Yes, it is. I can show it on Thursday at 17:00 or Saturday morning.",
  ],
  [
    2,
    1,
    "Does the garden get sun in the afternoon, and is the driveway big enough for two cars?",
    "new",
    null,
  ],
  [
    6,
    0,
    "Are pets allowed in this apartment? I have a small cat.",
    "new",
    null,
  ],
  [
    1,
    1,
    "Is the rent negotiable for a 24-month lease?",
    "replied",
    "We could look at a small discount for a 24-month contract. Let's talk at the viewing.",
  ],
  [
    4,
    0,
    "Could you send the energy label and the floor plan?",
    "closed",
    "Sent both by email. Let me know if you have any other questions.",
  ],
];

async function main() {
  // cascades to the listings and inquiries these users own
  await pool.query(
    "delete from users where email like 'seed-%@nestora-demo.com'",
  );
  const hash = await bcrypt.hash("password123", 10);

  const addUser = async (
    name: string,
    email: string,
    role: "buyer" | "agent",
  ) =>
    (
      await pool.query(
        "insert into users (name, email, password_hash, role) values ($1,$2,$3,$4) returning id",
        [name, email, hash, role],
      )
    ).rows[0].id as string;

  const agents = [
    await addUser("Sofia Janssen", "seed-sofia@nestora-demo.com", "agent"),
    await addUser("Mark de Vries", "seed-mark@nestora-demo.com", "agent"),
  ];
  const buyers = [
    await addUser("Emma Bakker", "seed-emma@nestora-demo.com", "buyer"),
    await addUser("Lucas Smit", "seed-lucas@nestora-demo.com", "buyer"),
  ];

  const propertyIds: string[] = [];
  for (const p of properties) {
    const { rows } = await pool.query(
      `insert into properties (agent_id, title, description, price, type, listing_type, bedrooms, bathrooms, city, status, images)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
      [
        agents[p.agent],
        p.title,
        p.description,
        p.price,
        p.type,
        p.listing_type,
        p.bedrooms,
        p.bathrooms,
        p.city,
        p.status,
        p.images,
      ],
    );
    propertyIds.push(rows[0].id);
  }

  for (const [pi, bi, message, status, reply] of inquiries) {
    await pool.query(
      "insert into inquiries (property_id, user_id, message, status, reply) values ($1,$2,$3,$4,$5)",
      [propertyIds[pi], buyers[bi], message, status, reply],
    );
  }

  console.log(
    `Seeded ${agents.length + buyers.length} users, ${properties.length} listings, ${inquiries.length} inquiries.`,
  );
  console.log(
    "Logins (password: password123): seed-sofia@, seed-mark@ (agents), seed-emma@, seed-lucas@ (buyers) @nestora-demo.com",
  );
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
