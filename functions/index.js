/**
 * Cloud Functions para FIXIFY
 * Notificaciones de Slack cuando se crea un ticket
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const logger = require("firebase-functions/logger");

// Inicializar Firebase Admin
admin.initializeApp();

// Configuración global
setGlobalOptions({ maxInstances: 10 });

// Configuración de Slack - Usar Secrets
const slackBotToken = defineSecret("SLACK_BOT_TOKEN");
const slackItUserId = defineSecret("SLACK_IT_USER_ID");

/**
 * Función que se ejecuta cuando se crea un nuevo ticket en Firestore
 */
exports.notifySlackOnTicketCreated = onDocumentCreated(
  {
    document: "tickets/{ticketId}",
    region: "us-central1",
    secrets: [slackBotToken, slackItUserId],
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

    // Verificar que el ticket fue creado por un empleado (no por admin)
    const createdByEmail = ticket.createdBy;
    if (!createdByEmail) {
      logger.info("Ticket no tiene createdBy, saltando notificación", { ticketId });
      return null;
    }

    // Obtener el usuario que creó el ticket para verificar su rol
    let creatorRole = null;
    try {
      // Buscar en la colección de usuarios
      const usersSnapshot = await admin.firestore()
        .collection("users")
        .where("email", "==", createdByEmail.toLowerCase())
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        creatorRole = userData.role;
        logger.info("Usuario creador encontrado", {
          ticketId,
          email: createdByEmail,
          role: creatorRole
        });
      } else {
        logger.info("Usuario creador no encontrado en users, verificando si es admin por defecto", {
          ticketId,
          email: createdByEmail
        });
        // Si no se encuentra, verificar si es el admin por defecto
        if (createdByEmail.toLowerCase() === "admin@brands.mx") {
          creatorRole = "admin";
        }
      }
    } catch (userError) {
      logger.warn("Error al buscar usuario creador", {
        ticketId,
        email: createdByEmail,
        error: userError.message
      });
    }

    // Solo enviar notificación si el creador es un empleado
    if (creatorRole !== "employee") {
      logger.info("Ticket creado por usuario que no es empleado, saltando notificación", {
        ticketId,
        email: createdByEmail,
        role: creatorRole
      });
      return null;
    }

    // Obtener valores de los secrets
    const SLACK_BOT_TOKEN = slackBotToken.value();
    const IT_USER_ID = slackItUserId.value();

    // Validar que el token esté disponible
    if (!SLACK_BOT_TOKEN) {
      logger.error("Token de Slack no configurado", {
        ticketId,
        hasToken: !!SLACK_BOT_TOKEN,
      });
      return null;
    }

    try {
      // Obtener configuración de Slack desde Firestore
      let slackConfig = null;
      try {
        const configDoc = await admin.firestore().collection("settings").doc("slack").get();
        if (configDoc.exists) {
          slackConfig = configDoc.data();
          
          // Log detallado de lo que se obtuvo
          const rawUserIds = slackConfig.slackUserIds;
          const isArray = Array.isArray(rawUserIds);
          const arrayLength = isArray ? rawUserIds.length : 0;
          const filteredUserIds = isArray 
            ? rawUserIds.filter(id => id && typeof id === 'string' && id.trim() !== '')
            : [];
          
          logger.info("Configuración de Slack obtenida de Firestore", {
            ticketId,
            documentExists: true,
            hasUserIdsProperty: slackConfig.hasOwnProperty('slackUserIds'),
            isArray: isArray,
            rawType: typeof rawUserIds,
            rawValue: rawUserIds,
            arrayLength: arrayLength,
            filteredCount: filteredUserIds.length,
            filteredUserIds: filteredUserIds,
            isEmpty: filteredUserIds.length === 0
          });
        } else {
          logger.info("No existe configuración de Slack en Firestore", { ticketId });
        }
      } catch (configError) {
        logger.warn("No se pudo obtener configuración de Slack, usando valores por defecto", {
          error: configError.message,
          ticketId,
          stack: configError.stack
        });
      }

      // Determinar usuarios a notificar
      let slackUserIds = [];
      let usingConfig = false;
      
      // Si existe configuración de Slack, usar solo esa configuración (incluso si está vacía)
      if (slackConfig) {
        // Verificar si tiene la propiedad slackUserIds (puede ser array vacío)
        if (slackConfig.hasOwnProperty('slackUserIds')) {
          usingConfig = true;
          // Filtrar IDs válidos (no vacíos, no null, no undefined)
          if (Array.isArray(slackConfig.slackUserIds)) {
            slackUserIds = slackConfig.slackUserIds
              .filter(id => id && typeof id === 'string' && id.trim() !== '')
              .map(id => id.trim());
          } else {
            slackUserIds = [];
          }
          logger.info("Usando configuración de Slack desde Firestore", {
            ticketId,
            userIdsCount: slackUserIds.length,
            userIds: slackUserIds,
            originalArrayLength: Array.isArray(slackConfig.slackUserIds) ? slackConfig.slackUserIds.length : 0,
            isEmpty: slackUserIds.length === 0
          });
        } else {
          // El documento existe pero no tiene slackUserIds, tratarlo como array vacío
          usingConfig = true;
          slackUserIds = [];
          logger.info("Configuración de Slack existe pero no tiene slackUserIds, tratando como vacío", {
            ticketId
          });
        }
      }
      
      // Solo usar fallback si NO existe configuración en absoluto
      if (!usingConfig && IT_USER_ID) {
        const cleanUserId = IT_USER_ID.trim().replace(/\n/g, '').replace(/\r/g, '');
        if (cleanUserId) {
          slackUserIds = [cleanUserId];
          logger.info("Usando fallback IT_USER_ID (no hay configuración en Firestore)", {
            ticketId,
            userId: cleanUserId
          });
        }
      }

      // Si no hay usuarios configurados, no enviar notificación
      if (slackUserIds.length === 0) {
        logger.info("No hay usuarios de Slack configurados, saltando notificación", { 
          ticketId,
          hasConfig: !!slackConfig,
          configHasUserIds: slackConfig?.slackUserIds?.length > 0
        });
        return null;
      }

      // Enviar notificaciones a todos los usuarios configurados
      const customMessage = slackConfig?.customMessage || '';
      const results = await sendSlackNotifications(
        ticket,
        ticketId,
        SLACK_BOT_TOKEN,
        slackUserIds,
        customMessage
      );

      logger.info("Notificaciones enviadas", {
        ticketId,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      });
    } catch (error) {
      logger.error("Error al enviar notificación", { 
        ticketId, 
        error: error.message,
        stack: error.stack 
      });
      // No lanzar error para que no falle la creación del ticket
    }

    return null;
  }
);

/**
 * Envía notificaciones de Slack a múltiples usuarios
 */
async function sendSlackNotifications(ticket, ticketId, SLACK_BOT_TOKEN, slackUserIds, customMessage = '') {
  const results = [];
  
  // Limpiar el token
  const cleanToken = SLACK_BOT_TOKEN.trim().replace(/\n/g, '').replace(/\r/g, '');

  if (!cleanToken || !cleanToken.startsWith('xoxb-')) {
    logger.error("Token de Slack inválido", { ticketId });
    return [{ success: false, error: "Token inválido" }];
  }

  // Preparar datos del ticket
  const ticketData = await prepareTicketData(ticket, ticketId);

  // Construir mensaje (personalizado o predeterminado)
  const messageBlocks = customMessage
    ? buildCustomMessage(customMessage, ticketData)
    : buildDefaultMessage(ticketData);

  // Enviar a cada usuario
  for (const userId of slackUserIds) {
    const cleanUserId = userId.trim().replace(/\n/g, '').replace(/\r/g, '');
    if (!cleanUserId) continue;

    try {
      const result = await sendSingleSlackMessage(cleanToken, cleanUserId, messageBlocks, ticketData);
      results.push({ success: true, userId: cleanUserId });
    } catch (error) {
      logger.error(`Error al enviar a usuario ${cleanUserId}`, {
        ticketId,
        userId: cleanUserId,
        error: error.message,
      });
      results.push({ success: false, userId: cleanUserId, error: error.message });
    }
  }

  return results;
}

/**
 * Prepara los datos del ticket para usar en el mensaje
 */
async function prepareTicketData(ticket, ticketId) {
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

  const priorityConfig = {
    critical: { emoji: "🔴", label: "Crítica" },
    high: { emoji: "🟠", label: "Alta" },
    medium: { emoji: "🟡", label: "Media" },
    low: { emoji: "🟢", label: "Baja" },
  };

  const categoryLabels = {
    hardware: "Hardware",
    software: "Software",
    network: "Red",
    other: "Otro",
  };

  const statusLabels = {
    open: "🔓 Abierto",
    in_progress: "⏳ En Progreso",
    resolved: "✅ Resuelto",
    closed: "🔒 Cerrado",
  };

  const priority = ticket.priority || "medium";
  const priorityInfo = priorityConfig[priority] || priorityConfig.medium;

  const ticketUrl = `https://adrianfv725.github.io/FIXIFY/pages/tickets.html?id=${ticketId}`;

  return {
    folio: ticket.folio || ticketId,
    ticketId: ticketId,
    solicitante: employeeName,
    email: employeeEmail,
    prioridad: `${priorityInfo.emoji} ${priorityInfo.label}`,
    categoria: categoryLabels[ticket.category] || ticket.category || "N/A",
    descripcion: ticket.description || "",
    maquina: ticket.machineSerial || ticket.machineId || "",
    elemento: ticket.elementoNombre || "",
    url: ticketUrl,
    estado: statusLabels[ticket.status] || ticket.status || "Abierto",
  };
}

/**
 * Construye mensaje personalizado reemplazando variables
 */
function buildCustomMessage(customMessage, ticketData) {
  let message = customMessage;
  
  // Reemplazar variables
  message = message.replace(/\{folio\}/g, ticketData.folio);
  message = message.replace(/\{ticketId\}/g, ticketData.ticketId);
  message = message.replace(/\{solicitante\}/g, ticketData.solicitante);
  message = message.replace(/\{email\}/g, ticketData.email);
  message = message.replace(/\{prioridad\}/g, ticketData.prioridad);
  message = message.replace(/\{categoria\}/g, ticketData.categoria);
  message = message.replace(/\{descripcion\}/g, ticketData.descripcion);
  message = message.replace(/\{maquina\}/g, ticketData.maquina);
  message = message.replace(/\{elemento\}/g, ticketData.elemento);
  message = message.replace(/\{url\}/g, ticketData.url);

  // Convertir a bloques de Slack simples
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: message,
      },
    },
  ];
}

/**
 * Construye el mensaje predeterminado
 */
function buildDefaultMessage(ticketData) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🎫 Nuevo Ticket: ${ticketData.folio}`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Solicitante:*\n${ticketData.solicitante}${ticketData.email ? `\n<mailto:${ticketData.email}|${ticketData.email}>` : ""}`,
        },
        {
          type: "mrkdwn",
          text: `*Prioridad:*\n${ticketData.prioridad}`,
        },
        {
          type: "mrkdwn",
          text: `*Categoría:*\n${ticketData.categoria}`,
        },
        {
          type: "mrkdwn",
          text: `*Estado:*\n${ticketData.estado}`,
        },
      ],
    },
  ];

  if (ticketData.descripcion) {
    const description = ticketData.descripcion.length > 500
      ? ticketData.descripcion.substring(0, 500) + "..."
      : ticketData.descripcion;

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Descripción:*\n${description.replace(/\n/g, "\n")}`,
      },
    });
  }

  if (ticketData.maquina) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Máquina relacionada:*\n${ticketData.maquina}`,
      },
    });
  }

  if (ticketData.elemento) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Elemento:*\n${ticketData.elemento}`,
      },
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Ver Ticket en FIXIFY",
        },
        url: ticketData.url,
        style: "primary",
      },
    ],
  });

  return blocks;
}

/**
 * Envía un mensaje individual a Slack
 */
async function sendSingleSlackMessage(cleanToken, userId, blocks, ticketData) {
  const message = {
    channel: userId,
    text: `🎫 Nuevo ticket creado: ${ticketData.folio}`,
    blocks: blocks,
  };

  const response = await axios.post(
    "https://slack.com/api/chat.postMessage",
    message,
    {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.data.ok) {
    throw new Error(`Slack API error: ${response.data.error}`);
  }

  return response.data;
}

/**
 * Envía un mensaje directo a Slack con la información del ticket (función legacy - mantener por compatibilidad)
 */
async function sendSlackDM(ticket, ticketId, SLACK_BOT_TOKEN, IT_USER_ID) {
  try {
    // Validar y limpiar las variables de entorno
    if (!SLACK_BOT_TOKEN || !IT_USER_ID) {
      logger.warn("Variables de entorno de Slack no configuradas, saltando notificación", {
        ticketId,
        hasToken: !!SLACK_BOT_TOKEN,
        hasUserId: !!IT_USER_ID,
      });
      return;
    }

    // Limpiar el token de espacios, saltos de línea y caracteres inválidos
    const cleanToken = SLACK_BOT_TOKEN.trim().replace(/\n/g, '').replace(/\r/g, '');
    const cleanUserId = IT_USER_ID.trim().replace(/\n/g, '').replace(/\r/g, '');

    if (!cleanToken || !cleanUserId) {
      logger.error("Token o User ID de Slack están vacíos después de limpiar", {
        ticketId,
        tokenLength: cleanToken ? cleanToken.length : 0,
        userIdLength: cleanUserId ? cleanUserId.length : 0,
      });
      return;
    }

    // Validar formato del token
    if (!cleanToken.startsWith('xoxb-')) {
      logger.error("Token de Slack no tiene el formato correcto", {
        ticketId,
        tokenPrefix: cleanToken.substring(0, 5),
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
      channel: cleanUserId, // Mensaje directo al usuario
      text: `🎫 Nuevo ticket creado: ${ticket.folio || ticketId}`,
      blocks: blocks,
    };

    // Enviar mensaje a Slack
    const response = await axios.post(
      "https://slack.com/api/chat.postMessage",
      message,
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
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
