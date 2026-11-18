document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("services-grid");
  const filters = document.getElementById("services-filters");
  if (!grid || !filters) return;

  const API_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5000" : "/api";
  const serviceImages = {
    1: "/images/manikyrklasik.jpg", 2: "/images/manikyrgell.jpg",
    3: "/images/nails3.jpg", 4: "/images/nails4.jpg",
    5: "/images/nailart.jpg", 6: "/images/trajtimdheforcim.jpg",
  };
  const imageFor = (s) => s.image_url
    ? `/${String(s.image_url).replace(/^\/+/, "")}`
    : serviceImages[s.id] || "";
  let services = [];
  let selectedCategory = "Te gjitha";

  function renderFilters() {
    const categories = ["Te gjitha", ...new Set(services.map(s => s.category).filter(Boolean))];
    filters.replaceChildren();
    categories.forEach(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "services-filter";
      button.textContent = category;
      button.classList.toggle("active", category === selectedCategory);
      button.setAttribute("aria-pressed", String(category === selectedCategory));
      button.addEventListener("click", () => {
        selectedCategory = category;
        renderFilters();
        renderServices();
      });
      filters.appendChild(button);
    });
  }

  function renderServices() {
    grid.replaceChildren();
    const visibleServices = services.filter(s => selectedCategory === "Te gjitha" || s.category === selectedCategory);
    if (!visibleServices.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nuk ka sherbime ne kete kategori.";
      grid.appendChild(empty);
      return;
    }
    visibleServices.forEach(s => {
      const card = document.createElement("article");
      card.className = "service-card";
      const imageUrl = imageFor(s);
      if (imageUrl) {
        const img = document.createElement("img");
        img.className = "service-card-image";
        img.src = imageUrl;
        img.alt = s.name;
        img.loading = "lazy";
        card.appendChild(img);
      }
      const title = document.createElement("h3");
      title.textContent = s.name;
      const duration = document.createElement("p");
      duration.className = "service-duration";
      duration.textContent = `${s.duration_minutes} min`;
      const price = document.createElement("span");
      price.className = "price";
      price.textContent = `${Number(s.price)}€`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "service-book-button";
      button.textContent = "Rezervo termin";
      button.addEventListener("click", () => {
        const select = document.getElementById("booking-service");
        const booking = document.getElementById("booking");
        if (!select || !booking) return;
        select.value = String(s.id);
        select.dispatchEvent(new Event("change", { bubbles: true }));
        booking.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      card.append(title, duration, price, button);
      grid.appendChild(card);
    });
  }

  async function loadServices() {
    try {
      const response = await fetch(`${API_URL}/services`);
      if (!response.ok) throw new Error(`Services HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Format i pavlefshem i sherbimeve.");
      services = data.filter(s => s.is_active !== false);
      renderFilters();
      renderServices();
    } catch (error) {
      console.error("Gabim gjate ngarkimit:", error);
      grid.textContent = "Sherbimet nuk mund te ngarkohen. Provo perseri.";
    }
  }
  loadServices();
});
