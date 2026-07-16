const express = require("express");

const Ticket = require("../models/Ticket");
const Customer = require("../models/Customer");

const router = express.Router();

router.get("/tickets", async (req, res) => {
    try {
        const tickets = await Ticket.findAll({
            include: [
                {
                    model: Customer,
                    as: "customer",
                    attributes: [
                        "id",
                        "firstName",
                        "lastName",
                        "email",
                    ],
                },
            ],

            order: [["createdAt", "DESC"]],
        });

        return res.json({
            data: tickets,
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message,
        });
    }
});

router.post("/tickets", async (req, res) => {
    try {
        const ticket = await Ticket.create(req.body);

        return res.status(201).json({
            message: "Ticket created",
            data: ticket,
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
});

router.patch("/tickets/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(
            req.params.id
        );

        if (!ticket) {
            return res.status(404).json({
                error: "Ticket not found",
            });
        }

        await ticket.update({
            status:
                req.body.status || ticket.status,

            priority:
                req.body.priority || ticket.priority,
        });

        return res.json({
            message: "Ticket updated",
            data: ticket,
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
});

module.exports = router;