import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { getUserChannels, getAvailableChatUsers } from "@/lib/chat";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DOCENTE"]);
  const institutionId = requireInstitutionId(session);

  const initialChannels = getUserChannels(institutionId, session.user.id);
  const availableUsers = getAvailableChatUsers(institutionId, session.user.id);

  // Casos activos para vinculación rápida
  const cases = db
    .prepare(`
      SELECT cf.id, cf.code, st.full_name AS student_name, cf.risk_type
      FROM case_files cf
      JOIN students st ON st.id = cf.student_id
      WHERE cf.institution_id = ?
      ORDER BY cf.created_at DESC
      LIMIT 50
    `)
    .all(institutionId) as Array<{ id: string; code: string; student_name: string; risk_type: string }>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-4 sm:-m-6 lg:-m-8">
      <ChatClient
        currentUserId={session.user.id}
        currentUserName={session.user.name || "Usuario"}
        currentUserRole={session.user.role}
        initialChannels={initialChannels}
        availableUsers={availableUsers}
        availableCases={cases}
      />
    </div>
  );
}