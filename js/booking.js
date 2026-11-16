
/* ==========================================
   NAILS DESIGN - BOOKING SYSTEM
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://localhost:5000";

  // Elementet e formularit
  const form = document.getElementById("booking-form");
  const serviceSelect = document.getElementById("booking-service");
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("booking-time");
  const nameInput = document.getElementById("booking-name");
  const phoneInput = document.getElementById("booking-phone");
  const emailInput = document.getElementById("booking-email");
  const message = document.getElementById("booking-message");

  if (
    !form ||
    !serviceSelect ||
    !dateInput ||
    !timeSelect ||
    !nameInput ||
    !phoneInput ||
    !emailInput ||
    !message
  ) {
    console.error("Booking form elements not found.");
    return;
  }

  const submitButton = form.querySelector(
    'button[type="submit"]'
  );

  // Data lokale ne formatin YYYY-MM-DD
  function getLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Mos lejo zgjedhjen e datave te kaluara
  dateInput.min = getLocalDate(new Date());

  // Mesazhet per klientin
  function showMessage(text, success = false) {
    message.textContent = text;
    message.style.color = success ? "#278052" : "#b13d5d";
  }

  // Pastrimi i listes se oreve
  function resetTimes(text = "Se pari zgjidh sherbimin dhe daten") {
    timeSelect.replaceChildren(new Option(text, ""));
    timeSelect.disabled = true;
  }

  // ==========================================
  // 1. NGARKIMI I SHERBIMEVE
  // ==========================================

  async function loadServices() {
    try {
      const response = await fetch(`${API_URL}/services`);

      if (!response.ok) {
        throw new Error("Failed to load services.");
      }

      const services = await response.json();

      serviceSelect.replaceChildren(
        new Option("Zgjidh sherbimin", "")
      );

      services.forEach((service) => {
        const option = new Option(
          `${service.name} - ${service.price}€ (${service.duration_minutes} min)`,
          String(service.id)
        );

        serviceSelect.add(option);
      });

      console.log("Services loaded successfully:", services);
    } catch (error) {
      console.error("Error loading services:", error);

      showMessage(
        "Sherbimet nuk mund te ngarkohen. Kontrollo lidhjen me serverin."
      );
    }
  }

  // ==========================================
  // 2. NGARKIMI I TERMINEVE TE LIRA
  // ==========================================

  let requestNumber = 0;

  async function loadAvailableSlots() {
    const currentRequest = ++requestNumber;

    resetTimes();
    showMessage("");

    const serviceId = serviceSelect.value;
    const selectedDate = dateInput.value;

    if (!serviceId || !selectedDate) {
      return;
    }

    if (selectedDate < getLocalDate(new Date())) {
      showMessage("Nuk mund te zgjedhesh date te kaluar.");
      return;
    }

    resetTimes("Duke ngarkuar terminet...");

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        service_id: serviceId
      });

      const response = await fetch(
        `${API_URL}/available-slots?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to load available slots.");
      }

      const data = await response.json();

      if (currentRequest !== requestNumber) {
        return;
      }

      const now = new Date();
      const today = getLocalDate(now);

      const availableSlots = (
        data.availableSlots || []
      ).filter((slot) => {
        if (selectedDate > today) {
          return true;
        }

        if (selectedDate < today) {
          return false;
        }

        const [hours, minutes] = slot.split(":").map(Number);

        const slotMinutes = hours * 60 + minutes;
        const currentMinutes =
          now.getHours() * 60 + now.getMinutes();

        return slotMinutes > currentMinutes;
      });

      if (availableSlots.length === 0) {
        resetTimes("Nuk ka termine te lira");
        return;
      }

      timeSelect.replaceChildren(
        new Option("Zgjidh oren", "")
      );

      availableSlots.forEach((slot) => {
        timeSelect.add(new Option(slot, slot));
      });

      timeSelect.disabled = false;
    } catch (error) {
      if (currentRequest !== requestNumber) {
        return;
      }

      console.error("Error loading slots:", error);

      resetTimes("Terminet nuk mund te ngarkohen");

      showMessage(
        "Nuk mund te ngarkohen terminet. Provo perseri."
      );
    }
  }

  // Kur ndryshon sherbimi ose data
  serviceSelect.addEventListener(
    "change",
    loadAvailableSlots
  );

  dateInput.addEventListener(
    "change",
    loadAvailableSlots
  );

  // ==========================================
  // 3. RUAJTJA E REZERVIMIT
  // ==========================================

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const bookingData = {
      full_name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim() || null,
      service_id: Number(serviceSelect.value),
      appointment_date: dateInput.value,
      start_time: timeSelect.value
    };

    if (!bookingData.full_name || !bookingData.phone) {
      showMessage("Ploteso emrin dhe numrin e telefonit.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    showMessage("Duke ruajtur rezervimin...");

    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          await loadAvailableSlots();

          showMessage(
            "Ky termin eshte zene. Zgjidh nje ore tjeter."
          );
        } else {
          showMessage(
            result.message || "Rezervimi deshtoi."
          );
        }

        return;
      }

      // Rezervimi u ruajt me sukses
      form.reset();

      dateInput.min = getLocalDate(new Date());

      resetTimes();

      showMessage(
        "Rezervimi u regjistrua me sukses! Ju lutemi prisni konfirmimin.",
        true
      );

      console.log(
        "Appointment created successfully:",
        result
      );
    } catch (error) {
      console.error("Booking error:", error);

      showMessage(
        "Nuk mund te lidhemi me serverin. Provo perseri."
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  // ==========================================
  // 4. NISJA E SISTEMIT
  // ==========================================

  loadServices();
});
