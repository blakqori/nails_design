require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const readline = require("readline/promises");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function createAdmin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const email = (await rl.question("Email: ")).trim().toLowerCase();

    const password = await rl.question("Password: ");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email jo valid.");
    }

    if (password.length < 12) {
      throw new Error("Fjalekalimi duhet te kete te pakten 12 karaktere.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO admins (email, password_hash)
       VALUES ($1, $2)`,
      [email, passwordHash],
    );

    console.log("Administratori u krijua me sukses.");
  } catch (error) {
    console.error("Gabim:", error.message);
  } finally {
    rl.close();
    await pool.end();
  }
}

createAdmin();
