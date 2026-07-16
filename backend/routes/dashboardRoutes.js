const express = require("express");
const { fn, col } = require("sequelize");

const Customer = require("../models/Customer");
const Ticket = require("../models/Ticket");

const router = express.Router();

router.get("/dashboard", async (req, res) => {
    try {
        const [
            leadCount,
            customerCount,
            rejectedCount,
            openTicketCount,
            recentLeads,
            providerResults,
        ] = await Promise.all([
            Customer.count({
                where: {
                    status: "LEAD",
                },
            }),

            Customer.count({
                where: {
                    status: "CUSTOMER",
                },
            }),

            Customer.count({
                where: {
                    status: "REJECTED",
                },
            }),

            Ticket.count({
                where: {
                    status: ["OPEN", "IN_PROGRESS"],
                },
            }),

            Customer.findAll({
                where: {
                    status: "LEAD",
                },

                attributes: {
                    exclude: ["passwordHash"],
                },

                limit: 6,
                order: [["createdAt", "DESC"]],
            }),

            Customer.findAll({
                attributes: [
                    "provider",
                    [fn("COUNT", col("id")), "count"],
                ],

                group: ["provider"],
            }),
        ]);

        const totalRecords =
            leadCount +
            customerCount +
            rejectedCount;

        const conversionRate =
            totalRecords === 0
                ? 0
                : Number(
                    (
                        (customerCount / totalRecords) *
                        100
                    ).toFixed(1)
                );

        return res.json({
            totals: {
                leads: leadCount,
                customers: customerCount,
                rejected: rejectedCount,
                openTickets: openTicketCount,
                conversionRate,
            },

            recentLeads,

            providers: providerResults.map((row) => ({
                provider: row.provider,
                count: Number(row.get("count")),
            })),
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message,
        });
    }
});

module.exports = router;