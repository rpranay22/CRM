const nodemailer = require("nodemailer");

const SMTP_BLOCKED_PORTS = new Set([25, 465, 587]);
const SMTP_RELAY_PORT = 2525;

function isRender() {
  return process.env.RENDER === "true";
}

function smtpPort() {
  return Number(process.env.SMTP_PORT || 587);
}

function smtpHost() {
  return (process.env.SMTP_HOST || "").toLowerCase();
}

function isGmailOrOutlookHost(host) {
  return (
    host.includes("gmail.com") ||
    host.includes("google.com") ||
    host.includes("outlook.com") ||
    host.includes("office365.com") ||
    host.includes("hotmail.com")
  );
}

function hasHttpEmailProvider() {
  return Boolean(
    process.env.BREVO_API_KEY ||
      process.env.SENDGRID_API_KEY ||
      process.env.RESEND_API_KEY
  );
}

function parseFromAddress(from = process.env.MAIL_FROM || "") {
  const match = String(from).match(/^(.*)<([^>]+)>$/);

  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, "") || "WattWatch",
      email: match[2].trim(),
    };
  }

  return {
    name: "WattWatch",
    email: from.trim(),
  };
}

function buildTemporaryPasswordMessage({ customer, temporaryPassword }) {
  const loginUrl =
    process.env.CUSTOMER_LOGIN_URL || "http://localhost:3000/login";

  const subject = "Your WattWatch account is ready";

  const text = `
Hello ${customer.firstName},

Your WattWatch account has been activated.

Email: ${customer.email}
Temporary password: ${temporaryPassword}

Login here:
${loginUrl}

Please change your temporary password after your first login.
  `.trim();

  const html = `
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

        <p>
            Hello ${customer.firstName},
        </p>


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


        <p style="
            font-size:13px;
            color:#64748b;
        ">
            Please change the temporary password after your
            first login.
        </p>

    </div>

</div>
  `.trim();

  return { subject, text, html };
}

function renderSmtpBlockedError() {
  return new Error(
    "Render free hosting blocks SMTP ports 25, 465 and 587, so Gmail/Nodemailer cannot send mail there. Add BREVO_API_KEY, SENDGRID_API_KEY or RESEND_API_KEY in the Render environment variables. Those providers send mail over HTTPS, which Render allows."
  );
}

async function postJson(url, { headers, body, okStatuses = [200, 201, 202] }) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!okStatuses.includes(response.status)) {
    const message =
      data.message ||
      data.error?.message ||
      data.errors?.[0]?.message ||
      data.title ||
      raw ||
      `Email API failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

async function sendViaBrevo({ from, to, toName, subject, text, html }) {
  return postJson("https://api.brevo.com/v3/smtp/email", {
    headers: {
      "api-key": process.env.BREVO_API_KEY,
    },
    body: {
      sender: from,
      replyTo: from,
      to: [{ email: to, name: toName }],
      subject,
      textContent: text,
      htmlContent: html,
    },
  });
}

async function sendViaSendGrid({ from, to, toName, subject, text, html }) {
  await postJson("https://api.sendgrid.com/v3/mail/send", {
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
    },
    body: {
      personalizations: [
        {
          to: [{ email: to, name: toName }],
        },
      ],
      from,
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    },
  });
}

async function sendViaResend({ from, to, subject, text, html }) {
  const fromValue = from.name
    ? `${from.name} <${from.email}>`
    : from.email;

  return postJson("https://api.resend.com/emails", {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: {
      from: fromValue,
      to: [to],
      subject,
      text,
      html,
    },
  });
}

function createSmtpTransporter(port) {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: true,
    },
  });
}

async function getGmailRefreshToken() {
  if (process.env.GMAIL_REFRESH_TOKEN) {
    return process.env.GMAIL_REFRESH_TOKEN;
  }

  try {
    const Setting = require("../models/Setting");
    const stored = await Setting.findByPk("gmail_refresh_token");
    return stored?.value || null;
  } catch (error) {
    console.warn("Could not read Gmail token:", error.message);
    return null;
  }
}

function encodeGmailRaw({ from, to, toName, subject, html }) {
  const fromHeader = from.name
    ? `${from.name} <${from.email}>`
    : from.email;
  const toHeader = toName ? `${toName} <${to}>` : to;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;

  const mime = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  return Buffer.from(mime).toString("base64url");
}

async function sendViaGmailApi({ from, to, toName, subject, html, refreshToken }) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await tokenResponse.json();

  if (!tokens.access_token) {
    throw new Error(
      tokens.error_description ||
        "Gmail login expired. Open Connect Gmail in the CRM and authorize again."
    );
  }

  const sendResponse = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodeGmailRaw({ from, to, toName, subject, html }),
      }),
    }
  );

  const result = await sendResponse.json();

  if (!sendResponse.ok) {
    throw new Error(
      result.error?.message || "Gmail API could not send the email"
    );
  }

  return result;
}

async function sendViaSmtp({ from, to, subject, text, html }) {
  const configuredPort = smtpPort();
  const host = smtpHost();
  let port = configuredPort;

  if (
    isRender() &&
    SMTP_BLOCKED_PORTS.has(port) &&
    !isGmailOrOutlookHost(host)
  ) {
    port = SMTP_RELAY_PORT;
    console.log(
      `Render blocks SMTP ${configuredPort}; trying relay port ${port}`
    );
  }

  if (isRender() && SMTP_BLOCKED_PORTS.has(port)) {
    throw renderSmtpBlockedError();
  }

  const transporter = createSmtpTransporter(port);

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

async function sendMail({ to, toName, subject, text, html }) {
  const from = parseFromAddress();

  if (!from.email) {
    throw new Error("MAIL_FROM is not configured");
  }

  const gmailRefreshToken = await getGmailRefreshToken();

  if (
    gmailRefreshToken &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  ) {
    const result = await sendViaGmailApi({
      from,
      to,
      toName,
      subject,
      html,
      refreshToken: gmailRefreshToken,
    });
    return { provider: "gmail", messageId: result.id };
  }

  if (process.env.BREVO_API_KEY) {
    const result = await sendViaBrevo({
      from,
      to,
      toName,
      subject,
      text,
      html,
    });
    return { provider: "brevo", messageId: result.messageId };
  }

  if (process.env.SENDGRID_API_KEY) {
    await sendViaSendGrid({ from, to, toName, subject, text, html });
    return { provider: "sendgrid" };
  }

  if (process.env.RESEND_API_KEY) {
    const result = await sendViaResend({ from, to, subject, text, html });
    return { provider: "resend", messageId: result.id };
  }

  await sendViaSmtp({ from, to, subject, text, html });
  return { provider: "smtp" };
}

async function verifyEmailConnection() {
  const gmailRefreshToken = await getGmailRefreshToken();

  if (
    gmailRefreshToken &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  ) {
    console.log("Email provider: Gmail HTTPS API");
    return;
  }

  if (process.env.BREVO_API_KEY) {
    console.log("Email provider: Brevo HTTPS API");
    return;
  }

  if (process.env.SENDGRID_API_KEY) {
    console.log("Email provider: SendGrid HTTPS API");
    return;
  }

  if (process.env.RESEND_API_KEY) {
    console.log("Email provider: Resend HTTPS API");
    return;
  }

  if (isRender() && SMTP_BLOCKED_PORTS.has(smtpPort())) {
    console.warn(renderSmtpBlockedError().message);
    return;
  }

  const transporter = createSmtpTransporter(smtpPort());
  await transporter.verify();
}

async function sendTemporaryPasswordEmail({ customer, temporaryPassword }) {
  const { subject, text, html } = buildTemporaryPasswordMessage({
    customer,
    temporaryPassword,
  });

  const result = await sendMail({
    to: customer.email,
    toName: `${customer.firstName} ${customer.lastName}`.trim(),
    subject,
    text,
    html,
  });

  console.log(
    `Temporary password email accepted by ${result.provider} for ${customer.email}` +
      (result.messageId ? ` (id ${result.messageId})` : "")
  );

  return result;
}

module.exports = {
  verifyEmailConnection,
  sendTemporaryPasswordEmail,
};
