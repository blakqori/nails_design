const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);

const createAuthRouter = require("./routes/authRoutes");
const createRequireAdmin = require("./middleware/requireAdmin");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://nails-design-beta.vercel.app",
    ],
    credentials: true,
  }),
);

app.use(express.json());

// Kontrolli i origjines per kerkesat administrative
const allowedOrigin = "http://localhost:5500";

app.use((req, res, next) => {
  const protectedMethods = ["POST", "PUT", "PATCH", "DELETE"];

  const isAdminAction =
    req.path.startsWith("/admin/") || req.path === "/auth/logout";

  if (!protectedMethods.includes(req.method) || !isAdminAction) {
    return next();
  }

  const origin = req.get("Origin");

  if (origin !== allowedOrigin) {
    return res.status(403).json({
      message: "Kerkesa administrative nuk lejohet nga kjo faqe.",
    });
  }

  next();
});

// Lidhja me PostgreSQL
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
);

// Sesioni i administratorit
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    name: "nails.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2,
    },
  }),
);

// Login dhe Logout
app.use("/auth", createAuthRouter(pool));

// Mbrojtja e API-ve administrative
const requireAdmin = createRequireAdmin(pool);
app.use("/admin", requireAdmin);

// Testimi i API
app.get("/", (req, res) => {
  res.json({
    message: "Nails Design API is running!",
  });
});

// Testimi i databazes
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time",
    );

    res.json({
      success: true,
      message: "Database connected successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed!",
    });
  }
});

// Marrja e sherbimeve
app.get("/services", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM services ORDER BY id");

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching services:", error);

    res.status(500).json({
      message: "Failed to fetch services",
    });
  }
});

// Marrja e orarit te punes
app.get("/working-hours", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT day_of_week, start_time, end_time, is_open
       FROM working_hours
       ORDER BY day_of_week`,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching working hours:", error);

    res.status(500).json({
      message: "Failed to fetch working hours",
    });
  }
});

// Funksione ndihmese
function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes) {
  return (
    String(Math.floor(minutes / 60)).padStart(2, "0") +
    ":" +
    String(minutes % 60).padStart(2, "0")
  );
}

function parseDate(dateString) {
  if (
    typeof dateString !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    return null;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

// Marrja e termineve te lira
app.get("/available-slots", async (req, res) => {
  try {
    const { date, service_id } = req.query;

    const selectedDate = parseDate(date);
    const serviceId = Number(service_id);

    if (!selectedDate || !Number.isSafeInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        message: "Invalid date or service.",
      });
    }

    const service = await pool.query(
      "SELECT duration_minutes FROM services WHERE id = $1",
      [serviceId],
    );

    if (!service.rows.length) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    const duration = Number(service.rows[0].duration_minutes);
    const dayOfWeek = selectedDate.getUTCDay();

    const hours = await pool.query(
      `SELECT start_time, end_time, is_open
       FROM working_hours
       WHERE day_of_week = $1`,
      [dayOfWeek],
    );

    if (!hours.rows.length || !hours.rows[0].is_open) {
      return res.json({ availableSlots: [] });
    }

    const { start_time, end_time } = hours.rows[0];

    const bookings = await pool.query(
      `SELECT start_time, end_time
       FROM appointments
       WHERE appointment_date = $1
         AND status IN ('pending', 'confirmed')`,
      [date],
    );

    const slots = [];

    for (
      let start = toMinutes(start_time);
      start + duration <= toMinutes(end_time);
      start += 30
    ) {
      const end = start + duration;

      const overlaps = bookings.rows.some((booking) => {
        return (
          start < toMinutes(booking.end_time) &&
          end > toMinutes(booking.start_time)
        );
      });

      if (!overlaps) {
        slots.push(toTime(start));
      }
    }

    res.json({ availableSlots: slots });
  } catch (error) {
    console.error("Error fetching available slots:", error);

    res.status(500).json({
      message: "Failed to fetch available slots",
    });
  }
});

// Krijimi i rezervimit
app.post("/appointments", async (req, res) => {
  const { full_name, phone, email, service_id, appointment_date, start_time } =
    req.body || {};

  const serviceId = Number(service_id);
  const selectedDate = parseDate(appointment_date);

  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof phone !== "string" ||
    !phone.trim() ||
    !Number.isSafeInteger(serviceId) ||
    serviceId <= 0 ||
    !selectedDate ||
    typeof start_time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time) ||
    (email != null &&
      (typeof email !== "string" ||
        (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))))
  ) {
    return res.status(400).json({
      message: "Please provide valid booking information.",
    });
  }

  const start = toMinutes(start_time);

  if (start % 30 !== 0) {
    return res.status(400).json({
      message: "Appointments must start at 30-minute intervals.",
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Kontrollo daten sipas databazes
    const todayResult = await client.query(
      "SELECT CURRENT_DATE::text AS today",
    );

    if (appointment_date < todayResult.rows[0].today) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Cannot book a past date.",
      });
    }

    const service = await client.query(
      "SELECT duration_minutes FROM services WHERE id = $1",
      [serviceId],
    );

    if (!service.rows.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Service not found.",
      });
    }

    const duration = Number(service.rows[0].duration_minutes);
    const end = start + duration;

    // Bllokimi i perbashket me ndryshimin e orarit
    const hours = await client.query(
      `SELECT start_time, end_time, is_open
       FROM working_hours
       WHERE day_of_week = $1
       FOR SHARE`,
      [selectedDate.getUTCDay()],
    );

    if (
      !hours.rows.length ||
      !hours.rows[0].is_open ||
      start < toMinutes(hours.rows[0].start_time) ||
      end > toMinutes(hours.rows[0].end_time)
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Salon is closed or time is outside working hours.",
      });
    }

    const existingClient = await client.query(
      "SELECT id FROM clients WHERE phone = $1 LIMIT 1",
      [phone.trim()],
    );

    let clientId;

    if (existingClient.rows.length) {
      clientId = existingClient.rows[0].id;
    } else {
      const newClient = await client.query(
        `INSERT INTO clients (full_name, phone, email)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [full_name.trim(), phone.trim(), email?.trim() || null],
      );

      clientId = newClient.rows[0].id;
    }

    const booking = await client.query(
      `INSERT INTO appointments
       (client_id, service_id, appointment_date,
        start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING
         id,
         appointment_date::text AS appointment_date,
         start_time,
         end_time,
         status`,
      [clientId, serviceId, appointment_date, start_time, toTime(end)],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully!",
      appointment: booking.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    if (error.code === "23P01") {
      return res.status(409).json({
        message: "This appointment time is already booked.",
      });
    }

    console.error("Booking error:", error);

    return res.status(500).json({
      message: "Failed to create appointment.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Marrja e rezervimeve per Admin Panel
app.get("/admin/appointments", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        c.full_name,
        c.phone,
        s.name AS service_name,
        a.appointment_date::text AS appointment_date,
        a.start_time,
        a.end_time,
        a.status
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      ORDER BY a.appointment_date DESC, a.start_time DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching admin appointments:", error);

    res.status(500).json({
      message: "Failed to fetch appointments",
    });
  }
});

// Ndryshimi i statusit te rezervimit
app.patch("/admin/appointments/:id/status", async (req, res) => {
  const appointmentId = Number(req.params.id);
  const { status } = req.body || {};

  if (
    !Number.isSafeInteger(appointmentId) ||
    appointmentId <= 0 ||
    !["confirmed", "cancelled"].includes(status)
  ) {
    return res.status(400).json({
      message: "Invalid appointment ID or status.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE appointments
       SET status = $1
       WHERE id = $2
         AND status = 'pending'
       RETURNING id, status`,
      [status, appointmentId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pending appointment not found.",
      });
    }

    res.json({
      success: true,
      message: "Appointment status updated successfully.",
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating appointment:", error);

    res.status(500).json({
      message: "Failed to update appointment status.",
    });
  }
});

// ADMIN - Ndryshimi i orarit te punes
app.put("/admin/working-hours/:day", async (req, res) => {
  const day = Number(req.params.day);
  const { is_open, start_time, end_time } = req.body || {};

  if (
    !Number.isInteger(day) ||
    day < 0 ||
    day > 6 ||
    typeof is_open !== "boolean"
  ) {
    return res.status(400).json({
      message: "Dita ose statusi nuk eshte valid.",
    });
  }

  let start = null;
  let end = null;

  if (is_open) {
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      typeof start_time !== "string" ||
      typeof end_time !== "string" ||
      !timePattern.test(start_time) ||
      !timePattern.test(end_time) ||
      toMinutes(start_time) >= toMinutes(end_time)
    ) {
      return res.status(400).json({
        message: "Orari i punes nuk eshte valid.",
      });
    }

    start = start_time;
    end = end_time;
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Bllokon ndryshimet paralele te orarit
    const workingDay = await client.query(
      `SELECT day_of_week
       FROM working_hours
       WHERE day_of_week = $1
       FOR UPDATE`,
      [day],
    );

    if (!workingDay.rows.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Dita nuk u gjet.",
      });
    }

    // Kontrollon rezervimet aktive qe bien
    // jashte orarit te ri
    const conflicts = await client.query(
      `SELECT id
       FROM appointments
       WHERE EXTRACT(DOW FROM appointment_date) = $1
         AND appointment_date >= CURRENT_DATE
         AND status IN ('pending', 'confirmed')
         AND (
           $2::boolean = FALSE
           OR start_time < $3::time
           OR end_time > $4::time
         )
       LIMIT 1`,
      [day, is_open, start, end],
    );

    if (conflicts.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "Nuk mund ta ndryshoni orarin sepse ekzistojne rezervime aktive jashte orarit te ri.",
      });
    }

    const result = await client.query(
      `UPDATE working_hours
       SET is_open = $1,
           start_time = $2,
           end_time = $3
       WHERE day_of_week = $4
       RETURNING day_of_week, is_open, start_time, end_time`,
      [is_open, start, end, day],
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      working_hours: result.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Gabim gjate ndryshimit te orarit:", error);

    res.status(500).json({
      message: "Orari nuk mund te ndryshohet.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Nisja lokale dhe eksportimi per Vercel
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
