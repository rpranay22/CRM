const express = require("express");

const Customer = require("../models/Customer");
const sequelize = require("../config/database");
const { verifyPassword } = require("../utils/password");

const router = express.Router();

router.post(
    "/auth/customer-login",
    async (req, res) => {
        try {
            const email = String(req.body.email || "")
                .trim()
                .toLowerCase();
            const password = String(req.body.password || "").trim();

            if (!email || !password) {
                return res.status(400).json({
                    error: "Email and password are required",
                });
            }

            const customer = await Customer.findOne({
                where: sequelize.where(
                    sequelize.fn("LOWER", sequelize.col("email")),
                    email
                ),
            });

            if (!customer || customer.status !== "CUSTOMER") {
                return res.status(401).json({
                    error: "No active customer account for this email. Convert the lead in the CRM first.",
                });
            }

            if (!customer.passwordHash) {
                return res.status(401).json({
                    error: "This account has no password yet. Open Active Customers in the CRM and click Resend login email.",
                });
            }

            const validPassword = await verifyPassword(
                password,
                customer.passwordHash
            );

            if (!validPassword) {
                return res.status(401).json({
                    error: "Invalid email or password",
                });
            }

            return res.json({
                message: "Login successful",

                customer: {
                    id: customer.id,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                },

                mustChangePassword:
                    customer.mustChangePassword,
            });
        } catch (error) {
            return res.status(500).json({
                error: error.message,
            });
        }
    }
);

module.exports = router;