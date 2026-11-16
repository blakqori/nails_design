const express = require("express");
const bcrypt = require("bcrypt");

const { rateLimit } = require("express-rate-limit");

function createAuthRouter(pool) {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      message: "Shume tentativa per hyrje. Provo perseri pas 15 minutash.",
    },
  });
  
  router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 255 ||
      password.length > 1024 ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email ose fjalekalim jo valid.",
      });
    }

    try {
      const result = await pool.query(
        `SELECT id, email, password_hash
         FROM admins
         WHERE email = $1 AND is_active = TRUE`,
        [email.trim().toLowerCase()],
      );

      const admin = result.rows[0];

      if (!admin) {
        return res.status(401).json({
          message: "Email ose fjalekalim i pasakte.",
        });
      }

      const validPassword = await bcrypt.compare(password, admin.password_hash);

      if (!validPassword) {
        return res.status(401).json({
          message: "Email ose fjalekalim i pasakte.",
        });
      }

      req.session.regenerate((error) => {
        if (error) {
          return res.status(500).json({
            message: "Gabim gjate hyrjes.",
          });
        }

        req.session.adminId = admin.id;

        req.session.save((saveError) => {
          if (saveError) {
            return res.status(500).json({
              message: "Gabim gjate ruajtjes se sesionit.",
            });
          }

          res.json({
            success: true,
            message: "Hyrja u krye me sukses.",
            admin: {
              id: admin.id,
              email: admin.email,
            },
          });
        });
      });
    } catch (error) {
      console.error("Login error:", error);

      res.status(500).json({
        message: "Gabim ne server.",
      });
    }
  });

  router.post("/logout", (req, res) => {
    if (!req.session) {
      return res.status(401).json({
        message: "Nuk ka sesion aktiv.",
      });
    }

    req.session.destroy((error) => {
      if (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
          message: "Dalja deshtoi.",
        });
      }

      res.clearCookie("nails.sid", {
        path: "/",
      });

      res.json({
        success: true,
        message: "Dalja u krye me sukses.",
      });
    });
  });

  // Kontrollon nese administratori eshte i kycur
  router.get("/me", async (req, res) => {
    if (!req.session?.adminId) {
      return res.status(401).json({
        message: "Nuk jeni te kycur.",
      });
    }

    try {
      const result = await pool.query(
        `SELECT id, email
         FROM admins
         WHERE id = $1 AND is_active = TRUE`,
        [req.session.adminId],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          message: "Sesioni nuk eshte valid.",
        });
      }

      res.json({
        authenticated: true,
        admin: result.rows[0],
      });
    } catch (error) {
      console.error("Session check error:", error);

      res.status(500).json({
        message: "Gabim gjate kontrollimit te sesionit.",
      });
    }
  });

  return router;
}

module.exports = createAuthRouter;
