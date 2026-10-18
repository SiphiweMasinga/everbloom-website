# Everbloom Pty Ltd

A responsive website for Everbloom's beauty services and technology offerings, owned by
Siphiwe Masinga.

## Services

- Hair braiding, eyelash extensions, hair installation, and nail services
- Web development
- Digital skills training for high school learners
- Appointment requests and training enquiries
- An automated client assistant

With no backend configured, the assistant uses built-in answers and enquiry forms clearly
report that online submissions are not enabled. Once configured, the assistant uses Google
Gemini through a Supabase Edge Function; the Gemini API key stays on the server.

## Run locally

Open `index.html` in a web browser. The front end uses plain HTML, CSS, and JavaScript and
does not require a build step.

## Enable online enquiries and AI chat

1. Create a Supabase project.
2. Run [`supabase/migrations/20261018000000_public_enquiries.sql`](./supabase/migrations/20261018000000_public_enquiries.sql)
   in the project's SQL editor. It creates private enquiry and rate-limit tables. Browser
   visitors cannot read or write these tables directly.
3. Deploy the `public-assistant` Edge Function:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy public-assistant
   ```

4. In the Supabase dashboard's Edge Function secrets, configure `GEMINI_API_KEY` (from
   Google AI Studio) and a long, random `RATE_LIMIT_SALT`. Supabase supplies
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Never put the
   service-role key, Gemini key, or salt in website files, GitHub, or a message.
5. Put your project's Supabase URL and **public/publishable** key in [`site-config.js`](./site-config.js).
   The public key is intended for the browser; database access is still restricted to the
   server-side function.
6. Host the site on HTTPS, replace the example contact email in [`index.html`](./index.html),
   and publish a privacy notice describing enquiry storage and that chat questions are
   processed by Google Gemini. Decide an appropriate retention period before collecting
   client details.

The forms request the minimum details needed for follow-up. The training form asks for an
adult contact and does not collect a learner's name; an adult must submit enquiries about
learners under 18. Requests are rate-limited by the Edge Function. The assistant is not a
live human representative, and appointment requests are not confirmations.

## Project files

- `index.html` — site content, forms, and client-assistant interface
- `styles.css` — responsive layout, motion, and visual styling
- `script.js` — interactive navigation, enquiries, and assistant
- `site-config.js` — public Supabase project URL and publishable key
- `supabase/functions/public-assistant/index.ts` — rate-limited enquiry and Gemini API
- `supabase/migrations/` — private request storage and rate limiting

## Before publishing

Keep `site-config.js` limited to public project settings. Never add private credentials,
client data, or an `.env` file to the repository.
