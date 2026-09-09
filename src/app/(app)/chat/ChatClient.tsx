"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChatChannelSummary, Role } from "@/lib/types";
import type { ChatMessageDetail } from "@/lib/chat";
import VoiceDictationButton from "@/components/VoiceDictationButton";

interface ChatClientProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: Role;
  initialChannels: ChatChannelSummary[];
  availableUsers: Array<{ id: string; name: string; email: string; role: Role; job_title: string | null }>;
  availableCases: Array<{ id: string; code: string; student_name: string; risk_type: string }>;
}

export default function ChatClient({
  currentUserId,
  currentUserName,
  currentUserRole,
  initialChannels,
  availableUsers,
  availableCases,
}: ChatClientProps) {
  const [channels, setChannels] = useState<ChatChannelSummary[]>(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    initialChannels.length > 0 ? initialChannels[0].id : null
  );
  const [messages, setMessages] = useState<ChatMessageDetail[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"direct" | "group">("direct");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupCaseId, setNewGroupCaseId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    if (!activeChannelId) return;

    let isMounted = true;
    setLoadingMessages(true);

    fetch(`/api/chat/channels/${activeChannelId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.messages) {
          setMessages(data.messages);
          fetch(`/api/chat/channels/${activeChannelId}/read`, { method: "POST" });
          setChannels((prev) =>
            prev.map((c) => (c.id === activeChannelId ? { ...c, unread_count: 0 } : c))
          );
        }
      })
      .catch((err) => console.error("Error al cargar mensajes:", err))
      .finally(() => {
        if (isMounted) {
          setLoadingMessages(false);
          setTimeout(() => scrollToBottom(false), 50);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeChannelId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/chat/channels")
        .then((res) => res.json())
        .then((data) => {
          if (data.channels) {
            setChannels(data.channels);
          }
        })
        .catch(() => {});

      if (activeChannelId) {
        const lastMsg = messages[messages.length - 1];
        const afterQuery = lastMsg ? `?after=${encodeURIComponent(lastMsg.created_at)}` : "";
        fetch(`/api/chat/channels/${activeChannelId}/messages${afterQuery}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.messages && data.messages.length > 0) {
              setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const newOnes = data.messages.filter((m: ChatMessageDetail) => !existingIds.has(m.id));
                if (newOnes.length > 0) {
                  setTimeout(() => scrollToBottom(true), 50);
                  fetch(`/api/chat/channels/${activeChannelId}/read`, { method: "POST" });
                  return [...prev, ...newOnes];
                }
                return prev;
              });
            }
          })
          .catch(() => {});
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeChannelId, messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if ((!text && !attachment) || !activeChannelId || isSubmitting) return;

    setIsSubmitting(true);
    const channelId = activeChannelId;
    const isAiChannel = activeChannel?.type === "AI_ASSISTANT";

    if (isAiChannel) {
      setIsAiTyping(true);
    }

    const payload = {
      content: text,
      caseFileId: selectedCaseId || undefined,
      attachmentUrl: attachment?.url || undefined,
      attachmentName: attachment?.name || undefined,
    };

    setInputText("");
    setAttachment(null);
    setSelectedCaseId(null);

    try {
      const res = await fetch(`/api/chat/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => scrollToBottom(true), 50);

        if (isAiChannel) {
          setTimeout(async () => {
            const r = await fetch(`/api/chat/channels/${channelId}/messages`);
            const d = await r.json();
            if (d.messages) {
              setMessages(d.messages);
              setTimeout(() => scrollToBottom(true), 50);
            }
            setIsAiTyping(false);
          }, 1200);
        }
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      setIsAiTyping(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAttachment({
        url: dataUrl,
        name: file.name,
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleStartDirectChat = async (targetUserId: string) => {
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (data.channelId) {
        setIsNewChatModalOpen(false);
        const chanRes = await fetch("/api/chat/channels");
        const chanData = await chanRes.json();
        if (chanData.channels) {
          setChannels(chanData.channels);
        }
        setActiveChannelId(data.channelId);
        setShowMobileList(false);
      }
    } catch (err) {
      console.error("Error al iniciar chat directo:", err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
          caseFileId: newGroupCaseId || undefined,
          memberUserIds: selectedMemberIds,
        }),
      });
      const data = await res.json();
      if (data.channelId) {
        setIsNewChatModalOpen(false);
        setNewGroupName("");
        setNewGroupDesc("");
        setNewGroupCaseId("");
        setSelectedMemberIds([]);
        const chanRes = await fetch("/api/chat/channels");
        const chanData = await chanRes.json();
        if (chanData.channels) {
          setChannels(chanData.channels);
        }
        setActiveChannelId(data.channelId);
        setShowMobileList(false);
      }
    } catch (err) {
      console.error("Error al crear canal:", err);
    }
  };

  const filteredChannels = channels.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.other_user && c.other_user.name.toLowerCase().includes(q)) ||
      (c.case_code && c.case_code.toLowerCase().includes(q))
    );
  });

  const aiChannels = filteredChannels.filter((c) => c.type === "AI_ASSISTANT");
  const groupChannels = filteredChannels.filter((c) => c.type === "GROUP" || c.type === "CASE");
  const directChannels = filteredChannels.filter((c) => c.type === "DIRECT");

  const filteredUsers = availableUsers.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.job_title && u.job_title.toLowerCase().includes(q));
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* COLUMNA IZQUIERDA */}
      <div
        className={`${
          showMobileList ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 bg-gray-50 shrink-0`}
      >
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <span>💬</span> Mensajería DECE
            </h2>
            <p className="text-xs text-gray-500">Canales institucionales y chat directo</p>
          </div>
          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="p-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 transition-all active:scale-95"
            title="Nuevo chat o canal"
          >
            <span className="text-sm">➕</span>
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>

        <div className="p-3 border-b border-gray-200 bg-white/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {aiChannels.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                <span>🤖</span> Asistente Inteligente
              </div>
              <div className="space-y-1 mt-1">
                {aiChannels.map((c) => (
                  <ChannelItem
                    key={c.id}
                    channel={c}
                    isActive={c.id === activeChannelId}
                    onClick={() => {
                      setActiveChannelId(c.id);
                      setShowMobileList(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>📢</span> Canales del Equipo
              </span>
              <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full">
                {groupChannels.length}
              </span>
            </div>
            <div className="space-y-1 mt-1">
              {groupChannels.map((c) => (
                <ChannelItem
                  key={c.id}
                  channel={c}
                  isActive={c.id === activeChannelId}
                  onClick={() => {
                    setActiveChannelId(c.id);
                    setShowMobileList(false);
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>👤</span> Mensajes Directos
              </span>
              <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full">
                {directChannels.length}
              </span>
            </div>
            <div className="space-y-1 mt-1">
              {directChannels.length > 0 ? (
                directChannels.map((c) => (
                  <ChannelItem
                    key={c.id}
                    channel={c}
                    isActive={c.id === activeChannelId}
                    onClick={() => {
                      setActiveChannelId(c.id);
                      setShowMobileList(false);
                    }}
                  />
                ))
              ) : (
                <div className="px-3 py-3 text-center text-xs text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
                  Sin conversaciones privadas aún.
                  <button
                    onClick={() => {
                      setNewChatTab("direct");
                      setIsNewChatModalOpen(true);
                    }}
                    className="block mx-auto mt-1 text-brand-700 font-semibold hover:underline"
                  >
                    + Enviar mensaje a un docente o psicólogo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA */}
      <div
        className={`${
          !showMobileList ? "flex" : "hidden"
        } md:flex flex-1 flex-col bg-white overflow-hidden`}
      >
        {activeChannel ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowMobileList(true)}
                  className="md:hidden p-1.5 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Volver a la lista"
                >
                  ◀
                </button>

                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-brand-100 text-brand-900 border border-brand-200">
                  {activeChannel.type === "AI_ASSISTANT" ? (
                    "🤖"
                  ) : activeChannel.type === "DIRECT" ? (
                    activeChannel.name.charAt(0).toUpperCase()
                  ) : activeChannel.case_code ? (
                    "📁"
                  ) : (
                    "👥"
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm truncate">
                      {activeChannel.name}
                    </h3>
                    {activeChannel.case_code && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                        Caso {activeChannel.case_code}
                      </span>
                    )}
                    {activeChannel.type === "AI_ASSISTANT" && (
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                        Asistente DECE IA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {activeChannel.description ||
                      (activeChannel.other_user
                        ? `${activeChannel.other_user.role} · ${activeChannel.other_user.email}`
                        : `${activeChannel.members_count} participantes`)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeChannel.case_file_id && (
                  <Link
                    href={`/casos/${activeChannel.case_file_id}`}
                    prefetch={false}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 rounded-md hover:bg-blue-100 transition"
                  >
                    📂 Ver Caso
                  </Link>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-700 mr-2"></div>
                  Cargando mensajes...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6">
                  <div className="text-4xl mb-2">💬</div>
                  <div className="font-semibold text-gray-600 text-sm">Comienza la conversación</div>
                  <p className="text-xs max-w-xs mt-1">
                    Envía un mensaje o comparte documentos de trabajo con tu equipo.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  const isAi = msg.sender_id === null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isMine ? "items-end" : "items-start"
                      } max-w-full`}
                    >
                      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                        {!isMine && (
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${
                              isAi
                                ? "bg-purple-700 text-white"
                                : "bg-gray-200 text-gray-800 border border-gray-300"
                            }`}
                          >
                            {isAi ? "🤖" : msg.sender_name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-2.5 shadow-xs text-sm ${
                            isMine
                              ? "bg-brand-900 text-white rounded-br-none"
                              : isAi
                              ? "bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 text-gray-900 rounded-bl-none"
                              : "bg-white border border-gray-200 text-gray-900 rounded-bl-none"
                          }`}
                        >
                          {!isMine && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-bold text-xs text-brand-900">
                                {msg.sender_name}
                              </span>
                              {msg.sender_role && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium">
                                  {msg.sender_role}
                                </span>
                              )}
                            </div>
                          )}

                          {msg.case_code && (
                            <Link
                              href={`/casos/${msg.case_file_id}`}
                              prefetch={false}
                              className={`block mb-2 p-2 rounded-lg text-xs font-semibold transition ${
                                isMine
                                  ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                                  : "bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200"
                              }`}
                            >
                              📁 Expediente Relacionado: {msg.case_code}
                              {msg.student_name && ` · ${msg.student_name}`}
                            </Link>
                          )}

                          <div className="whitespace-pre-line leading-relaxed break-words text-[13px]">
                            {msg.content}
                          </div>

                          {msg.attachment_url && (
                            <div className="mt-2 pt-2 border-t border-current/10">
                              <a
                                href={msg.attachment_url}
                                download={msg.attachment_name || "adjunto"}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs ${
                                  isMine
                                    ? "bg-white text-brand-900 hover:bg-brand-50"
                                    : "bg-brand-900 text-white hover:bg-brand-800"
                                }`}
                              >
                                <span>📎</span>
                                <span className="truncate max-w-[200px]">
                                  {msg.attachment_name || "Descargar Archivo"}
                                </span>
                              </a>
                            </div>
                          )}

                          <div
                            className={`text-[10px] mt-1 text-right ${
                              isMine ? "text-blue-200" : "text-gray-400"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isAiTyping && (
                <div className="flex items-center gap-2 text-xs text-purple-700 italic bg-purple-50 p-2.5 rounded-xl border border-purple-200 w-fit">
                  <span className="animate-pulse">🤖 El Asistente DECE IA está analizando y respondiendo...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-gray-200 bg-white">
              {selectedCaseId && (
                <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg text-xs text-blue-900">
                  <span>📁 Adjuntar caso:</span>
                  <span className="font-bold">
                    {availableCases.find((c) => c.id === selectedCaseId)?.code} -{" "}
                    {availableCases.find((c) => c.id === selectedCaseId)?.student_name}
                  </span>
                  <button
                    onClick={() => setSelectedCaseId(null)}
                    className="ml-auto text-gray-500 hover:text-red-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {attachment && (
                <div className="mb-2 flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1 rounded-lg text-xs text-green-900">
                  <span>📎 Archivo adjunto:</span>
                  <span className="font-bold truncate max-w-xs">{attachment.name}</span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="ml-auto text-gray-500 hover:text-red-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <select
                  value={selectedCaseId || ""}
                  onChange={(e) => setSelectedCaseId(e.target.value || null)}
                  className="hidden sm:block text-xs bg-gray-100 border border-gray-300 rounded-lg px-2 py-2 text-gray-700 max-w-[130px] truncate focus:outline-none focus:ring-1 focus:ring-brand-500"
                  title="Vincular con un expediente de caso"
                >
                  <option value="">📁 Caso...</option>
                  {availableCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.student_name}
                    </option>
                  ))}
                </select>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-gray-500 hover:text-brand-900 hover:bg-gray-100 rounded-lg transition"
                  title="Adjuntar documento o imagen"
                >
                  {isUploading ? "⏳" : "📎"}
                </button>

                <div className="shrink-0" title="Dictado por voz">
                  <VoiceDictationButton targetId="chat-message-input" />
                </div>

                <div className="flex-1 relative">
                  <textarea
                    id="chat-message-input"
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      activeChannel.type === "AI_ASSISTANT"
                        ? "Haz una consulta técnica o normativa al Asistente DECE IA..."
                        : "Escribe un mensaje... (Enter para enviar, Shift+Enter nueva línea)"
                    }
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none max-h-32 leading-tight"
                  />
                </div>

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachment) || isSubmitting}
                  className="p-2.5 bg-brand-900 hover:bg-brand-800 disabled:opacity-40 text-white rounded-xl shadow-sm transition active:scale-95 shrink-0 font-bold"
                  title="Enviar mensaje"
                >
                  ➤
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
            <div className="text-5xl mb-3">💬</div>
            <h3 className="font-bold text-gray-800 text-lg">Centro de Mensajería DECE</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Selecciona un canal de equipo o una conversación directa de la izquierda para comenzar.
            </p>
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-4 px-4 py-2 bg-brand-900 text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-brand-800"
            >
              ➕ Iniciar nueva conversación
            </button>
          </div>
        )}
      </div>

      {/* MODAL NUEVO CHAT */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base">Nueva Conversación</h3>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setNewChatTab("direct")}
                className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                  newChatTab === "direct"
                    ? "border-brand-900 text-brand-900 bg-brand-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                👤 Mensaje Directo
              </button>
              <button
                onClick={() => setNewChatTab("group")}
                className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition ${
                  newChatTab === "group"
                    ? "border-brand-900 text-brand-900 bg-brand-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                👥 Nuevo Canal / Grupo
              </button>
            </div>

            <div className="p-5">
              {newChatTab === "direct" ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Buscar docente o profesional..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-gray-100">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleStartDirectChat(u.id)}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 flex items-center justify-between transition group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-gray-900 group-hover:text-brand-900">
                                {u.name}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {u.job_title || u.role} · {u.email}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-brand-700 font-bold opacity-0 group-hover:opacity-100">
                            Chatear →
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-gray-400">
                        No se encontraron usuarios activos.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nombre del Canal *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Comisión de Convivencia, Caso Urgente 8vo A..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Descripción (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Propósito del canal..."
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Vincular a Caso (Opcional)
                    </label>
                    <select
                      value={newGroupCaseId}
                      onChange={(e) => setNewGroupCaseId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">-- Ninguno (Canal General) --</option>
                      {availableCases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.student_name} ({c.risk_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsNewChatModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!newGroupName.trim()}
                      className="px-4 py-2 bg-brand-900 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-brand-800 disabled:opacity-40"
                    >
                      Crear Canal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: ChatChannelSummary;
  isActive: boolean;
  onClick: () => void;
}) {
  const isAi = channel.type === "AI_ASSISTANT";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-3 relative ${
        isActive
          ? "bg-brand-900 text-white shadow-xs font-semibold"
          : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-200/70"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          isActive
            ? "bg-white/20 text-white"
            : isAi
            ? "bg-purple-100 text-purple-900"
            : "bg-brand-100 text-brand-900"
        }`}
      >
        {isAi ? "🤖" : channel.type === "DIRECT" ? channel.name.charAt(0).toUpperCase() : "📢"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold truncate">{channel.name}</div>
          {channel.last_message && (
            <div
              className={`text-[10px] shrink-0 ${
                isActive ? "text-blue-200" : "text-gray-400"
              }`}
            >
              {new Date(channel.last_message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <div
            className={`text-[11px] truncate ${
              isActive ? "text-blue-100" : "text-gray-500"
            }`}
          >
            {channel.last_message ? (
              <span>
                {channel.last_message.sender_name ? `${channel.last_message.sender_name.split(" ")[0]}: ` : ""}
                {channel.last_message.content}
              </span>
            ) : (
              <span className="italic">Sin mensajes</span>
            )}
          </div>

          {channel.unread_count > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full shrink-0">
              {channel.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
