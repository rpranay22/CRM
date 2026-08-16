const express = require("express");
const Setting = require("../models/Setting");

const router = express.Router();
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

function getPublicBackendUrl(req) {
    if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
    }

    if (process.env.BACKEND_PUBLIC_URL) {
        return process.env.BACKEND_PUBLIC_URL.replace(/\/$/, "");
    }

    const proto =
        req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host =
        req.headers["x-forwarded-host"] || req.get("host");

    return `${proto}://${host}`;
}

function googleConfigured() {
    return Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );
}

function htmlPage(title, body) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:60px auto;color:#153331">
  ${body}
</body>
</html>`;
}

router.get("/gmail/status", async (req, res) => {
    try {
        const stored = await Setting.findByPk("gmail_refresh_token");
        const connected = Boolean(
            process.env.GMAIL_REFRESH_TOKEN || stored?.value
        );

        return res.json({
            googleConfigured: googleConfigured(),
            connected,
            connectUrl: `${getPublicBackendUrl(req)}/api/gmail/connect`,
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message,
        });
    }
});

router.get("/gmail/connect", (req, res) => {
    if (!googleConfigured()) {
        return res
            .status(400)
            .send(
                htmlPage(
                    "Gmail setup needed",
                    `<h2>Google credentials are missing</h2>
<p>Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to the Render environment, then try again.</p>`
                )
            );
    }

    const redirectUri = `${getPublicBackendUrl(req)}/api/gmail/callback`;
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: GMAIL_SEND_SCOPE,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
    });

    return res.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    );
});

router.get("/gmail/callback", async (req, res) => {
    try {
        if (req.query.error) {
            throw new Error(String(req.query.error));
        }

        if (!req.query.code) {
            throw new Error("Google did not return an authorization code");
        }

        const redirectUri = `${getPublicBackendUrl(req)}/api/gmail/callback`;
        const tokenResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    code: String(req.query.code),
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    grant_type: "authorization_code",
                }),
            }
        );

        const tokens = await tokenResponse.json();

        if (!tokens.refresh_token) {
            throw new Error(
                tokens.error_description ||
                    "Google did not return a refresh token. Remove the WattWatch app from your Google Account permissions and connect again."
            );
        }

        await Setting.upsert({
            key: "gmail_refresh_token",
            value: tokens.refresh_token,
        });

        return res.send(
            htmlPage(
                "Gmail connected",
                `<h2>Gmail connected</h2>
<p>WattWatch will now send login emails through your Gmail account, the same way it does on localhost.</p>
<p>You can close this tab and convert the customer again.</p>`
            )
        );
    } catch (error) {
        console.error("Gmail connect error:", error);
        return res
            .status(400)
            .send(
                htmlPage(
                    "Gmail connect failed",
                    `<h2>Could not connect Gmail</h2>
<p>${error.message}</p>`
                )
            );
    }
});

module.exports = router;
