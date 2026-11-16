const API_URL = "http://localhost:5000";

// =====================================
// NAILS DESIGN - APPOINTMENTS
// =====================================

// Marrja e rezervimeve nga databaza
async function loadAppointments() {
  const table = document.getElementById("appointments-table");

  try {
    const response = await fetch(`${API_URL}/admin/appointments`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Nuk mund te merren rezervimet.");
    }

    const appointments = await response.json();

    // Statistikat
    document.getElementById("total-bookings").textContent = appointments.length;

    document.getElementById("pending-bookings").textContent =
      appointments.filter((a) => a.status === "pending").length;

    document.getElementById("confirmed-bookings").textContent =
      appointments.filter((a) => a.status === "confirmed").length;

    table.replaceChildren();

    if (appointments.length === 0) {
      const row = table.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 7;
      cell.textContent = "Nuk ka rezervime.";
      return;
    }

    appointments.forEach((appointment) => {
      const row = table.insertRow();

      const values = [
        appointment.full_name,
        appointment.phone,
        appointment.service_name,
        appointment.appointment_date,
        appointment.start_time,
        appointment.status,
      ];

      values.forEach((value) => {
        const cell = row.insertCell();
        cell.textContent = value ?? "";
      });

      const actionsCell = row.insertCell();

      // Butonat shfaqen vetem per rezervimet pending
      if (appointment.status === "pending") {
        const confirmButton = document.createElement("button");
        confirmButton.textContent = "Konfirmo";
        confirmButton.className = "confirm";

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Anulo";
        cancelButton.className = "cancel";

        confirmButton.addEventListener("click", () => {
          updateStatus(appointment.id, "confirmed");
        });

        cancelButton.addEventListener("click", () => {
          updateStatus(appointment.id, "cancelled");
        });

        actionsCell.append(confirmButton, cancelButton);
      } else {
        actionsCell.textContent = "—";
      }
    });
  } catch (error) {
    console.error("Appointments error:", error);
    table.replaceChildren();

    const row = table.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 7;
    cell.textContent = "Gabim gjate ngarkimit te rezervimeve.";
  }
}

// Ndryshimi i statusit ne PostgreSQL
async function updateStatus(appointmentId, status) {
  const action = status === "confirmed" ? "konfirmosh" : "anulosh";

  const approved = window.confirm(
    `A je e sigurt qe deshiron ta ${action} kete rezervim?`,
  );

  if (!approved) return;

  try {
    const response = await fetch(
      `${API_URL}/admin/appointments/${appointmentId}/status`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Ndryshimi deshtoi.");
    }

    await loadAppointments();

    alert(
      status === "confirmed"
        ? "Rezervimi u konfirmua me sukses!"
        : "Rezervimi u anulua me sukses!",
    );
  } catch (error) {
    console.error("Update status error:", error);
    alert(error.message);
  }
}

// =====================================
// NAILS DESIGN - WORKING HOURS
// =====================================

const DAYS = [
  "E diel",
  "E hene",
  "E marte",
  "E merkure",
  "E enjte",
  "E premte",
  "E shtune",
];

async function loadWorkingHours() {
  const table = document.getElementById("working-hours-table");
  const message = document.getElementById("working-hours-message");

  if (!table || !message) return;

  try {
    const response = await fetch(`${API_URL}/working-hours`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Nuk mund te merren oraret.");
    }

    const hours = await response.json();

    table.replaceChildren();

    hours.forEach((day) => {
      const row = table.insertRow();

      // Dita
      const dayCell = row.insertCell();
      dayCell.textContent = DAYS[day.day_of_week];

      // Statusi
      const statusCell = row.insertCell();
      const statusSelect = document.createElement("select");

      statusSelect.add(new Option("Hapur", "true"));
      statusSelect.add(new Option("Mbyllur", "false"));
      statusSelect.value = String(day.is_open);

      statusCell.appendChild(statusSelect);

      // Ora e hapjes
      const startCell = row.insertCell();
      const startInput = document.createElement("input");

      startInput.type = "time";
      startInput.value = day.start_time ? day.start_time.slice(0, 5) : "08:00";

      startCell.appendChild(startInput);

      // Ora e mbylljes
      const endCell = row.insertCell();
      const endInput = document.createElement("input");

      endInput.type = "time";
      endInput.value = day.end_time ? day.end_time.slice(0, 5) : "20:00";

      endCell.appendChild(endInput);

      function updateInputs() {
        const isOpen = statusSelect.value === "true";

        startInput.disabled = !isOpen;
        endInput.disabled = !isOpen;
      }

      statusSelect.addEventListener("change", updateInputs);
      updateInputs();

      // Butoni Ruaj
      const actionCell = row.insertCell();
      const saveButton = document.createElement("button");

      saveButton.textContent = "Ruaj";
      saveButton.className = "save-hours";

      saveButton.addEventListener("click", async () => {
        const isOpen = statusSelect.value === "true";

        const payload = {
          is_open: isOpen,
          start_time: isOpen ? startInput.value : null,
          end_time: isOpen ? endInput.value : null,
        };

        saveButton.disabled = true;
        message.textContent = "Duke ruajtur orarin...";
        message.style.color = "#786d76";

        try {
          const response = await fetch(
            `${API_URL}/admin/working-hours/${day.day_of_week}`,
            {
              method: "PUT",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            },
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || "Orari nuk u ruajt.");
          }

          message.textContent = `${DAYS[day.day_of_week]}: Orari u ruajt me sukses!`;

          message.style.color = "#278052";

          await loadWorkingHours();
        } catch (error) {
          console.error("Save hours error:", error);
          message.textContent = error.message;
          message.style.color = "#b13d5d";
        } finally {
          saveButton.disabled = false;
        }
      });

      actionCell.appendChild(saveButton);
    });
  } catch (error) {
    console.error("Working hours error:", error);
    message.textContent = "Nuk mund te ngarkohen oraret.";
    message.style.color = "#b13d5d";
  }
}

async function logout() {
  const button = document.getElementById("logout-btn");

  button.disabled = true;

  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Dalja nga paneli deshtoi.");
    }

    window.location.replace("login.html");
  } catch (error) {
    console.error("Logout error:", error);
    alert("Nuk u realizua dalja. Provo perseri.");
    button.disabled = false;
  }
}

document.getElementById("logout-btn").addEventListener("click", logout);




async function checkAdminSession() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      window.location.replace("login.html");
      return;
    }

    if (!response.ok) {
      throw new Error("Kontrolli i sesionit deshtoi.");
    }

    // Ngarkojme te dhenat vetem pas verifikimit
    await Promise.all([
      loadAppointments(),
      loadWorkingHours()
    ]);
  } catch (error) {
    console.error("Session error:", error);
    alert("Nuk mund te verifikohet sesioni. Provo perseri.");
  }
}

document.addEventListener("DOMContentLoaded", checkAdminSession);

