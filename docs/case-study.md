# Nestora: a real estate platform with role-based access

**Live demo:** https://nestora-seven-pi.vercel.app/ | **Repository:** https://github.com/ellie-dhm/Nestora.git

## The problem

Property sites serve three very different audiences at once: people looking for a home, agents who manage listings, and staff who keep the platform clean. I wanted to build a small product where each group sees only what it should, and where that is enforced by the server rather than just hidden in the interface. Nestora lets buyers search and contact agents, lets agents manage their own listings and answer inquiries, and gives admins control over users and every listing.

## Tech choices and why

- **React and TypeScript on the front, Express and TypeScript on the back.** Using one language end to end made it easy to keep the shape of the data consistent between the API and the interface.
- **Zustand for session state.** The only truly global state is "who is logged in", and a library like Redux would have been more machinery than the problem needed.
- **zod on both sides.** The form and the API reject the same bad input with the same field-level messages, so the server never has to trust the client.
- **PostgreSQL on Supabase, used only as a hosted database.** Express handles authentication itself, with JWTs stored in httpOnly cookies. That keeps the token out of reach of JavaScript and reduces the damage of an XSS bug.
- **Roles read from the database, not from the token.** Early on, the role lived inside the JWT, so a demoted admin would have kept their powers until the token expired. The middleware now loads the current role on every request, so a change takes effect immediately.
- **Vercel for the client, Render for the API.** Both have free tiers and deploy automatically from the main branch.

The result is three roles, two related resources with full CRUD, validation on every form, loading, empty and error states throughout, and 24 automated tests (16 on the server, 8 on the client).

## Challenge 1: an error the browser hid

When I built the admin panel, the interface showed only "Failed to fetch", and opening the same endpoint in the address bar returned "Not authenticated" even though I was logged in. Nothing in the route code looked wrong.

To isolate the cause, I stopped using the browser. I logged in with a scripted request that kept its cookies, then called the admin endpoint with the same session. The login worked, but the next request still arrived with no cookie, which proved that the problem was on the server and not in my browser or the React code.

The cause was middleware order. I had registered the admin router above the CORS and cookie-parsing middleware, so it never saw the session cookie. Its error responses also lacked CORS headers, which is why the browser reported a network failure instead of the real 401 response. Moving the router below the shared middleware fixed both symptoms.

The lesson I took from it: a vague error in the browser can hide a precise response from the server, and testing the API outside the browser separates the two quickly.

## Challenge 2: cookies across domains

When I deployed, the client (Vercel) and the API (Render) ended up on different domains. That turns the login cookie into a third-party cookie, which browsers such as Brave and Safari block, so login would have failed silently for many visitors.

Instead of weakening the cookie settings, I made the API same-origin. Vercel rewrites every `/api/*` request to the Render service, so the browser only ever talks to one domain and the httpOnly session cookie stays first-party. The fix is a few lines in `vercel.json` and one change to the API client, and it works in every browser I tried.

## What I would do next

Upload images to storage instead of pasting URLs, add charts to the admin overview, and send email notifications when an inquiry is received or answered.
