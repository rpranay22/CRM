const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/** Shared WattWatch / energy-switch app login table (`users`). */
const AppUser = sequelize.define(
    "AppUser",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM("active", "suspended"),
            allowNull: false,
            defaultValue: "active",
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "users",
        timestamps: true,
        underscored: true,
        createdAt: "created_at",
        updatedAt: false,
    }
);

module.exports = AppUser;
