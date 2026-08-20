const sequelize = require("../config/database");
const AppUser = require("../models/AppUser");
/** Keep customers.passwordHash and users.password_hash aligned for WattWatch login. */
async function syncAppUserPassword(email, passwordHash) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !passwordHash) return false;

    try {
        const existing = await AppUser.findOne({
            where: sequelize.where(
                sequelize.fn("LOWER", sequelize.col("email")),
                normalized
            ),
        });

        if (existing) {
            await existing.update({ password_hash: passwordHash });
            return true;
        }

        await AppUser.create({
            email: normalized,
            password_hash: passwordHash,
            status: "active",
        });
        return true;
    } catch (error) {
        console.warn("AppUser password sync failed:", error.message);
        return false;
    }
}

module.exports = { syncAppUserPassword };
