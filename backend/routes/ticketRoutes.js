const express = require("express");

const sequelize = require("../config/database");
const Ticket = require("../models/Ticket");
const Customer = require("../models/Customer");
const {
    findWattwatchTicketId,
    ensureThread,
    unreadForStaff,
    markStaffRead,
    TicketMessage,
} = require("../services/ticketChatService");

const router = express.Router();

router.get("/tickets/unread", async (req, res) => {
    try {
        const tickets = await Ticket.findAll({ attributes: ["id", "subject"] });
        let total = 0;
        const perTicket = [];

        for (const ticket of tickets) {
            const link = await findWattwatchTicketId(ticket.id);
            if (!link) continue;
            const count = await unreadForStaff(link);
            if (count > 0) {
                total += count;
                perTicket.push({
                    crmTicketId: ticket.id,
                    subject: ticket.subject,
                    count,
                });
            }
        }

        return res.json({ total, tickets: perTicket });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

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

        const data = [];
        for (const ticket of tickets) {
            const plain = ticket.toJSON();
            const link = await findWattwatchTicketId(ticket.id);
            plain.unread_count = link ? await unreadForStaff(link) : 0;
            data.push(plain);
        }

        return res.json({
            data,
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

router.get("/tickets/:id/messages", async (req, res) => {
    try {
        const link = await findWattwatchTicketId(req.params.id);
        if (!link) {
            return res.status(404).json({
                error: "This ticket is not linked to WattWatch chat yet",
            });
        }

        await ensureThread(link);
        await markStaffRead(link.id);

        const messages = await TicketMessage.findAll({
            where: { ticket_id: link.id },
            order: [
                ["created_at", "ASC"],
                ["id", "ASC"],
            ],
        });

        return res.json({
            wattwatchTicketId: link.id,
            messages,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/tickets/:id/messages", async (req, res) => {
    try {
        const { body, senderName = "Support" } = req.body || {};
        const text = String(body || "").trim();
        if (!text) {
            return res.status(400).json({ error: "Message is required" });
        }

        const link = await findWattwatchTicketId(req.params.id);
        if (!link) {
            return res.status(404).json({
                error: "This ticket is not linked to WattWatch chat yet",
            });
        }

        const message = await TicketMessage.create({
            ticket_id: link.id,
            sender_role: "staff",
            sender_name: senderName,
            body: text,
        });

        await sequelize.query(
            `UPDATE tickets SET admin_reply = ?, status = IF(status = 'open', 'in_progress', status), updated_at = NOW() WHERE id = ?`,
            { replacements: [text, link.id] }
        );

        const crmTicket = await Ticket.findByPk(req.params.id);
        if (crmTicket && crmTicket.status === "OPEN") {
            await crmTicket.update({ status: "IN_PROGRESS" });
        }

        return res.status(201).json({ data: message });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;