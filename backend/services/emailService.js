const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",

    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

async function verifyEmailConnection() {
    await transporter.verify();
}

async function sendTemporaryPasswordEmail({
    customer,
    temporaryPassword,
}) {
    const loginUrl =
        process.env.CUSTOMER_LOGIN_URL ||
        "http://localhost:3000/login";

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: customer.email,
        subject: "Your WattWatch account is ready",

        text: `
Hello ${customer.firstName},

Your WattWatch account has been activated.

Email: ${customer.email}
Temporary password: ${temporaryPassword}

Login here:
${loginUrl}

Please change your temporary password after your first login.
    `,

        html: `
      <div style="
        max-width:600px;
        margin:auto;
        font-family:Arial,sans-serif;
        color:#153331;
      ">
        <div style="
          background:#0f766e;
          color:white;
          padding:22px;
          border-radius:14px 14px 0 0;
        ">
          <h2 style="margin:0">
            Welcome to WattWatch
          </h2>
        </div>

        <div style="
          padding:24px;
          border:1px solid #d8eeee;
          border-top:0;
          border-radius:0 0 14px 14px;
        ">
          <p>Hello ${customer.firstName},</p>

          <p>
            Your account has been activated by our customer
            support team.
          </p>

          <p>
            <strong>Email:</strong>
            ${customer.email}
          </p>

          <p>
            <strong>Temporary password:</strong>
          </p>

          <div style="
            background:#ecfdf5;
            padding:15px;
            border-radius:10px;
            font-size:20px;
            font-weight:bold;
            letter-spacing:2px;
          ">
            ${temporaryPassword}
          </div>

          <p style="margin-top:24px">
            <a
              href="${loginUrl}"
              style="
                background:#0f766e;
                color:white;
                padding:12px 20px;
                border-radius:8px;
                text-decoration:none;
                display:inline-block;
              "
            >
              Log in to your account
            </a>
          </p>

          <p style="font-size:13px;color:#64748b">
            Please change the temporary password after your
            first login.
          </p>
        </div>
      </div>
    `,
    });
}

module.exports = {
    verifyEmailConnection,
    sendTemporaryPasswordEmail,
};