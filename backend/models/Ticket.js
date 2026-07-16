const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Customer = require("./Customer");

const Ticket = sequelize.define(
    "Ticket",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "customers",
                key: "id",
            },
        },

        subject: {
            type: DataTypes.STRING(180),
            allowNull: false,
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        priority: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "MEDIUM",
            validate: {
                isIn: [["LOW", "MEDIUM", "HIGH"]],
            },
        },

        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "OPEN",
            validate: {
                isIn: [["OPEN", "IN_PROGRESS", "RESOLVED"]],
            },
        },
    },
    {
        tableName: "tickets",
        freezeTableName: true,
        timestamps: true,
    }
);

Customer.hasMany(Ticket, {
    foreignKey: "customerId",
    as: "tickets",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
});

Ticket.belongsTo(Customer, {
    foreignKey: "customerId",
    as: "customer",
});

module.exports = Ticket;