const sequelize = require("../config/database");
const Customer = require("../models/Customer");
const Ticket = require("../models/Ticket");

/** Remove CRM customer and their CRM tickets (app user row deleted separately). */
async function deleteCustomerAccount(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return false;

    const customer = await Customer.findOne({
        where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("email")),
            normalized
        ),
    });

    if (!customer) return true;

    await Ticket.destroy({ where: { customerId: customer.id } });
    await customer.destroy();
    return true;
}

module.exports = { deleteCustomerAccount };
