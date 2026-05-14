import { AppointmentCreatedEvent, AppointmentReminderEvent } from '../interfaces/events.interface';

const WARNING_MESSAGE =
  `⚠️ *Aviso importante:* caso não seja possível comparecer, pedimos que avise com antecedência.\n` +
  `Quando o cliente não comparece sem informar, a vaga fica indisponível para outra pessoa e o valor do serviço é cobrado. Contamos com sua compreensão. 🙏`;

function formatDateTime(date: Date) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { dateStr, timeStr };
}

export function buildReengagementWhatsApp(
  clientName: string,
  bookingUrl: string,
): string {
  const firstName = clientName.split(' ')[0];

  return (
    `Olá, ${firstName}! 👋 Sentimos sua falta.\n\n` +
    `Que tal uma nova experiência conosco? ✨\n\n` +
    `Confira nossos serviços atualizados e agende sua visita:\n` +
    `👉 ${bookingUrl}\n\n` +
    `Esperamos você! 💈`
  );
}

export function buildReengagementEmail(
  clientName: string,
  bookingUrl: string,
): { subject: string; html: string; text: string } {
  const firstName = clientName.split(' ')[0];

  const subject = `${firstName}, sentimos sua falta! 💈`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; text-align: center;">
      <h2 style="color: #1d4ed8;">Sentimos sua falta, ${firstName}! 👋</h2>
      <p style="font-size: 16px; color: #374151;">
        Faz um tempinho que você não nos visita. Que tal agendar uma nova experiência?
      </p>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #6b7280;">Confira nossos serviços atualizados e agende sua visita:</p>
        <a href="${bookingUrl}"
          style="display: inline-block; margin-top: 12px; padding: 12px 24px;
                 background: #1d4ed8; color: white; border-radius: 6px;
                 text-decoration: none; font-weight: bold; font-size: 16px;">
          Agendar agora 💈
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 14px;">Esperamos você!</p>
    </div>
  `;

  const text =
    `Olá, ${firstName}! Sentimos sua falta.\n\n` +
    `Que tal uma nova experiência conosco?\n` +
    `Confira nossos serviços e agende sua visita:\n${bookingUrl}\n\n` +
    `Esperamos você!`;

  return { subject, html, text };
}

export function buildAppointmentCreatedWhatsApp(event: AppointmentCreatedEvent): string {
  const { dateStr, timeStr } = formatDateTime(event.scheduledAt);

  return (
    `Olá, ${event.clientName} tudo bem? 😊\n\n` +
    `Seu agendamento foi confirmado! ✅\n\n` +
    `📅 *Data:* ${dateStr}\n` +
    `🕐 *Horário:* ${timeStr}\n` +
    `✂️ *Serviço:* ${event.serviceName}\n` +
    `👤 *Profissional:* ${event.professionalName}\n` +
    `💰 *Valor:* R$ ${event.price.toFixed(2).replace('.', ',')}\n\n` +
    WARNING_MESSAGE
  );
}

export function buildAppointmentCreatedEmail(event: AppointmentCreatedEvent): { subject: string; html: string; text: string } {
  const { dateStr, timeStr } = formatDateTime(event.scheduledAt);
  const price = `R$ ${event.price.toFixed(2).replace('.', ',')}`;

  const subject = `✅ Agendamento confirmado — ${dateStr} às ${timeStr}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F3FE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">

        <tr><td style="background:#7F77DD;padding:32px 32px 28px;text-align:center;">
          <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.18);display:inline-block;line-height:52px;text-align:center;font-size:22px;color:#fff;margin-bottom:14px;">✓</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:600;margin:0 0 4px;">Agendamento confirmado!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">Tudo certo para o seu atendimento</p>
        </td></tr>

        <tr><td style="padding:28px 32px 24px;">
          <p style="font-size:15px;color:#555555;margin:0 0 24px;line-height:1.65;">
            Olá, <strong style="color:#1a1a1a;">${event.clientName}</strong>! Seu agendamento foi realizado com sucesso.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#EEEDFE;border-radius:12px;margin-bottom:20px;">
            <tr><td style="padding:20px;">
              <p style="font-size:11px;color:#534AB7;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Detalhes do agendamento</p>

              <p style="font-size:11px;color:#534AB7;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;font-weight:600;">Data e horário</p>
              <p style="font-size:14px;color:#3C3489;font-weight:600;margin:0 0 16px;">${dateStr} às ${timeStr}</p>

              <p style="font-size:11px;color:#534AB7;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;font-weight:600;">Profissional</p>
              <p style="font-size:14px;color:#3C3489;font-weight:600;margin:0 0 16px;">${event.professionalName}</p>

              <p style="font-size:11px;color:#534AB7;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;font-weight:600;">Serviço</p>
              <p style="font-size:14px;color:#3C3489;font-weight:600;margin:0;">${event.serviceName}</p>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;border-radius:10px;margin-bottom:20px;">
            <tr>
              <td style="padding:14px 16px;">
                <p style="font-size:11px;color:#999999;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;">Valor total</p>
                <p style="font-size:22px;font-weight:600;color:#534AB7;margin:0;">${price}</p>
              </td>
            </tr>
          </table>

          <div style="background:#FEF9C3;border-left:4px solid #CA8A04;border-radius:4px;padding:14px 16px;margin-bottom:8px;">
            <p style="font-size:13px;font-weight:600;color:#854D0E;margin:0 0 6px;">⚠️ Aviso importante</p>
            <p style="font-size:13px;color:#713F12;margin:0;line-height:1.6;">Caso não seja possível comparecer, pedimos que avise com antecedência. Quando o cliente não comparece sem informar, a vaga fica indisponível para outra pessoa e o valor do serviço é cobrado.</p>
          </div>
        </td></tr>

        <tr><td style="border-top:1px solid #eeeeee;padding:16px 32px;text-align:center;">
          <p style="font-size:12px;color:#aaaaaa;margin:0;">Você recebeu este e-mail pois possui um agendamento ativo.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Olá, ${event.clientName}!\n\n` +
    `Seu agendamento foi confirmado!\n` +
    `Data: ${dateStr}\nHorário: ${timeStr}\nServiço: ${event.serviceName}\n` +
    `Profissional: ${event.professionalName}\nValor: ${price}\n\n` +
    `Aviso importante: caso não seja possível comparecer, pedimos que avise com antecedência.`;

  return { subject, html, text };
}

export function buildAppointmentReminderWhatsApp(event: AppointmentReminderEvent): string {
  const { dateStr, timeStr } = formatDateTime(event.scheduledAt);

  return (
    `Olá! 👋 Passando para lembrar do seu agendamento.\n\n` +
    `📅 *Data:* ${dateStr}\n` +
    `🕐 *Horário:* ${timeStr}\n` +
    `✂️ *Serviço:* ${event.serviceName}\n` +
    `👤 *Profissional:* ${event.professionalName}\n\n` +
    WARNING_MESSAGE
  );
}

export function buildAppointmentReminderEmail(event: AppointmentReminderEvent): { subject: string; html: string; text: string } {
  const { dateStr, timeStr } = formatDateTime(event.scheduledAt);

  const subject = `🔔 Lembrete do seu agendamento - ${dateStr} às ${timeStr}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2563eb;">🔔 Lembrete de Agendamento</h2>
      <p>Olá! Passando para lembrar do seu agendamento:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>📅 Data</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${dateStr}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>🕐 Horário</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${timeStr}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>✂️ Serviço</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${event.serviceName}</td></tr>
        <tr><td style="padding: 8px;"><strong>👤 Profissional</strong></td><td style="padding: 8px;">${event.professionalName}</td></tr>
      </table>

      <div style="background: #fef9c3; border-left: 4px solid #ca8a04; padding: 12px; margin-top: 16px; border-radius: 4px;">
        <strong>⚠️ Aviso importante:</strong>
        <p style="margin: 8px 0 0;">Caso não seja possível comparecer, pedimos que avise com antecedência.
        Quando o cliente não comparece sem informar, a vaga fica indisponível para outra pessoa e o valor do serviço é cobrado. Contamos com sua compreensão.</p>
      </div>
    </div>
  `;

  const text =
    `Lembrete do seu agendamento!\n` +
    `Data: ${dateStr}\nHorário: ${timeStr}\nServiço: ${event.serviceName}\n` +
    `Profissional: ${event.professionalName}\n\n` +
    `Aviso importante: caso não seja possível comparecer, pedimos que avise com antecedência.`;

  return { subject, html, text };
}

export function buildProfessionalAppointmentCreatedEmail(event: AppointmentCreatedEvent): { subject: string; html: string; text: string } {
  const { dateStr, timeStr } = formatDateTime(event.scheduledAt);
  const price = `R$ ${event.price.toFixed(2).replace('.', ',')}`;

  const subject = `Novo agendamento — ${event.clientName} · ${dateStr} às ${timeStr}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0FAF6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">

        <tr><td style="background:#1D9E75;padding:32px 32px 28px;text-align:center;">
          <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.18);display:inline-block;line-height:52px;text-align:center;font-size:22px;color:#fff;margin-bottom:14px;">✓</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:600;margin:0 0 4px;">Novo agendamento!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">Você tem um novo cliente confirmado</p>
        </td></tr>

        <tr><td style="padding:28px 32px 24px;">
          <p style="font-size:15px;color:#555555;margin:0 0 24px;line-height:1.65;">
            Olá, <strong style="color:#1a1a1a;">${event.professionalName}</strong>.
            Um novo agendamento foi realizado e está aguardando seu atendimento.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#E1F5EE;border-radius:12px;margin-bottom:20px;">
            <tr><td style="padding:20px;">
              <p style="font-size:11px;color:#0F6E56;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Detalhes do agendamento</p>

              <p style="font-size:11px;color:#0F6E56;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;font-weight:600;">Cliente</p>
              <p style="font-size:14px;color:#085041;font-weight:600;margin:0 0 2px;">${event.clientName}</p>
              <p style="font-size:12px;color:#0F6E56;margin:0 0 16px;">${event.clientPhone}${event.clientEmail ? ` · ${event.clientEmail}` : ''}</p>

              <p style="font-size:11px;color:#0F6E56;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;font-weight:600;">Data e horário</p>
              <p style="font-size:14px;color:#085041;font-weight:600;margin:0 0 16px;">${dateStr} às ${timeStr}</p>

              <p style="font-size:11px;color:#0F6E56;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;font-weight:600;">Serviço</p>
              <p style="font-size:14px;color:#085041;font-weight:600;margin:0;">${event.serviceName} · ${event.duration} min</p>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;border-radius:10px;margin-bottom:8px;">
            <tr>
              <td style="padding:14px 16px;">
                <p style="font-size:11px;color:#999999;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;">Valor do serviço</p>
                <p style="font-size:22px;font-weight:600;color:#0F6E56;margin:0;">${price}</p>
              </td>
              <td align="right" style="padding:14px 16px;">
                <span style="background:#E1F5EE;color:#085041;font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;">Pendente</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="border-top:1px solid #eeeeee;padding:16px 32px;text-align:center;">
          <p style="font-size:12px;color:#aaaaaa;margin:0;">Você recebeu este e-mail pois é um profissional cadastrado na plataforma.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Novo agendamento recebido!\n\n` +
    `Cliente: ${event.clientName}\n` +
    `Contato: ${event.clientPhone}\n` +
    `Data: ${dateStr} às ${timeStr}\n` +
    `Serviço: ${event.serviceName}\n` +
    `Valor: ${price}`;

  return { subject, html, text };
}