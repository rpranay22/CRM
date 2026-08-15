const express = require("express");
const bcrypt = require("bcrypt");

const Customer = require("../models/Customer");

const router = express.Router();

router.post(
    "/auth/customer-login",
    async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    error: "Email and password are required",
                });
            }

            const customer = await Customer.findOne({
                where: {
                    email,
                    status: "CUSTOMER",
                },
            });

            if (!customer || !customer.passwordHash) {
                return res.status(401).json({
                    error: "Invalid email or password",
                });
            }

            const validPassword = await bcrypt.compare(
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