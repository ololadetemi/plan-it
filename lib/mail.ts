export async function sendResetLink(to: string, link: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[Plan-it] Password reset link for ${to}:\n${link}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "Plan-it <onboarding@resend.dev>",
      to,
      subject: "Reset your Plan-it password",
      html: `<p>Use this link to choose a new Plan-it password. It works for 30 minutes.</p><p><a href="${link}">Choose a new password</a></p><p>If you did not ask for this, you can ignore this email.</p>`,
    }),
  });
  if (!res.ok) console.error("[Plan-it] mail failed", res.status, await res.text());
}
