function createRequireAdmin(pool) {
  return async function requireAdmin(req, res, next) {
    if (!req.session?.adminId) {
      return res.status(401).json({
        message: "Duhet te identifikoheni si administrator.",
      });
    }

    try {
      const result = await pool.query(
        `SELECT id
         FROM admins
         WHERE id = $1 AND is_active = TRUE`,
        [req.session.adminId],
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          message: "Qasja nuk lejohet.",
        });
      }

      next();
    } catch (error) {
      console.error("Admin authorization error:", error);

      res.status(500).json({
        message: "Gabim gjate verifikimit te qasjes.",
      });
    }
  };
}

module.exports = createRequireAdmin;
