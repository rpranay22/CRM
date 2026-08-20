const { Op } = require("sequelize");
const sequelize = require("../config/database");
const TicketMessage = require("../models/TicketMessage");

async function findWattwatchTicketId(crmTicketId) {
    const [rows] = await sequelize.query(
        "SELECT id, staff_last_read_at, body, admin_reply, created_at FROM tickets WHERE crm_id = ? LIMIT 1",
        { replacements: [String(crmTicketId)] }
    );
    return rows[0] || null;
}

async function ensureThread(ticketRow) {
    if (!ticketRow) return;
    const existing = await TicketMessage.count({
        where: { ticket_id: ticketRow.id },
    });
    if (existing === 0 && ticketRow.body) {
        await TicketMessage.create({
            ticket_id: ticketRow.id,
            sender_role: "customer",
            sender_name: "Customer",
            body: ticketRow.body,
            created_at: ticketRow.created_at || new Date(),
        });
    }
    if (ticketRow.admin_reply) {
        const staffCount = await TicketMessage.count({
            where: { ticket_id: ticketRow.id, sender_role: "staff" },
        });
        if (staffCount === 0) {
            await TicketMessage.create({
                ticket_id: ticketRow.id,
                sender_role: "staff",
                sender_name: "Support",
                body: ticketRow.admin_reply,
            });
        }
    }
}

async function unreadForStaff(ticketRow) {
    await ensureThread(ticketRow);
    const where = {
        ticket_id: ticketRow.id,
        sender_role: "customer",
    };
    if (ticketRow.staff_last_read_at) {
        where.created_at = { [Op.gt]: ticketRow.staff_last_read_at };
    }
    return TicketMessage.count({ where });
}

async function markStaffRead(wattwatchTicketId) {
    await sequelize.query(
        "UPDATE tickets SET staff_last_read_at = NOW(), updated_at = NOW() WHERE id = ?",
        { replacements: [wattwatchTicketId] }
    );
}

module.exports = {
    findWattwatchTicketId,
    ensureThread,
    unreadForStaff,
    markStaffRead,
    TicketMessage,
};
