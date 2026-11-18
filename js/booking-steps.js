/* ==========================================
   NAILS DESIGN - BOOKING STEPS
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  const steps = [...document.querySelectorAll(".booking-step")];
  const progress = [...document.querySelectorAll(".booking-progress span")];

  const prevButton = document.getElementById("booking-prev");
  const nextButton = document.getElementById("booking-next");
  const resetButton = document.getElementById("booking-reset");
  const submitButton = form?.querySelector('button[type="submit"]');

  const service = document.getElementById("booking-service");
  const date = document.getElementById("booking-date");
  const time = document.getElementById("booking-time");
  const name = document.getElementById("booking-name");
  const phone = document.getElementById("booking-phone");
  const email = document.getElementById("booking-email");

  const summary = document.getElementById("booking-summary-content");
  const review = document.getElementById("booking-review");
  const message = document.getElementById("booking-message");

  if (
    !form ||
    steps.length !== 4 ||
    progress.length !== 4 ||
    !prevButton ||
    !nextButton ||
    !resetButton ||
    !submitButton ||
    !service ||
    !date ||
    !time ||
    !name ||
    !phone ||
    !email ||
    !summary ||
    !review ||
    !message
  ) {
    return;
  }

  let currentStep = 0;

  function selectedService() {
    return service.selectedOptions[0]?.textContent.trim() || "";
  }

  function updateSummary() {
    const rows = [
      ["Shërbimi", service.value ? selectedService() : "Pa zgjedhur"],
      ["Data", date.value || "Pa zgjedhur"],
      ["Ora", time.value || "Pa zgjedhur"],
      ["Emri", name.value.trim() || "Pa plotësuar"],
      ["Telefoni", phone.value.trim() || "Pa plotësuar"],
      ["Email", email.value.trim() || "Nuk është dhënë"],
    ];

    function renderRows(container) {
      container.replaceChildren();

      rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        row.className = "booking-summary-row";

        const title = document.createElement("strong");
        title.textContent = label + ": ";

        const detail = document.createElement("span");
        detail.textContent = value;

        row.append(title, detail);
        container.appendChild(row);
      });
    }

    renderRows(summary);
    renderRows(review);
  }

  function showStep(index) {
    currentStep = index;

    steps.forEach((step, i) => {
      step.hidden = i !== index;
    });

    progress.forEach((item, i) => {
      item.classList.toggle("active", i === index);
    });

    prevButton.hidden = index === 0;
    nextButton.hidden = index === 3;
    submitButton.hidden = index !== 3;

    message.textContent = "";
    updateSummary();
  }

  function validateStep() {
    let fields = [];

    if (currentStep === 0) {
      fields = [service];
    } else if (currentStep === 1) {
      fields = [date, time];
    } else if (currentStep === 2) {
      fields = [name, phone, email];
    }

    for (const field of fields) {
      if (!field.reportValidity()) {
        return false;
      }
    }

    return true;
  }

  nextButton.addEventListener("click", () => {
    if (!validateStep()) return;

    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1);
    }
  });

  prevButton.addEventListener("click", () => {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  });

  resetButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "A dëshiron ta fillosh rezervimin nga e para?",
    );

    if (!confirmed) return;

    form.reset();

    // Njofto booking.js që të rifreskojë oraret.
    service.dispatchEvent(new Event("change", { bubbles: true }));

    showStep(0);
  });

  form.addEventListener("input", updateSummary);
  form.addEventListener("change", updateSummary);
  form.addEventListener("booking:success", () => {
    showStep(0);
    updateSummary();

    message.textContent =
      "Rezervimi u regjistrua me sukses! Ju lutemi prisni konfirmimin.";
    message.style.color = "#278052";
  });

  showStep(0);

  // Krijimi i kartave nga sherbimet e ngarkuara
  const serviceCards = document.getElementById("booking-service-cards");

  async function renderServiceCards() {
    if (!serviceCards) return;

    // Ruajme sherbimin e zgjedhur.
    const selectedId = service.value;

    try {
      const API_URL = ["localhost", "127.0.0.1"].includes(
        window.location.hostname,
      )
        ? "http://localhost:5000"
        : "/api";

      const response = await fetch(`${API_URL}/services`);

      if (!response.ok) {
        throw new Error("Sherbimet nuk u ngarkuan.");
      }

      const services = await response.json();

      serviceCards.replaceChildren();

      services
        .filter((item) => item.is_active === true)
        .forEach((item) => {
          const card = document.createElement("button");
          card.type = "button";
          card.className = "booking-service-card";

          const isSelected = selectedId === String(item.id);

          card.classList.toggle("selected", isSelected);
          card.setAttribute("aria-pressed", String(isSelected));

          // FOTO NGA DATABAZA
          if (item.image_url) {
            const image = document.createElement("img");
            image.src = item.image_url;
            image.alt = item.name;
            image.className = "booking-service-card-image";
            image.loading = "lazy";
            card.appendChild(image);
          }

          // EMRI
          const name = document.createElement("span");
          name.className = "booking-service-card-name";
          name.textContent = item.name;

          // KOHEZGJATJA DHE CMIMI
          const details = document.createElement("span");
          details.className = "booking-service-card-details";

          const duration = document.createElement("span");
          duration.textContent = `${item.duration_minutes} min`;

          const price = document.createElement("strong");
          price.className = "booking-service-card-price";
          price.textContent = `${Number(item.price)}€`;

          details.append(duration, price);

          // SHENJA E ZGJEDHJES
          const check = document.createElement("span");
          check.className = "booking-service-card-check";
          check.textContent = "✓";

          card.append(name, details, check);

          card.addEventListener("click", () => {
            service.value = String(item.id);

            service.dispatchEvent(new Event("change", { bubbles: true }));
          });

          serviceCards.appendChild(card);
        });
    } catch (error) {
      console.error("Gabim gjate ngarkimit te sherbimeve:", error);
    }
  }

  // booking.js ngarkon sherbimet ne menyre asinkrone.
  // Observer-i reagon kur shtohen opsionet.
  const serviceObserver = new MutationObserver(renderServiceCards);

  serviceObserver.observe(service, {
    childList: true,
  });

  service.addEventListener("change", renderServiceCards);

  renderServiceCards();

  // ==========================================
  // KALENDARI DHE ORARET
  // ==========================================

  const calendar = document.getElementById("booking-calendar");
  const timeSlots = document.getElementById("booking-time-slots");

  if (calendar && timeSlots) {
    const months = [
      "Janar",
      "Shkurt",
      "Mars",
      "Prill",
      "Maj",
      "Qershor",
      "Korrik",
      "Gusht",
      "Shtator",
      "Tetor",
      "Nëntor",
      "Dhjetor",
    ];

    const weekdays = ["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Die"];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let displayedYear = today.getFullYear();
    let displayedMonth = today.getMonth();

    function formatDate(year, month, day) {
      return (
        year +
        "-" +
        String(month + 1).padStart(2, "0") +
        "-" +
        String(day).padStart(2, "0")
      );
    }

    function renderCalendar() {
      calendar.replaceChildren();

      const header = document.createElement("div");
      header.className = "booking-calendar-header";

      const title = document.createElement("strong");
      title.className = "booking-calendar-title";
      title.textContent = `${months[displayedMonth]} ${displayedYear}`;

      const navigation = document.createElement("div");
      navigation.className = "booking-calendar-nav";

      const previous = document.createElement("button");
      previous.type = "button";
      previous.textContent = "‹";
      previous.setAttribute("aria-label", "Muaji paraprak");

      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "›";
      next.setAttribute("aria-label", "Muaji tjetër");

      previous.disabled =
        displayedYear === today.getFullYear() &&
        displayedMonth === today.getMonth();

      previous.addEventListener("click", () => {
        if (previous.disabled) return;

        const newMonth = new Date(displayedYear, displayedMonth - 1, 1);

        displayedYear = newMonth.getFullYear();
        displayedMonth = newMonth.getMonth();

        renderCalendar();
      });

      next.addEventListener("click", () => {
        const newMonth = new Date(displayedYear, displayedMonth + 1, 1);

        displayedYear = newMonth.getFullYear();
        displayedMonth = newMonth.getMonth();

        renderCalendar();
      });

      navigation.append(previous, next);
      header.append(title, navigation);
      calendar.appendChild(header);

      const weekdayRow = document.createElement("div");
      weekdayRow.className = "booking-calendar-weekdays";

      weekdays.forEach((day) => {
        const item = document.createElement("span");
        item.textContent = day;
        weekdayRow.appendChild(item);
      });

      calendar.appendChild(weekdayRow);

      const daysGrid = document.createElement("div");
      daysGrid.className = "booking-calendar-days";

      const firstDay = new Date(displayedYear, displayedMonth, 1);

      const offset = (firstDay.getDay() + 6) % 7;

      for (let i = 0; i < offset; i++) {
        daysGrid.appendChild(document.createElement("span"));
      }

      const daysInMonth = new Date(
        displayedYear,
        displayedMonth + 1,
        0,
      ).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "booking-calendar-day";
        button.textContent = day;

        const currentDate = new Date(displayedYear, displayedMonth, day);

        const dateValue = formatDate(displayedYear, displayedMonth, day);

        // Nuk lejojmë data të kaluara.
        // E shtuna është ditë pushimi.
        button.disabled = currentDate < today || currentDate.getDay() === 6;

        if (date.value === dateValue) {
          button.classList.add("selected");
        }

        button.addEventListener("click", () => {
          if (button.disabled) return;

          date.value = dateValue;

          // booking.js e dëgjon këtë event dhe merr
          // oraret e lira nga backend-i.
          date.dispatchEvent(new Event("change", { bubbles: true }));

          renderCalendar();
          renderTimeSlots();
        });

        daysGrid.appendChild(button);
      }

      calendar.appendChild(daysGrid);
    }

    function renderTimeSlots() {
      timeSlots.replaceChildren();

      const options = [...time.options].filter(
        (option) => option.value && !option.disabled,
      );

      if (!date.value || !service.value) {
        const empty = document.createElement("p");
        empty.className = "booking-time-empty";
        empty.textContent = "Zgjidh shërbimin dhe datën.";
        timeSlots.appendChild(empty);
        return;
      }

      if (!options.length) {
        const empty = document.createElement("p");
        empty.className = "booking-time-empty";
        empty.textContent = time.disabled
          ? "Duke pritur oraret e lira..."
          : "Nuk ka orare të lira për këtë datë.";

        timeSlots.appendChild(empty);
        return;
      }

      options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "booking-time-slot";
        button.textContent = option.textContent;

        if (time.value === option.value) {
          button.classList.add("selected");
        }

        button.addEventListener("click", () => {
          time.value = option.value;

          time.dispatchEvent(new Event("change", { bubbles: true }));

          renderTimeSlots();
        });

        timeSlots.appendChild(button);
      });
    }

    // booking.js i shton oraret në select pas përgjigjes së API-së.
    const timeObserver = new MutationObserver(renderTimeSlots);

    timeObserver.observe(time, {
      childList: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });

    date.addEventListener("change", renderCalendar);
    date.addEventListener("change", renderTimeSlots);
    time.addEventListener("change", renderTimeSlots);
    service.addEventListener("change", renderTimeSlots);

    form.addEventListener("booking:success", () => {
      displayedYear = today.getFullYear();
      displayedMonth = today.getMonth();

      renderCalendar();
      renderTimeSlots();
    });

    resetButton.addEventListener("click", () => {
      queueMicrotask(() => {
        renderCalendar();
        renderTimeSlots();
      });
    });

    renderCalendar();
    renderTimeSlots();
  }
});
