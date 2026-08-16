const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Setting = sequelize.define(
    "Setting",
    {
        key: {
            type: DataTypes.STRING(80),
            primaryKey: true,
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: "settings",
        freezeTableName: true,
        timestamps: true,
    }
);

module.exports = Setting;
