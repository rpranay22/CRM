require("dotenv").config();

const express = require("express");
const cors = require("cors");

const sequelize = require("./config/database");

require("./models/Customer");
require("./models/Ticket");
require("./models/Setting");

const customerRoutes = require(
    "./routes/customerRoutes"
);
const dashboardRoutes = require(
    "./routes/dashboardRoutes"
);
const ticketRoutes = require(
    "./routes/ticketRoutes"
);
const authRoutes = require(
    "./routes/authRoutes"
);
const gmailRoutes = require(
    "./routes/gmailRoutes"
);

const {
    verifyEmailConnection,
} = require("./services/emailService");

const app = express();

const allowedOrigins = [
    process.env.CUSTOMER_APP_ORIGIN ||
    "http://localhost:3000",

    process.env.CRM_ORIGIN ||
    "http://localhost:3001",
];

app.use(
    cors()
);

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Smart Energy CRM API is running");
});

app.use("/api", customerRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", ticketRoutes);
app.use("/api", authRoutes);
app.use("/api", gmailRoutes);

const PORT = Number(
    process.env.PORT || 5000
);

async function startServer() {
    try {
        await sequelize.authenticate();

        console.log(
            "Database connected successfully"
        );

        /*
          Suitable for prototype/demo.
          Use Sequelize migrations in production.
        */
        await sequelize.sync({
            alter: true,
        });

        console.log(
            "Database tables synchronized"
        );

        try {
            await verifyEmailConnection();
            console.log("SMTP connection verified");
        } catch (emailError) {
            console.warn(
                "SMTP configuration warning:",
                emailError.message
            );
        }

        app.listen(PORT, () => {
            console.log(
                `Backend running on port ${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "Backend startup failed:",
            error
        );
    }
}

startServer();