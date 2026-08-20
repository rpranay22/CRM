const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TicketMessage = sequelize.define(
    "TicketMessage",
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        ticket_id: {
            type: DataTypes.CHAR(36),
            allowNull: false,
        },
        sender_role: {
            type: DataTypes.ENUM("customer", "staff"),
            allowNull: false,
        },
        sender_name: {
            type: DataTypes.STRING(120),
            allowNull: true,
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "ticket_messages",
        freezeTableName: true,
        timestamps: false,
    }
);

module.exports = TicketMessage;
