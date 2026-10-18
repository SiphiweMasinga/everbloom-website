const siteConfig = window.EVERBLOOM_CONFIG ?? {};
const supabaseUrl = siteConfig.supabaseUrl?.replace(/\/$/, "");
const supabasePublicKey = siteConfig.supabasePublicKey;
const endpoint = supabaseUrl && `${supabaseUrl}/functions/v1/public-assistant`;

const statusElement = document.querySelector(".confirm-status");
const detailsElement = document.querySelector(".confirm-details");
const actionsElement = document.querySelector(".confirm-actions");

// The id and token live in the URL fragment so they are never sent to the web host.
const params = new URLSearchParams(window.location.hash.slice(1));
const bookingId = params.get("id") ?? "";
const bookingToken = params.get("token") ?? "";

const statusLabels = {
  pending: "Waiting for your decision.",
  confirmed: "This appointment is confirmed.",
  declined: "This appointment was declined.",
};

function setStatus(message, state) {
  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function showBooking(booking) {
  const values = {
    name: booking.name,
    service: booking.service,
    date: booking.date,
    time: booking.time,
    email: booking.email,
    phone: booking.phone ?? "—",
    whatsapp: booking.whatsapp_opt_in ? "Yes" : "No",
  };
  Object.entries(values).forEach(([field, value]) => {
    detailsElement.querySelector(`[data-field="${field}"]`).textContent = value;
  });
  detailsElement.hidden = false;
  actionsElement.hidden = booking.status !== "pending";
}

async function callBookingService(body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublicKey,
      Authorization: `Bearer ${supabasePublicKey}`,
    },
    body: JSON.stringify({ ...body, id: bookingId, token: bookingToken }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "The booking service is unavailable.");
  return result;
}

async function loadBooking() {
  if (!endpoint || !supabasePublicKey) {
    setStatus("The booking service isn’t configured in site-config.js yet.", "error");
    return;
  }
  if (!bookingId || !bookingToken) {
    setStatus("This link is incomplete. Please open it directly from the booking email.", "error");
    return;
  }

  try {
    const { booking } = await callBookingService({ action: "booking_lookup" });
    showBooking(booking);
    setStatus(statusLabels[booking.status], booking.status === "pending" ? "pending" : "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

actionsElement.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-decision]");
  if (!button) return;

  const decision = button.dataset.decision;
  if (decision === "declined" && !window.confirm("Decline this appointment request?")) return;

  actionsElement.querySelectorAll("button").forEach((item) => (item.disabled = true));
  setStatus(decision === "confirmed" ? "Confirming…" : "Declining…", "pending");

  try {
    const { booking, delivered } = await callBookingService({
      action: "booking_decision",
      decision,
    });
    showBooking(booking);
    const channels = [delivered?.email && "email", delivered?.whatsapp && "WhatsApp"].filter(Boolean);
    const notice = channels.length
      ? ` The client has been notified by ${channels.join(" and ")}.`
      : " The automatic notification could not be sent — please contact the client directly.";
    setStatus(statusLabels[booking.status] + notice, channels.length ? "success" : "error");
  } catch (error) {
    setStatus(error.message, "error");
    actionsElement.querySelectorAll("button").forEach((item) => (item.disabled = false));
  }
});

loadBooking();
