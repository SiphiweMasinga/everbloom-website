# Everbloom Pty Ltd

A responsive website for Everbloom's beauty services and technology offerings, owned by
Siphiwe Masinga.

## Services

- Hair braiding, eyelash extensions, hair installation, and nail services
- Web development
- Digital skills training for high school learners
- Appointment requests and training enquiries
- An automated client assistant

With no backend configured, the assistant uses built-in answers and the booking and training
forms hand the client's details to WhatsApp or email, pre-filled, so requests still reach
Everbloom. Once configured, the assistant uses Google Gemini through a Supabase Edge
Function; the Gemini API key stays on the server.

## How appointment confirmations work

1. A client submits the booking form (name, email, phone, service, date and time, and
   optionally "send updates on WhatsApp").
2. The request is saved and the client immediately receives a "request received" email, and
   a WhatsApp message if they opted in. It is clearly marked as not yet confirmed.
3. The owner (`OWNER_EMAIL`) receives an email with the details and a **Review appointment**
   link to `confirm.html`.
4. On that page the owner chooses **Confirm** or **Decline**. The client is then told
   automatically by email, and on WhatsApp if they opted in.

The review link contains a single-use secret. Only its SHA-256 hash is stored, and a booking
can only be decided once. Keep the owner email private, since anyone holding that link can
confirm or decline the booking.

## Run locally

Open `index.html` in a web browser. The front end uses plain HTML, CSS, and JavaScript and
does not require a build step. Fonts load from Google Fonts and editorial photographs from
Unsplash, so the page needs an internet connection to display those assets.

## Enable online enquiries and AI chat

1. Create a Supabase project.
2. Run [`supabase/migrations/20261018000000_public_enquiries.sql`](./supabase/migrations/20261018000000_public_enquiries.sql)
   and then [`20261018120000_appointment_confirmations.sql`](./supabase/migrations/20261018120000_appointment_confirmations.sql)
   in the project's SQL editor. They create private enquiry and rate-limit tables and add
   appointment times and confirmation status. Browser visitors cannot read or write these
   tables directly.
3. Deploy the `public-assistant` Edge Function:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy public-assistant
   ```

4. In the Supabase dashboard's Edge Function secrets, configure:

   | Secret | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | From Google AI Studio |
   | `RATE_LIMIT_SALT` | A long, random string |
   | `SITE_URL` | The live website address, e.g. `https://everbloom.co.za` |
   | `OWNER_EMAIL` | Where new booking requests are sent, e.g. `masingasiphiwe95@gmail.com` |
   | `RESEND_API_KEY` | From [resend.com](https://resend.com) → API Keys |
   | `EMAIL_FROM` | e.g. `EverBloom <bookings@everbloom.co.za>` on a domain verified in Resend |
   | `WHATSAPP_ACCESS_TOKEN` | Permanent system-user token from Meta Business settings |
   | `WHATSAPP_PHONE_NUMBER_ID` | From WhatsApp → API Setup in the Meta developer app |
   | `WHATSAPP_TEMPLATE_RECEIVED` | Name of the approved "request received" template |
   | `WHATSAPP_TEMPLATE_CONFIRMED` | Name of the approved "confirmed" template |
   | `WHATSAPP_TEMPLATE_DECLINED` | Name of the approved "declined" template |
   | `WHATSAPP_TEMPLATE_LANGUAGE` | Optional, defaults to `en` |

   Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.
   Never put any of these keys or the salt in website files, GitHub, or a message.

   **Email (Resend):** until a domain is verified, Resend only delivers to your own address,
   so verify the business domain before going live.

   **WhatsApp (Meta WhatsApp Cloud API):** create a Meta developer app with the WhatsApp
   product, add and verify the business phone number, then create three **Utility** message
   templates in WhatsApp Manager. Business-initiated WhatsApp messages must use approved
   templates. Suggested wording:

   - Received (`{{1}}` name, `{{2}}` service, `{{3}}` date, `{{4}}` time):
     "Hi {{1}}, thank you for your EverBloom booking request for {{2}} on {{3}} at {{4}}.
     It isn't confirmed yet. We'll confirm shortly."
   - Confirmed (same variables): "Hi {{1}}, your EverBloom appointment for {{2}} on {{3}}
     at {{4}} is confirmed. We look forward to seeing you!"
   - Declined (`{{1}}` name, `{{2}}` service, `{{3}}` date): "Hi {{1}}, sorry, we can't
     take your {{2}} appointment on {{3}}. Please reply to arrange another time."

   Messages are only sent to clients who tick the WhatsApp box. Email and WhatsApp are each
   optional: if either isn't configured, bookings are still saved and the other channel still
   works. If neither is configured, the owner should contact the client directly.
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
live human representative. An appointment is only confirmed when the owner confirms it.

## Project files

- `index.html` — site content, forms, and client-assistant interface
- `styles.css` — responsive layout, motion, and visual styling
- `script.js` — interactive navigation, enquiries, and assistant
- `confirm.html`, `confirm.js` — owner page for confirming or declining a booking
- `site-config.js` — public Supabase project URL and publishable key
- `supabase/functions/public-assistant/index.ts` — rate-limited enquiries, booking
  confirmations by email (Resend) and WhatsApp (Meta Cloud API), and the Gemini assistant
- `supabase/migrations/` — private request storage and rate limiting

## Before publishing

Keep `site-config.js` limited to public project settings. Never add private credentials,
client data, or an `.env` file to the repository.
