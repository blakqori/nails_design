
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("services-grid");
  const filters = document.getElementById("services-filters");

  if (!grid || !filters) return;

  const API_URL =
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
      ? "http://localhost:5000"
      : "/api";

  let services = [];
  let selectedCategory = "Te gjitha";

  function renderFilters() {
    const categories = [
      "Te gjitha",
      ...new Set(services.map(s => s.category).filter(Boolean))
    ];

    filters.replaceChildren();

    categories.forEach(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "services-filter";
      button.textContent = category;

      if (category === selectedCategory) {
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.setAttribute("aria-pressed", "false");
      }

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

    const visibleServices = services.filter(service =>
      selectedCategory === "Te gjitha" ||
      service.category === selectedCategory
    );

    if (!visibleServices.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nuk ka sherbime ne kete kategori.";
      grid.appendChild(empty);
      return;
    }

    visibleServices.forEach(service => {
      const card = document.createElement("article");
      card.className = "service-card";

      if (service.image_url) {
        const image = document.createElement("img");
        image.className = "service-card-image";
        image.src = service.image_url;
        image.alt = service.name;
        image.loading = "lazy";
        card.appendChild(image);
      }

      const title = document.createElement("h3");
      title.textContent = service.name;

      const duration = document.createElement("p");
      duration.className = "service-duration";
      duration.textContent =
        `${service.duration_minutes} min`;

      const price = document.createElement("span");
      price.className = "price";
      price.textContent = `${Number(service.price)}€`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "service-book-button";
      button.textContent = "Rezervo termin";

      button.addEventListener("click", () => {
        const select = document.getElementById("booking-service");
        const booking = document.getElementById("booking");

        if (!select || !booking) return;

        select.value = String(service.id);
        select.dispatchEvent(
          new Event("change", { bubbles: true })
        );

        booking.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });

      card.append(title, duration, price, button);
      grid.appendChild(card);
    });
  }

  async function loadServices() {
    try {
      const response = await fetch(`${API_URL}/services`);

      if (!response.ok) {
        throw new Error("Sherbimet nuk u ngarkuan.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Format i pavlefshem i sherbimeve.");
      }

      services = data.filter(s => s.is_active === true);

      renderFilters();
      renderServices();
    } catch (error) {
      console.error("Gabim gjate ngarkimit:", error);
      grid.textContent =
        "Sherbimet nuk mund te ngarkohen. Provo perseri.";
    }
  }

  loadServices();
});
