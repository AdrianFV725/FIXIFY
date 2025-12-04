/**
 * Cloud Functions para FIXIFY
 * Notificaciones de Slack cuando se crea un ticket
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios = require("axios");
const logger = require("firebase-functions/logger");

// Inicializar Firebase Admin
admin.initializeApp();

// Configuración global
setGlobalOptions({ maxInstances: 10 });

// Configuración de Slack - Usar variables de entorno
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const IT_USER_ID = process.env.SLACK_IT_USER_ID || "";

/**
 * Función que se ejecuta cuando se crea un nuevo ticket en Firestore
 */
exports.notifySlackOnTicketCreated = onDocumentCreated(
  {
    document: "tickets/{ticketId}",
    region: "us-central1",
  },
  async (event) => {
    const ticket = event.data.data();
    const ticketId = event.params.ticketId;

    logger.info("Nuevo ticket detectado", { ticketId, folio: ticket.folio });

    // Verificar que es un ticket nuevo (tiene createdAt y es el primer historial)
    const isNewTicket =
      ticket.createdAt &&
      ticket.history &&
      ticket.history.length === 1 &&
      ticket.history[0].action === "created";

    if (!isNewTicket) {
      logger.info("Ticket no es nuevo, saltando notificación", { ticketId });
      return null;
    }

    try {
      await sendSlackDM(ticket, ticketId);
      logger.info("Notificación enviada exitosamente", { ticketId });
    } catch (error) {
      logger.error("Error al enviar notificación", { ticketId, error: error.message });
      // No lanzar error para que no falle la creación del ticket
    }

    return null;
  }
);

/**
 * Envía un mensaje directo a Slack con la información del ticket
 */
async function sendSlackDM(ticket, ticketId) {
  try {
    // Validar que las variables de entorno estén configuradas
    if (!SLACK_BOT_TOKEN || !IT_USER_ID) {
      logger.warn("Variables de entorno de Slack no configuradas, saltando notificación", {
        ticketId,
        hasToken: !!SLACK_BOT_TOKEN,
        hasUserId: !!IT_USER_ID,
      });
      return;
    }

    // Obtener información del empleado si existe
    let employeeName = ticket.contactoNombre || "Usuario desconocido";
    let employeeEmail = ticket.contactoEmail || "";

    if (ticket.contactoId) {
      try {
        const employeeDoc = await admin
          .firestore()
          .collection("employees")
          .doc(ticket.contactoId)
          .get();

        if (employeeDoc.exists) {
          const employee = employeeDoc.data();
          employeeName = `${employee.name || ""} ${employee.lastName || ""}`.trim() || employeeName;
          employeeEmail = employee.email || employeeEmail;
        }
      } catch (e) {
        logger.warn("No se pudo obtener info del empleado", { error: e.message });
      }
    }

    // Determinar emoji y color según prioridad
    const priorityConfig = {
      critical: { emoji: "🔴", label: "Crítica" },
      high: { emoji: "🟠", label: "Alta" },
      medium: { emoji: "🟡", label: "Media" },
      low: { emoji: "🟢", label: "Baja" },
    };

    const priority = ticket.priority || "medium";
    const priorityInfo = priorityConfig[priority] || priorityConfig.medium;

    // Formatear categoría
    const categoryLabels = {
      hardware: "Hardware",
      software: "Software",
      network: "Red",
      other: "Otro",
    };
    const categoryLabel = categoryLabels[ticket.category] || ticket.category || "N/A";

    // Formatear estado
    const statusLabels = {
      open: "🔓 Abierto",
      in_progress: "⏳ En Progreso",
      resolved: "✅ Resuelto",
      closed: "🔒 Cerrado",
    };
    const statusLabel = statusLabels[ticket.status] || ticket.status || "Abierto";

    // Construir mensaje con bloques de Slack
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🎫 Nuevo Ticket: ${ticket.folio || ticketId}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Solicitante:*\n${employeeName}${employeeEmail ? `\n<mailto:${employeeEmail}|${employeeEmail}>` : ""}`,
          },
          {
            type: "mrkdwn",
            text: `*Prioridad:*\n${priorityInfo.emoji} ${priorityInfo.label}`,
          },
          {
            type: "mrkdwn",
            text: `*Categoría:*\n${categoryLabel}`,
          },
          {
            type: "mrkdwn",
            text: `*Estado:*\n${statusLabel}`,
          },
        ],
      },
    ];

    // Agregar descripción si existe
    if (ticket.description) {
      const description = ticket.description.length > 500
        ? ticket.description.substring(0, 500) + "..."
        : ticket.description;

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Descripción:*\n${description.replace(/\n/g, "\n")}`,
        },
      });
    }

    // Agregar información de máquina si existe
    if (ticket.machineId || ticket.machineSerial) {
      const machineInfo = ticket.machineSerial || ticket.machineId || "N/A";
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Máquina relacionada:*\n${machineInfo}`,
        },
      });
    }

    // Agregar información de elemento si existe
    if (ticket.elementoNombre) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Elemento:*\n${ticket.elementoNombre}`,
        },
      });
    }

    // Agregar botón para ver el ticket
    // Nota: Ajusta esta URL según tu dominio de producción
    const ticketUrl = `https://adrianfv725.github.io/FIXIFY/pages/tickets.html?id=${ticketId}`;
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Ver Ticket en FIXIFY",
          },
          url: ticketUrl,
          style: "primary",
        },
      ],
    });

    // Construir mensaje completo
    const message = {
      channel: IT_USER_ID, // Mensaje directo al usuario
      text: `🎫 Nuevo ticket creado: ${ticket.folio || ticketId}`,
      blocks: blocks,
    };

    // Enviar mensaje a Slack
    const response = await axios.post(
      "https://slack.com/api/chat.postMessage",
      message,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.ok) {
      logger.info("✅ Notificación enviada a Slack exitosamente", {
        ticketId,
        ts: response.data.ts,
      });
    } else {
      logger.error("❌ Error de Slack API", {
        ticketId,
        error: response.data.error,
      });
      throw new Error(`Slack API error: ${response.data.error}`);
    }
  } catch (error) {
    logger.error("❌ Error al enviar notificación a Slack", {
      ticketId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
