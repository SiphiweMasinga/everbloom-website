const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
  siteNav.classList.toggle("is-open", !isExpanded);
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    siteNav.classList.remove("is-open");
  }
});

document.querySelector("#year").textContent = new Date().getFullYear();

const siteConfig = window.EVERBLOOM_CONFIG ?? {};
const supabaseUrl = siteConfig.supabaseUrl?.replace(/\/$/, "");
const supabasePublicKey = siteConfig.supabasePublicKey;
const isBackendConfigured =
  typeof supabaseUrl === "string" &&
  supabaseUrl.startsWith("https://") &&
  typeof supabasePublicKey === "string" &&
  supabasePublicKey.length > 20 &&
  !supabasePublicKey.includes("YOUR_");
const assistantEndpoint =
  isBackendConfigured && `${supabaseUrl}/functions/v1/public-assistant`;

function localDateString(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const bookingDate = document.querySelector('[data-enquiry-form="booking"] [name="requested_date"]');
const today = new Date();
bookingDate.min = localDateString(today);

const revealElements = document.querySelectorAll(
  ".hero-copy, .hero-art, .intro, .principles, .offerings, .enquiries, .manifesto, .contact",
);

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealElements.forEach((element) => element.classList.add("reveal"));
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  revealElements.forEach((element) => revealObserver.observe(element));
}

const sectionLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const observedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const navigationObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

      if (!visibleEntry) return;

      sectionLinks.forEach((link) => {
        if (link.hash === `#${visibleEntry.target.id}`) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.6] },
  );
  observedSections.forEach((section) => navigationObserver.observe(section));
}

function setFormStatus(form, message, state) {
  const status = form.querySelector(".form-status");
  status.textContent = message;
  status.dataset.state = state;
}

async function sendEnquiry(form, submitButton) {
  if (!isBackendConfigured || !assistantEndpoint) {
    setFormStatus(
      form,
      "Online enquiries aren’t connected yet. The business owner needs to configure the secure submission service before requests can be sent.",
      "error",
    );
    return;
  }

  submitButton.disabled = true;
  setFormStatus(form, "Sending your enquiry securely…", "pending");

  const fields = Object.fromEntries(new FormData(form));
  const payload = {
    action: "enquiry",
    kind: form.dataset.enquiryForm,
    name: String(fields.name ?? "").trim(),
    email: String(fields.email ?? "").trim(),
    phone: String(fields.phone ?? "").trim() || null,
    beauty_service: fields.beauty_service || null,
    requested_date: fields.requested_date || null,
    age_group: fields.age_group || null,
    consent: form.elements.consent.checked,
  };

  try {
    const response = await fetch(assistantEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabasePublicKey,
        Authorization: `Bearer ${supabasePublicKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error ?? "We couldn’t send your enquiry right now. Please try again later.",
      );
    }

    form.reset();
    bookingDate.min = localDateString(new Date());
    setFormStatus(
      form,
      "Thank you. Your enquiry has been received; the Everbloom team will follow up.",
      "success",
    );
  } catch (error) {
    setFormStatus(form, error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

document.querySelectorAll("[data-enquiry-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    await sendEnquiry(form, form.querySelector('[type="submit"]'));
  });
});

const chatToggle = document.querySelector(".chat-toggle");
const chatPanel = document.querySelector("#chat-panel");
const chatClose = document.querySelector(".chat-close");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatMessages = document.querySelector("#chat-messages");
const chatDisclaimer = document.querySelector(".chat-disclaimer");

chatDisclaimer.textContent = isBackendConfigured
  ? "AI-assisted by Google Gemini · Don’t share sensitive information."
  : "Preview answers · AI chat isn’t connected yet. Don’t share sensitive information.";

const chatAnswers = [
  {
    keywords: ["beauty", "braid", "lash", "eyelash", "hair", "nail"],
    answer:
      "Our beauty services include hair braiding, eyelash extensions, hair installation, and nail services. Email us to ask about an appointment.",
  },
  {
    keywords: ["train", "learner", "school", "digital", "course", "student"],
    answer:
      "Everbloom offers digital skills training for high school learners, as well as web development. Email us to ask about training details.",
  },
  {
    keywords: ["web", "website", "develop", "technology"],
    answer:
      "Our technology focus includes web development and digital skills training for high school learners. Get in touch by email to discuss a project.",
  },
  {
    keywords: ["owner", "owned", "founder", "siphiwe"],
    answer: "Everbloom Pty Ltd is owned by Siphiwe Masinga.",
  },
  {
    keywords: ["contact", "email", "appointment", "book", "booking", "price", "cost"],
    answer:
      "For appointments, pricing, or personal assistance, email Everbloom at hello@everbloom.com.",
  },
  {
    keywords: ["mission", "vision", "purpose"],
    answer:
      "Our mission is to offer thoughtful beauty services and make technology more accessible. Our vision is for people to flourish through confidence, creativity, and digital opportunity.",
  },
];

function addChatMessage(text, sender) {
  const message = document.createElement("p");
  message.className = `chat-message chat-message-${sender}`;
  message.textContent = text;
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function answerChat(question) {
  const normalizedQuestion = question.toLowerCase();
  const match = chatAnswers.find(({ keywords }) =>
    keywords.some((keyword) => normalizedQuestion.includes(keyword)),
  );

  if (/\b(hi|hello|hey)\b/.test(normalizedQuestion)) {
    return "Hello! I can help with beauty services, digital training, or getting in touch.";
  }

  return (
    match?.answer ??
    "I’m not sure about that yet. Please email hello@everbloom.com and the Everbloom team can help."
  );
}

async function getAssistantAnswer(question) {
  if (!isBackendConfigured || !assistantEndpoint) {
    return answerChat(question);
  }

  const response = await fetch(assistantEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublicKey,
      Authorization: `Bearer ${supabasePublicKey}`,
    },
    body: JSON.stringify({ action: "chat", message: question }),
  });

  if (!response.ok) {
    throw new Error("The AI assistant is temporarily unavailable. Please try again later.");
  }

  const result = await response.json();
  if (typeof result.reply !== "string" || !result.reply.trim()) {
    throw new Error("The assistant returned an empty response. Please try again.");
  }
  return result.reply;
}

async function submitChatQuestion(question) {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion || trimmedQuestion.length > 500) return;

  addChatMessage(trimmedQuestion, "visitor");
  const replyMessage = document.createElement("p");
  replyMessage.className = "chat-message chat-message-assistant";
  replyMessage.setAttribute("aria-live", "polite");
  replyMessage.textContent = "One moment…";
  chatMessages.append(replyMessage);

  try {
    replyMessage.textContent = await getAssistantAnswer(trimmedQuestion);
  } catch (error) {
    replyMessage.textContent = error.message;
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatToggle.addEventListener("click", () => {
  const isOpen = chatToggle.getAttribute("aria-expanded") === "true";
  chatToggle.setAttribute("aria-expanded", String(!isOpen));
  chatToggle.setAttribute(
    "aria-label",
    isOpen ? "Open Everbloom client assistant" : "Close Everbloom client assistant",
  );
  chatPanel.hidden = isOpen;

  if (!isOpen) chatInput.focus();
});

chatClose.addEventListener("click", () => {
  chatPanel.hidden = true;
  chatToggle.setAttribute("aria-expanded", "false");
  chatToggle.setAttribute("aria-label", "Open Everbloom client assistant");
  chatToggle.focus();
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!chatForm.reportValidity()) return;
  submitChatQuestion(chatInput.value);
  chatInput.value = "";
  chatInput.focus();
});

document.querySelector(".chat-suggestions").addEventListener("click", (event) => {
  const suggestion = event.target.closest("[data-chat-question]");
  if (suggestion) submitChatQuestion(suggestion.dataset.chatQuestion);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !chatPanel.hidden) chatClose.click();
});
