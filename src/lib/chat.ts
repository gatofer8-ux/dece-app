import { db } from "@/lib/db";
import { generateChatAiResponse } from "@/lib/ai";
import type { ChatChannelSummary, ChatChannelType, Role } from "@/lib/types";
import crypto from "crypto";

export interface ChatMessageDetail {
  id: string;
  channel_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_role: string | null;
  sender_job_title: string | null;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  case_file_id: string | null;
  case_code?: string | null;
  student_name?: string | null;
  created_at: string;
}

/**
 * Garantiza que existan los canales base del colegio (General, Urgencias y Asistente IA)
 * y que el usuario actual forme parte de ellos.
 */
export function ensureDefaultChannels(institutionId: string, userId: string): void {
  if (!institutionId || !userId) return;
  const instExists = db.prepare("SELECT id FROM institutions WHERE id = ?").get(institutionId);
  const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!instExists || !userExists) return;

  const defaultChannels = [
    {
      id: `default_general_${institutionId}`,
      name: "💬 General - Equipo DECE",
      description: "Coordinación general, comunicados y avisos para el equipo DECE y docentes",
      type: "GROUP" as ChatChannelType,
    },
    {
      id: `default_urgencias_${institutionId}`,
      name: "🚨 Casos y Coordinación Urgente",
      description: "Casos prioritarios, medidas de protección emergentes y seguimiento crítico",
      type: "GROUP" as ChatChannelType,
    },
    {
      id: `ai_assistant_${institutionId}_${userId}`,
      name: "🤖 Asistente Virtual DECE (IA)",
      description: "Consultas técnicas de protocolos MINEDUC, redacción de informes y rutas de derivación",
      type: "AI_ASSISTANT" as ChatChannelType,
    },
  ];

  for (const ch of defaultChannels) {
    const exists = db
      .prepare("SELECT id FROM chat_channels WHERE id = ?")
      .get(ch.id);

    if (!exists) {
      db.prepare(`
        INSERT INTO chat_channels (id, institution_id, type, name, description, created_by_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(ch.id, institutionId, ch.type, ch.name, ch.description, userId);

      if (ch.type === "AI_ASSISTANT") {
        db.prepare(`
          INSERT INTO chat_messages (id, channel_id, sender_id, content, created_at)
          VALUES (?, ?, NULL, ?, datetime('now'))
        `).run(
          crypto.randomUUID(),
          ch.id,
          "👋 ¡Hola! Soy tu **Asistente Virtual DECE**.\n\nPuedes hacerme preguntas sobre:\n• **Protocolos de violencia y detección** (Anexo 1 MINEDUC)\n• **Rutas de actuación en riesgo autolítico** o crisis emocional\n• **Formatos oficiales** (Informe Técnico Situacional, Fichas de Observación, Derivaciones)\n• **Estrategias psicosociales** para casos con estudiantes y familias\n\n¿En qué te puedo asesorar hoy?"
        );
      }
    }

    const isMember = db
      .prepare("SELECT id FROM chat_channel_members WHERE channel_id = ? AND user_id = ?")
      .get(ch.id, userId);

    if (!isMember) {
      db.prepare(`
        INSERT INTO chat_channel_members (id, channel_id, user_id, last_read_at, joined_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `).run(crypto.randomUUID(), ch.id, userId);
    }
  }
}

/**
 * Obtiene la lista de canales y chats del usuario con sus resúmenes y no leídos.
 */
export function getUserChannels(institutionId: string, userId: string): ChatChannelSummary[] {
  ensureDefaultChannels(institutionId, userId);

  const channels = db
    .prepare(`
      SELECT 
        c.id,
        c.institution_id,
        c.type,
        c.name,
        c.description,
        c.case_file_id,
        c.created_at,
        c.updated_at,
        m.last_read_at
      FROM chat_channels c
      INNER JOIN chat_channel_members m ON m.channel_id = c.id
      WHERE c.institution_id = ? AND m.user_id = ?
      ORDER BY c.updated_at DESC
    `)
    .all(institutionId, userId) as Array<{
      id: string;
      institution_id: string;
      type: ChatChannelType;
      name: string | null;
      description: string | null;
      case_file_id: string | null;
      created_at: string;
      updated_at: string;
      last_read_at: string;
    }>;

  const results: ChatChannelSummary[] = [];

  for (const ch of channels) {
    const lastMsg = db
      .prepare(`
        SELECT 
          m.id,
          m.content,
          m.created_at,
          COALESCE(u.name, 'Asistente DECE') AS sender_name
        FROM chat_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.channel_id = ?
        ORDER BY m.created_at DESC
        LIMIT 1
      `)
      .get(ch.id) as { id: string; content: string; created_at: string; sender_name: string } | undefined;

    const unreadRow = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM chat_messages
        WHERE channel_id = ? 
          AND created_at > ?
          AND (sender_id IS NULL OR sender_id != ?)
      `)
      .get(ch.id, ch.last_read_at || "1970-01-01", userId) as { count: number };

    let otherUser: { id: string; name: string; email: string; role: Role; job_title?: string | null } | null = null;
    let displayName = ch.name || "Conversación";

    if (ch.type === "DIRECT") {
      const otherMember = db
        .prepare(`
          SELECT u.id, u.name, u.email, u.role, u.job_title
          FROM chat_channel_members m
          JOIN users u ON u.id = m.user_id
          WHERE m.channel_id = ? AND m.user_id != ?
          LIMIT 1
        `)
        .get(ch.id, userId) as { id: string; name: string; email: string; role: Role; job_title?: string | null } | undefined;

      if (otherMember) {
        otherUser = otherMember;
        displayName = otherMember.name;
      }
    }

    let caseCode: string | null = null;
    if (ch.case_file_id) {
      const caseRow = db
        .prepare("SELECT code FROM case_files WHERE id = ?")
        .get(ch.case_file_id) as { code: string } | undefined;
      if (caseRow) caseCode = caseRow.code;
    }

    const memberCountRow = db
      .prepare("SELECT COUNT(*) as count FROM chat_channel_members WHERE channel_id = ?")
      .get(ch.id) as { count: number };

    results.push({
      id: ch.id,
      institution_id: ch.institution_id,
      type: ch.type,
      name: displayName,
      description: ch.description,
      case_file_id: ch.case_file_id,
      case_code: caseCode,
      last_message: lastMsg ? {
        id: lastMsg.id,
        content: lastMsg.content,
        sender_name: lastMsg.sender_name,
        created_at: lastMsg.created_at,
      } : null,
      unread_count: unreadRow?.count || 0,
      members_count: memberCountRow?.count || 1,
      other_user: otherUser,
    });
  }

  return results;
}

/**
 * Obtiene o crea un chat directo (1 a 1) entre dos usuarios de la misma institución.
 */
export function getOrCreateDirectChannel(
  institutionId: string,
  currentUserId: string,
  targetUserId: string
): string {
  const existing = db
    .prepare(`
      SELECT c.id
      FROM chat_channels c
      JOIN chat_channel_members m1 ON m1.channel_id = c.id AND m1.user_id = ?
      JOIN chat_channel_members m2 ON m2.channel_id = c.id AND m2.user_id = ?
      WHERE c.institution_id = ? AND c.type = 'DIRECT'
      LIMIT 1
    `)
    .get(currentUserId, targetUserId, institutionId) as { id: string } | undefined;

  if (existing) {
    return existing.id;
  }

  const channelId = crypto.randomUUID();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO chat_channels (id, institution_id, type, name, created_by_id, created_at, updated_at)
      VALUES (?, ?, 'DIRECT', NULL, ?, datetime('now'), datetime('now'))
    `).run(channelId, institutionId, currentUserId);

    db.prepare(`
      INSERT INTO chat_channel_members (id, channel_id, user_id, last_read_at, joined_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(crypto.randomUUID(), channelId, currentUserId);

    db.prepare(`
      INSERT INTO chat_channel_members (id, channel_id, user_id, last_read_at, joined_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(crypto.randomUUID(), channelId, targetUserId);
  })();

  return channelId;
}

/**
 * Crea un canal grupal o asociado a un caso.
 */
export function createGroupChannel(opts: {
  institutionId: string;
  createdById: string;
  name: string;
  description?: string;
  type?: ChatChannelType;
  caseFileId?: string;
  memberUserIds?: string[];
}): string {
  const channelId = crypto.randomUUID();
  const channelType = opts.type || (opts.caseFileId ? "CASE" : "GROUP");

  db.transaction(() => {
    db.prepare(`
      INSERT INTO chat_channels (id, institution_id, type, name, description, case_file_id, created_by_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      channelId,
      opts.institutionId,
      channelType,
      opts.name,
      opts.description || null,
      opts.caseFileId || null,
      opts.createdById
    );

    db.prepare(`
      INSERT INTO chat_channel_members (id, channel_id, user_id, last_read_at, joined_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(crypto.randomUUID(), channelId, opts.createdById);

    if (opts.memberUserIds && opts.memberUserIds.length > 0) {
      for (const uid of opts.memberUserIds) {
        if (uid !== opts.createdById) {
          db.prepare(`
            INSERT OR IGNORE INTO chat_channel_members (id, channel_id, user_id, last_read_at, joined_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
          `).run(crypto.randomUUID(), channelId, uid);
        }
      }
    }
  })();

  return channelId;
}

/**
 * Obtiene los mensajes de un canal con paginación y nombres de usuario.
 */
export function getChannelMessages(channelId: string, limit = 100, afterTimestamp?: string): ChatMessageDetail[] {
  let query = `
    SELECT 
      m.id,
      m.channel_id,
      m.sender_id,
      COALESCE(u.name, 'Asistente DECE IA') AS sender_name,
      u.role AS sender_role,
      u.job_title AS sender_job_title,
      m.content,
      m.attachment_url,
      m.attachment_name,
      m.case_file_id,
      cf.code AS case_code,
      st.full_name AS student_name,
      m.created_at
    FROM chat_messages m
    LEFT JOIN users u ON u.id = m.sender_id
    LEFT JOIN case_files cf ON cf.id = m.case_file_id
    LEFT JOIN students st ON st.id = cf.student_id
    WHERE m.channel_id = ?
  `;

  const params: any[] = [channelId];

  if (afterTimestamp) {
    query += ` AND m.created_at > ?`;
    params.push(afterTimestamp);
  }

  query += ` ORDER BY m.created_at ASC LIMIT ?`;
  params.push(limit);

  return db.prepare(query).all(...params) as ChatMessageDetail[];
}

/**
 * Envía un mensaje en un canal. Si el canal es de tipo Asistente IA, genera la respuesta automática.
 */
export async function sendMessage(opts: {
  channelId: string;
  senderId: string | null;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  caseFileId?: string | null;
}): Promise<ChatMessageDetail> {
  const messageId = crypto.randomUUID();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO chat_messages (id, channel_id, sender_id, content, attachment_url, attachment_name, case_file_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      messageId,
      opts.channelId,
      opts.senderId,
      opts.content,
      opts.attachmentUrl || null,
      opts.attachmentName || null,
      opts.caseFileId || null
    );

    db.prepare(`
      UPDATE chat_channels
      SET updated_at = datetime('now')
      WHERE id = ?
    `).run(opts.channelId);

    if (opts.senderId) {
      db.prepare(`
        UPDATE chat_channel_members
        SET last_read_at = datetime('now')
        WHERE channel_id = ? AND user_id = ?
      `).run(opts.channelId, opts.senderId);
    }
  })();

  const createdMsg = db
    .prepare(`
      SELECT 
        m.id,
        m.channel_id,
        m.sender_id,
        COALESCE(u.name, 'Asistente DECE IA') AS sender_name,
        u.role AS sender_role,
        u.job_title AS sender_job_title,
        m.content,
        m.attachment_url,
        m.attachment_name,
        m.case_file_id,
        cf.code AS case_code,
        st.full_name AS student_name,
        m.created_at
      FROM chat_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      LEFT JOIN case_files cf ON cf.id = m.case_file_id
      LEFT JOIN students st ON st.id = cf.student_id
      WHERE m.id = ?
    `)
    .get(messageId) as ChatMessageDetail;

  const channel = db
    .prepare("SELECT type FROM chat_channels WHERE id = ?")
    .get(opts.channelId) as { type: ChatChannelType } | undefined;

  if (channel?.type === "AI_ASSISTANT" && opts.senderId !== null) {
    try {
      const aiReply = await generateChatAiResponse({ userMessage: opts.content });
      const aiMessageId = crypto.randomUUID();

      db.transaction(() => {
        db.prepare(`
          INSERT INTO chat_messages (id, channel_id, sender_id, content, created_at)
          VALUES (?, ?, NULL, ?, datetime('now'))
        `).run(aiMessageId, opts.channelId, aiReply);

        db.prepare(`
          UPDATE chat_channels
          SET updated_at = datetime('now')
          WHERE id = ?
        `).run(opts.channelId);
      })();
    } catch (e) {
      console.error("[chat] Error al generar respuesta IA:", e);
    }
  }

  return createdMsg;
}

/**
 * Marca un canal como leído para el usuario.
 */
export function markChannelAsRead(channelId: string, userId: string): void {
  db.prepare(`
    UPDATE chat_channel_members
    SET last_read_at = datetime('now')
    WHERE channel_id = ? AND user_id = ?
  `).run(channelId, userId);
}

/**
 * Obtiene el número total de mensajes no leídos para el usuario (usado en la barra lateral).
 */
export function getTotalUnreadCount(institutionId: string, userId: string): number {
  try {
    const row = db
      .prepare(`
        SELECT COUNT(m.id) AS unread_total
        FROM chat_channel_members mem
        JOIN chat_channels c ON c.id = mem.channel_id
        JOIN chat_messages m ON m.channel_id = c.id
        WHERE c.institution_id = ?
          AND mem.user_id = ?
          AND m.created_at > mem.last_read_at
          AND (m.sender_id IS NULL OR m.sender_id != ?)
      `)
      .get(institutionId, userId, userId) as { unread_total: number } | undefined;

    return row?.unread_total || 0;
  } catch {
    return 0;
  }
}

/**
 * Lista los usuarios de la institución para iniciar un nuevo chat directo.
 */
export function getAvailableChatUsers(institutionId: string, currentUserId: string): Array<{
  id: string;
  name: string;
  email: string;
  role: Role;
  job_title: string | null;
}> {
  return db
    .prepare(`
      SELECT id, name, email, role, job_title
      FROM users
      WHERE institution_id = ? AND id != ? AND active = 1
      ORDER BY name ASC
    `)
    .all(institutionId, currentUserId) as any[];
}
