import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FEEDBACK_FROM_EMAIL;
    const toEmail = process.env.FEEDBACK_TO_EMAIL || "aravindkjay28@gmail.com";

    if (!apiKey) {
      return res.status(500).json({ error: "Missing RESEND_API_KEY" });
    }
    if (!fromEmail) {
      return res.status(500).json({ error: "Missing FEEDBACK_FROM_EMAIL" });
    }

    const { name, email, lift, issueType, message, latestAnalysis } = req.body || {};

    const resend = new Resend(apiKey);

    const analysisLines = latestAnalysis
      ? [
          "",
          "Latest UrCoach analysis:",
          `Exercise: ${latestAnalysis.exerciseName || ""}`,
          `Mode: ${latestAnalysis.mode || ""}`,
          `Confidence: ${latestAnalysis.confidence?.label || ""} (${latestAnalysis.confidence?.confidence ?? ""})`,
          `Rep count shown: ${
            latestAnalysis.confidence?.quality === "weak"
              ? "Hidden due to camera angle"
              : (latestAnalysis.repCount ?? "")
          }`,
          `Overall score: ${latestAnalysis.overallScore ?? ""}`,
        ]
      : [];

    const text = [
      `Name: ${name || ""}`,
      `Email: ${email || ""}`,
      `Lift: ${lift || ""}`,
      `Type: ${issueType || ""}`,
      "",
      "Message:",
      message || "",
      ...analysisLines,
    ].join("\n");

    const subject = `UrCoach - ${issueType || "Feedback"}`;

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      reply_to: email ? [email] : undefined,
      subject,
      text,
    });

    if (error) {
      return res.status(500).json({ error: error.message || "Failed to send email" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unexpected error" });
  }
}
