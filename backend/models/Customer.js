const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Customer = sequelize.define(
    "Customer",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        firstName: {
            type: DataTypes.STRING(80),
            allowNull: false,
        },

        lastName: {
            type: DataTypes.STRING(80),
            allowNull: false,
        },

        email: {
            type: DataTypes.STRING(160),
            allowNull: false,
            validate: {
                isEmail: true,
            },
        },

        phone: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },

        eircode: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },

        address: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },

        provider: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },

        mprn: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },

        meterNumber: {
            type: DataTypes.STRING(80),
            allowNull: true,
        },

        meterReading: {
            type: DataTypes.STRING(40),
            allowNull: true,
        },

        paymentMethod: {
            type: DataTypes.STRING(60),
            allowNull: true,
        },

        preferredContactTime: {
            type: DataTypes.STRING(60),
            allowNull: true,
        },

        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "LEAD",
            validate: {
                isIn: [["LEAD", "CUSTOMER", "REJECTED"]],
            },
        },

        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },

        mustChangePassword: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },

        convertedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        loginEmailSentAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: "customers",
        freezeTableName: true,
        timestamps: true,
    }
);

module.exports = Customer;