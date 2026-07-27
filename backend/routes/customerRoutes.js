const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

const Customer = require("../models/Customer");
const {
    sendTemporaryPasswordEmail,
} = require("../services/emailService");

const router = express.Router();

function removePassword(customer) {
    const data = customer.toJSON
        ? customer.toJSON()
        : customer;

    delete data.passwordHash;

    return data;
}

/*
  Onboarding application creates a lead.
  POST /api/customers
*/
router.post("/customers", async (req, res) => {
    try {
        const customer = await Customer.create({
            ...req.body,
            status: "LEAD",
        });

        return res.status(201).json({
            message: "Lead created successfully",
            data: removePassword(customer),
        });
    } catch (error) {
        const statusCode =
            error.name === "SequelizeUniqueConstraintError"
                ? 409
                : 400;

        return res.status(statusCode).json({
            error: error.message,
        });
    }
});

/*
  CRM fetches customers.

  /api/customers
  /api/customers?status=LEAD
  /api/customers?status=CUSTOMER
  /api/customers?search=dublin
  /api/customers?id=1
  /api/customers?email=user@email.com
*/
router.get("/customers", async (req, res) => {
    try {
        const {
            id,
            email,
            status,
            search = "",
        } = req.query;

        const where = {};

        if (id) {
            where.id = id;
        }

        if (email) {
            where.email = email;
        }

        if (status && status !== "ALL") {
            where.status = status;
        }

        if (search.trim()) {
            where[Op.or] = [
                {
                    firstName: {
                        [Op.like]: `%${search}%`,
                    },
                },
                {
                    lastName: {
                        [Op.like]: `%${search}%`,
                    },
                },
                {
                    email: {
                        [Op.like]: `%${search}%`,
                    },
                },
                {
                    phone: {
                        [Op.like]: `%${search}%`,
                    },
                },
                {
                    eircode: {
                        [Op.like]: `%${search}%`,
                    },
                },
                {
                    mprn: {
                        [Op.like]: `%${search}%`,
                    },
                },
            ];
        }

        const totalCustomers = await Customer.count();

        const customers = await Customer.findAll({
            where,

            attributes: {
                exclude: ["passwordHash"],
            },

            order: [["createdAt", "DESC"]],
        });

        return res.json({
            totalCustomers,
            returnedCount: customers.length,
            data: customers,
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message,
        });
    }
});

/*
  Convert lead to customer.
  POST /api/customers/:id/convert
*/
router.post(
    "/customers/:id/convert",
    async (req, res) => {
        try {
            const customer = await Customer.findByPk(
                req.params.id
            );

            if (!customer) {
                return res.status(404).json({
                    error: "Lead not found",
                });
            }

            if (customer.status === "CUSTOMER") {
                return res.status(409).json({
                    error: "This lead is already a customer",
                });
            }

            const temporaryPassword = crypto
                .randomBytes(12)
                .toString("base64url")
                .slice(0, 12);

            const passwordHash = await bcrypt.hash(
                temporaryPassword,
                12
            );

            /*
              Send email before changing status.
              If email fails, lead remains a lead.
            */
            console.log(
                `Sending temporary password email to ${customer.email} with password: ${temporaryPassword}`
            );
            await sendTemporaryPasswordEmail({
                customer,
                temporaryPassword,
            });

            await customer.update({
                status: "CUSTOMER",
                passwordHash,
                mustChangePassword: true,
                convertedAt: new Date(),
                loginEmailSentAt: new Date(),
                notes:
                    req.body.notes !== undefined
                        ? req.body.notes
                        : customer.notes,
            });

            return res.json({
                message:
                    "Lead converted and login email sent",
                data: removePassword(customer),
            });
        } catch (error) {
            console.error(
                "Convert customer error:",
                error
            );

            return res.status(500).json({
                error:
                    error.message ||
                    "Unable to convert customer",
            });
        }
    }
);

router.patch("/customers/:id", async (req, res) => {
    try {
        const customer = await Customer.findByPk(
            req.params.id
        );

        if (!customer) {
            return res.status(404).json({
                error: "Customer not found",
            });
        }

        const allowedFields = [
            "status",
            "notes",
            "preferredContactTime",
        ];

        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        await customer.update(updates);

        return res.json({
            message: "Customer updated",
            data: removePassword(customer),
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
});

module.exports = router;