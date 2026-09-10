"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { uploadAttachment, deleteAttachment, type ActionState } from "./attachments-actions";
import Link from "next/link";
import { formatDateTime } from "@/components/ui";
import { type AttachmentRow, type PresenterRole, PRESENTER_ROLE_LABELS } from "@/lib/types";

const initialState: ActionState = { error: null };

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-xs w-full disabled:opacity-60">
      {pending ? "Subiendo..." : "Subir archivo"}
    </button>
  );
}

export default function AttachmentsSection({ caseId, attachments }: { caseId: string; attachments: AttachmentRow[] }) {
  const uploadForThisCase = uploadAttachment.bind(null, caseId);
  const [state, formAction] = useFormState(uploadForThisCase, initialState);
  useToastOnChange(state.error, "error");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleDelete(attachmentId: string, filename: string) {
    if (!confirm(`¿Borrar el archivo "${filename}"? Esta acción no se puede deshacer.`)) return;
    await deleteAttachment(attachmentId, caseId);
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">📎 Archivos adjuntos</h2>
        <Link
          href={`/casos/${caseId}/carga-inteligente`}
          className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 border border-purple-200 px-2 py-1 rounded flex items-center gap-1 transition shadow-2xs hover:bg-purple-100"
          title="Digitalizar documento físico mediante OCR local"
        >
          <span>📷</span> Carga Inteligente (OCR)
        </Link>
      </div>

      <div className="space-y-2 mb-3">
        {attachments.length === 0 && <p className="text-sm text-slate-400">Sin archivos adjuntos.</p>}
        {attachments.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-2 text-sm border-b border-slate-100 pb-2">
            <div>
              <a
                href={`/api/attachments/${a.id}`}
                className="text-brand-700 hover:underline truncate block font-medium"
                title={a.filename}
              >
                {a.filename}
              </a>
              {a.presented_by_role && (
                <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-medium inline-block mt-0.5">
                  👤 Presentado por: {PRESENTER_ROLE_LABELS[a.presented_by_role as PresenterRole] || a.presented_by_role}
                  {a.presented_by_name ? ` (${a.presented_by_name})` : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <span className="text-xs text-slate-400" title={formatDateTime(a.uploaded_at)}>{formatFileSize(a.size)}</span>
              <button
                type="button"
                onClick={() => handleDelete(a.id, a.filename)}
                className="text-xs text-red-600 hover:underline"
                title="Borrar"
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      <details>
        <summary className="text-xs text-brand-700 hover:underline cursor-pointer">+ Subir archivo</summary>
        <form
          ref={formRef}
          action={async (fd: FormData) => {
            await formAction(fd);
            formRef.current?.reset();
          }}
          className="space-y-2 mt-3"
        >
          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</div>
          )}
          <input
            type="file"
            name="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
            className="input text-xs !py-1.5"
          />
          <p className="text-xs text-slate-400">PDF, imágenes, Word o Excel — máximo 15 MB.</p>
          <SubmitButton />
        </form>
      </details>
    </section>
  );
}
