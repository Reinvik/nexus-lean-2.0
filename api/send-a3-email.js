/**
 * Serverless function for Vercel / Node.js
 * Sends pending A3 tasks via email using Resend API.
 * Includes CC to all company accounts (e.g. CIAL accounts).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'Nexus Lean <AlertasLean@nexusnetwork.cl>';

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

function formatDate(dateStr) {
  if (!dateStr) return 'Sin fecha';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (year && month && day) {
      return `${day}-${month}-${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return dateStr;
  }
}

function isDateOverdue(dateStr) {
  if (!dateStr) return false;
  try {
    const target = new Date(dateStr.split('T')[0]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target < today;
  } catch {
    return false;
  }
}

function buildHtmlEmail({
  a3Title,
  a3Id,
  companyName,
  responsible,
  date,
  pendingTasks = [],
  customMessage,
  senderName,
}) {
  const totalTasks = pendingTasks.length;
  const overdueTasks = pendingTasks.filter((t) => isDateOverdue(t.when || t.date)).length;
  const inProgressTasks = pendingTasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'En Proceso'
  ).length;

  const appUrl = a3Id
    ? `https://lean2.nexusnetwork.cl/a3?projectId=${encodeURIComponent(a3Id)}`
    : 'https://lean2.nexusnetwork.cl/a3';

  // Task rows
  const taskRows = pendingTasks
    .map((task, index) => {
      const isOverdue = isDateOverdue(task.when || task.date);
      const formattedDate = formatDate(task.when || task.date);
      const what = task.what || task.activity || 'Tarea sin descripción';
      const who = task.who || task.responsible || 'Sin responsable asignado';
      const why = task.why ? `<div style="font-size:12px;color:#64748B;margin-top:4px;"><strong>Justificación:</strong> ${escapeHtml(task.why)}</div>` : '';
      const planName = task.planName ? `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;background:#EEF2FF;color:#4338CA;border-radius:6px;margin-bottom:6px;">${escapeHtml(task.planName)}</span>` : '';
      
      let subtasksHtml = '';
      if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        const pendingSub = task.subtasks.filter((s) => !s.completed);
        if (pendingSub.length > 0) {
          subtasksHtml = `
            <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #E2E8F0;">
              <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Subtareas pendientes (${pendingSub.length}):</div>
              <ul style="margin:0;padding-left:18px;font-size:12px;color:#334155;">
                ${pendingSub.map((s) => `<li style="margin-bottom:2px;">${escapeHtml(s.title || 'Subtarea')}</li>`).join('')}
              </ul>
            </div>
          `;
        }
      }

      const statusBadge = isOverdue
        ? '<span style="display:inline-block;padding:3px 8px;font-size:11px;font-weight:700;background:#FEE2E2;color:#991B1B;border-radius:6px;">⚠️ Atrasada</span>'
        : task.status === 'in_progress'
        ? '<span style="display:inline-block;padding:3px 8px;font-size:11px;font-weight:700;background:#FEF3C7;color:#92400E;border-radius:6px;">🔄 En Progreso</span>'
        : '<span style="display:inline-block;padding:3px 8px;font-size:11px;font-weight:700;background:#E0F2FE;color:#0369A1;border-radius:6px;">🕒 Pendiente</span>';

      return `
        <tr>
          <td style="padding:16px;border-bottom:1px solid #E2E8F0;background:${index % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <div style="margin-bottom:6px;">
              ${planName}
              <div style="font-size:14px;font-weight:700;color:#0F172A;line-height:1.4;">
                ${escapeHtml(what)}
              </div>
              ${why}
              ${subtasksHtml}
            </div>
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:10px;">
              <tr>
                <td style="font-size:12px;color:#475569;">
                  <strong>👤 Responsable:</strong> <span style="color:#0F172A;font-weight:600;">${escapeHtml(who)}</span>
                </td>
                <td style="text-align:right;font-size:12px;">
                  <span style="color:#64748B;margin-right:8px;">📅 Límite: <strong>${formattedDate}</strong></span>
                  ${statusBadge}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tareas Pendientes A3</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
  </style>
</head>
<body style="margin:0;padding:24px 12px;background-color:#0F172A;">
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:640px;width:100%;margin:0 auto;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.3);">
    
    <!-- Top Accent Bar -->
    <tr>
      <td height="6" style="background:linear-gradient(90deg, #00E0FF 0%, #4F46E5 50%, #06B6D4 100%);"></td>
    </tr>

    <!-- Header Section -->
    <tr>
      <td style="padding:28px 32px;background:#0F172A;color:#FFFFFF;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <div style="font-size:20px;font-weight:900;letter-spacing:-0.5px;">
                <span style="color:#FFFFFF;">NEXUS</span> <span style="color:#00E0FF;">LEAN 2.0</span>
              </div>
              <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">
                Sistema de Mejora Continua & Excelencia Operacional
              </div>
            </td>
            ${
              companyName
                ? `<td style="text-align:right;">
                    <span style="display:inline-block;padding:4px 12px;background:#1E293B;border:1px solid #334155;border-radius:8px;color:#00E0FF;font-weight:800;font-size:12px;letter-spacing:0.5px;">
                      🏢 ${escapeHtml(companyName)}
                    </span>
                  </td>`
                : ''
            }
          </tr>
        </table>

        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #1E293B;">
          <div style="display:inline-block;padding:2px 8px;background:rgba(0,224,255,0.15);border:1px solid rgba(0,224,255,0.4);border-radius:6px;color:#00E0FF;font-size:11px;font-weight:700;margin-bottom:8px;">
            REPORTE DE ACCIONES PENDIENTES
          </div>
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;line-height:1.3;">
            ${escapeHtml(a3Title || 'Proyecto A3')}
          </h1>
          <table cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;font-size:12px;color:#94A3B8;">
            <tr>
              ${responsible ? `<td style="padding-right:16px;">👤 Líder A3: <strong style="color:#E2E8F0;">${escapeHtml(responsible)}</strong></td>` : ''}
              ${date ? `<td>📅 Fecha: <strong style="color:#E2E8F0;">${formatDate(date)}</strong></td>` : ''}
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- Metrics Cards Bar -->
    <tr>
      <td style="padding:20px 32px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="width:32%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:22px;font-weight:900;color:#0284C7;">${totalTasks}</div>
              <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Pendientes Totales</div>
            </td>
            <td style="width:2%;"></td>
            <td style="width:32%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:22px;font-weight:900;color:${overdueTasks > 0 ? '#DC2626' : '#16A34A'};">${overdueTasks}</div>
              <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">${overdueTasks > 0 ? '⚠️ Atrasadas' : 'Al Día'}</div>
            </td>
            <td style="width:2%;"></td>
            <td style="width:32%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:22px;font-weight:900;color:#D97706;">${inProgressTasks}</div>
              <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">En Progreso</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Custom Message if any -->
    ${
      customMessage
        ? `
        <tr>
          <td style="padding:20px 32px 0 32px;">
            <div style="background:#EFF6FF;border-left:4px solid #3B82F6;border-radius:0 12px 12px 0;padding:14px 18px;">
              <div style="font-size:11px;font-weight:800;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                💬 Nota del remitente${senderName ? ` (${escapeHtml(senderName)})` : ''}:
              </div>
              <div style="font-size:13px;color:#1E3A8A;line-height:1.5;">
                ${escapeHtml(customMessage)}
              </div>
            </div>
          </td>
        </tr>
        `
        : ''
    }

    <!-- Task List Section -->
    <tr>
      <td style="padding:24px 32px;">
        <div style="font-size:14px;font-weight:800;color:#0F172A;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;display:flex;align-items:center;">
          📋 Detalle del Plan de Acción 5W2H
        </div>
        
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
          ${taskRows}
        </table>

        <!-- CTA Button -->
        <div style="margin-top:28px;text-align:center;">
          <a href="${appUrl}" target="_blank" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg, #0284C7 0%, #4F46E5 100%);color:#FFFFFF;text-decoration:none;font-weight:800;font-size:13px;border-radius:12px;box-shadow:0 4px 14px rgba(79,70,229,0.3);letter-spacing:0.3px;">
            🚀 Abrir Proyecto A3 en Nexus Lean
          </a>
          <div style="font-size:11px;color:#94A3B8;margin-top:8px;">
            Haz clic para actualizar avances, subtareas o contramedidas en la plataforma.
          </div>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;background:#F1F5F9;border-top:1px solid #E2E8F0;text-align:center;">
        <div style="font-size:12px;font-weight:700;color:#475569;">
          Nexus Enterprise Solutions • Nexus Lean 2.0
        </div>
        <div style="font-size:11px;color:#94A3B8;margin-top:4px;">
          Este correo fue enviado de forma automática desde la plataforma de gestión operativa de ${escapeHtml(companyName || 'la organización')}.
        </div>
        <div style="font-size:10px;color:#CBD5E1;margin-top:10px;">
          © ${new Date().getFullYear()} Nexus Network. Todos los derechos reservados.
        </div>
      </td>
    </tr>

  </table>
</body>
</html>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  // Setup CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilice POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      to = [],
      cc = [],
      a3Title = 'Proyecto A3',
      a3Id = '',
      companyName = '',
      responsible = '',
      date = '',
      pendingTasks = [],
      customMessage = '',
      senderName = '',
    } = body;

    // Validate pending tasks
    if (!Array.isArray(pendingTasks) || pendingTasks.length === 0) {
      return res.status(400).json({ error: 'No se encontraron tareas pendientes para enviar en este A3.' });
    }

    // Clean & validate TO recipients
    let rawTo = Array.isArray(to) ? to : [to];
    let cleanTo = Array.from(new Set(rawTo.map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : '')).filter(isValidEmail)));

    // Clean & validate CC recipients (e.g. all company accounts)
    let rawCc = Array.isArray(cc) ? cc : [cc];
    let cleanCc = Array.from(new Set(rawCc.map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : '')).filter(isValidEmail)));

    // If TO is empty but CC is not, promote the first CC to TO so Resend accepts it
    if (cleanTo.length === 0 && cleanCc.length > 0) {
      cleanTo = [cleanCc.shift()];
    }

    // Ensure no email is both in TO and CC
    cleanCc = cleanCc.filter((email) => !cleanTo.includes(email));

    if (cleanTo.length === 0) {
      return res.status(400).json({
        error: 'Debe especificar al menos un destinatario de correo válido.',
      });
    }

    // Build Email HTML
    const html = buildHtmlEmail({
      a3Title,
      a3Id,
      companyName,
      responsible,
      date,
      pendingTasks,
      customMessage,
      senderName,
    });

    const subject = `[Nexus Lean] Tareas Pendientes A3: ${a3Title}${companyName ? ` (${companyName})` : ''}`;

    // Send via Resend API
    const resendPayload = {
      from: SENDER_EMAIL,
      to: cleanTo,
      subject,
      html,
    };

    if (cleanCc.length > 0) {
      resendPayload.cc = cleanCc;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Error from Resend API:', resendData);
      return res.status(resendResponse.status).json({
        error: resendData.message || 'Error al enviar correo con Resend API',
        details: resendData,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Tareas pendientes enviadas exitosamente por correo.',
      id: resendData.id,
      to: cleanTo,
      ccCount: cleanCc.length,
      cc: cleanCc,
      tasksSent: pendingTasks.length,
    });
  } catch (error) {
    console.error('Unhandled error in send-a3-email handler:', error);
    return res.status(500).json({
      error: error.message || 'Error interno del servidor al procesar el envío de correo.',
    });
  }
}
