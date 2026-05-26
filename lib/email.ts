import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export type EmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: EmailParams): Promise<void> {
  if (!resend) {
    console.log("\n📧 [DEV MODE — email não enviado, RESEND_API_KEY vazio]");
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    const linkMatch = html.match(/href="([^"]+)"/);
    if (linkMatch) console.log(`  Link:    ${linkMatch[1]}`);
    console.log("");
    return;
  }

  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}

function emailLayout(body: string): string {
  return `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:32px auto;padding:0 16px;color:#111">
${body}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#888;font-size:13px">remix-songs · <a href="https://remix-songs.com" style="color:#888">remix-songs.com</a></p>
</body></html>`;
}

export function renderVerificationEmail({ name, url }: { name: string; url: string }): string {
  return emailLayout(`
    <h2 style="margin-top:0">Confirme seu email</h2>
    <p>Olá${name ? `, ${name}` : ""}! Clique no link abaixo para confirmar seu email no remix-songs:</p>
    <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:6px;text-decoration:none">Confirmar email</a></p>
    <p style="color:#666;font-size:14px">Se o botão não funcionar, copie e cole no navegador:<br><a href="${url}">${url}</a></p>
    <p style="color:#666;font-size:14px">Se você não criou esta conta, pode ignorar este email.</p>
  `);
}

export function renderResetPasswordEmail({ name, url }: { name: string; url: string }): string {
  return emailLayout(`
    <h2 style="margin-top:0">Redefinir senha</h2>
    <p>Olá${name ? `, ${name}` : ""}! Recebemos um pedido para redefinir sua senha no remix-songs.</p>
    <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:6px;text-decoration:none">Redefinir senha</a></p>
    <p style="color:#666;font-size:14px">Se o botão não funcionar, copie e cole no navegador:<br><a href="${url}">${url}</a></p>
    <p style="color:#666;font-size:14px">Se você não pediu para redefinir, pode ignorar este email — sua senha continua a mesma.</p>
  `);
}
