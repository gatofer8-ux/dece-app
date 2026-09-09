"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge, StatCard, formatDate } from "@/components/ui";
import { ROLE_LABELS, type Role } from "@/lib/types";
import CreateInstitutionModal from "./CreateInstitutionModal";
import CreateUserModal from "./CreateUserModal";
import EditUserModal from "./EditUserModal";
import EditInstitutionModal from "./EditInstitutionModal";
import ResetPasswordModal from "./ResetPasswordModal";
import SecureDeleteModal from "./SecureDeleteModal";
import EditGlobalRateModal from "./EditGlobalRateModal";
import EditPackageModal from "./EditPackageModal";
import RenewUserSubscriptionModal from "./RenewUserSubscriptionModal";
import BatchRenewUsersModal from "./BatchRenewUsersModal";
import AssignUserSubscriptionModal from "./AssignUserSubscriptionModal";
import ForceUserPriceChangeModal from "./ForceUserPriceChangeModal";
import ReassignInstitutionModal from "./ReassignInstitutionModal";
import {
  toggleInstitutionActiveSuperadmin,
  toggleUserActiveSuperadmin,
  deactivateUserAction,
  reactivateUserAction,
  deactivateInstitutionAction,
  reactivateInstitutionAction,
} from "./actions";
import { toggleUserSuspensionAction } from "./subscription-actions";

interface InstitutionData {
  id: string;
  name: string;
  amie_code: string | null;
  district: string | null;
  circuit: string | null;
  zona: string | null;
  address?: string | null;
  active: number;
  created_at: string;
  usersCount: number;
  studentsCount: number;
  casesCount: number;
  openCasesCount: number;
  activeSubsCount: number;
  trialSubsCount: number;
  suspendedSubsCount: number;
  demoSubsCount: number;
}

interface UserData {
  id: string;
  institution_id: string | null;
  institution_name: string | null;
  name: string;
  email: string;
  role: Role;
  active: number;
  phone: string | null;
  created_at: string;
  subscription: {
    id: string;
    status: "activo" | "en_prueba" | "suspendido" | "cancelado" | "demo";
    package_id: string | null;
    package_name: string;
    billing_type: string;
    frozen_price: number;
    frozen_duration_months: number;
    frozen_duration_days: number;
    start_date: string;
    end_date: string | null;
    days_left: number | null;
    is_overdue: boolean;
    is_demo: boolean;
    is_trial: boolean;
    is_read_only: boolean;
    last_renewed_at: string | null;
    notes: string | null;
  };
}

interface AuditLogData {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

interface SubscriptionPackageData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  billing_period: string;
  max_users: number | null;
  is_active: number;
}

interface UserSubscriptionHistoryData {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  institution_id_snapshot?: string | null;
  institution_name?: string | null;
  event_type: string;
  billing_type: string;
  package_name: string;
  frozen_price: number;
  start_date: string;
  end_date: string | null;
  executed_by_name?: string;
  reason: string | null;
  created_at: string;
}

export default function SuperadminDashboard({
  currentUserId,
  institutions,
  users,
  auditLogs,
  globalUserRate,
  subscriptionPackages,
  userSubscriptionHistory,
  upcomingExpiringUsers,
}: {
  currentUserId: string;
  institutions: InstitutionData[];
  users: UserData[];
  auditLogs: AuditLogData[];
  globalUserRate: string;
  subscriptionPackages: SubscriptionPackageData[];
  userSubscriptionHistory: UserSubscriptionHistoryData[];
  upcomingExpiringUsers: UserData[];
}) {
  const [activeTab, setActiveTab] = useState<"usuarios" | "suscripciones" | "instituciones" | "auditoria">("usuarios");

  // Filtros instituciones
  const [instSearch, setInstSearch] = useState("");
  const [instStatusFilter, setInstStatusFilter] = useState<"TODAS" | "ACTIVAS" | "INACTIVAS">("TODAS");
  const [instSubTab, setInstSubTab] = useState<"ACTIVAS" | "INACTIVAS">("ACTIVAS");

  // Filtros usuarios
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("TODOS");
  const [userInstFilter, setUserInstFilter] = useState<string>("TODAS");
  const [userSubTab, setUserSubTab] = useState<"ACTIVOS" | "INACTIVOS">("ACTIVOS");

  // Banner de confirmación para borrado lógico y reactivación
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtro suscripciones
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState<string>("TODAS");

  // Multi-selección para renovación en lote
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Modal de borrado seguro con contraseña
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    targetType: "institution" | "user";
    targetId: string;
    targetName: string;
  }>({
    isOpen: false,
    targetType: "institution",
    targetId: "",
    targetName: "",
  });

  const filteredInstitutions = institutions.filter((i) => {
    const q = instSearch.toLowerCase();
    const matchSearch =
      i.name.toLowerCase().includes(q) ||
      (i.amie_code && i.amie_code.toLowerCase().includes(q)) ||
      (i.district && i.district.toLowerCase().includes(q));

    const matchStatus =
      instSubTab === "ACTIVAS" ? i.active === 1 : i.active === 0;

    return matchSearch && matchStatus;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.institution_name && u.institution_name.toLowerCase().includes(q));

    const matchRole = userRoleFilter === "TODOS" || u.role === userRoleFilter;

    const matchInst =
      userInstFilter === "TODAS" ||
      (userInstFilter === "CENTRAL" && !u.institution_id) ||
      u.institution_id === userInstFilter;

    const matchActive = userSubTab === "ACTIVOS" ? u.active === 1 : u.active === 0;

    return matchSearch && matchRole && matchInst && matchActive;
  });

  const filteredSubscriptionUsers = users.filter((u) => {
    const q = subSearch.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.institution_name && u.institution_name.toLowerCase().includes(q)) ||
      u.subscription.package_name.toLowerCase().includes(q);

    const matchStatus =
      subStatusFilter === "TODAS" ||
      (subStatusFilter === "ACTIVAS" && u.subscription.status === "activo") ||
      (subStatusFilter === "EN_PRUEBA" && u.subscription.status === "en_prueba") ||
      (subStatusFilter === "SUSPENDIDAS" && (u.subscription.status === "suspendido" || u.subscription.status === "cancelado")) ||
      (subStatusFilter === "DEMO" && (u.subscription.is_demo || u.subscription.status === "demo"));

    return matchSearch && matchStatus;
  });

  const totals = {
    institutions: institutions.length,
    users: users.length,
    activeSubs: users.filter((u) => u.subscription.status === "activo" && !u.subscription.is_demo).length,
    trialSubs: users.filter((u) => u.subscription.status === "en_prueba").length,
    suspendedSubs: users.filter((u) => u.subscription.status === "suspendido" || u.subscription.status === "cancelado").length,
    demoUsers: users.filter((u) => u.subscription.is_demo || u.subscription.status === "demo").length,
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "DISTRITO":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ADMIN":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "DECE":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "AUTORIDAD":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "DOCENTE":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getSubscriptionBadge = (sub: UserData["subscription"]) => {
    if (sub.is_demo || sub.status === "demo") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          🧪 Demo (No Facturable)
        </span>
      );
    }
    if (sub.status === "activo") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Activo ({sub.package_name})
        </span>
      );
    }
    if (sub.status === "en_prueba") {
      const days = sub.days_left !== null ? sub.days_left : 0;
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          🎁 En Prueba ({days > 0 ? `${days}d restantes` : "Vence hoy"})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
        ⛔ Suspendido (Solo Lectura)
      </span>
    );
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const selectable = filteredSubscriptionUsers
      .filter((u) => u.role !== "SUPERADMIN" && !u.subscription.is_demo)
      .map((u) => u.id);
    setSelectedUserIds(selectable);
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  const selectedUsersData = users.filter((u) => selectedUserIds.includes(u.id));

  const activeUsersCount = users.filter((u) => u.active === 1).length;
  const inactiveUsersCount = users.filter((u) => u.active === 0).length;
  const activeInstCount = institutions.filter((i) => i.active === 1).length;
  const inactiveInstCount = institutions.filter((i) => i.active === 0).length;

  const handleDeactivateUser = (id: string, name: string) => {
    if (!confirm(`¿Desactivar al usuario "${name}"? El usuario no podrá iniciar sesión pero todos sus casos y registros históricos se conservarán intactos.`)) return;
    startTransition(async () => {
      const res = await deactivateUserAction(id);
      if (res.success) {
        setFeedbackBanner({ type: "success", text: res.message || "El usuario fue desactivado. Sus casos y registros históricos se conservan intactos." });
      } else {
        setFeedbackBanner({ type: "error", text: res.error || "Error al desactivar el usuario." });
      }
    });
  };

  const handleReactivateUser = (id: string, name: string) => {
    startTransition(async () => {
      const res = await reactivateUserAction(id);
      if (res.success) {
        setFeedbackBanner({ type: "success", text: res.message || "Usuario reactivado con éxito." });
      } else {
        setFeedbackBanner({ type: "error", text: res.error || "Error al reactivar el usuario." });
      }
    });
  };

  const handleDeactivateInstitution = (id: string, name: string) => {
    if (!confirm(`¿Desactivar la institución "${name}"? Su historial y expedientes se conservarán intactos.`)) return;
    startTransition(async () => {
      const res = await deactivateInstitutionAction(id);
      if (res.success) {
        setFeedbackBanner({ type: "success", text: res.message || "La institución fue desactivada. Los datos y expedientes se conservan intactos." });
      } else {
        setFeedbackBanner({ type: "error", text: res.error || "Error al desactivar la institución." });
      }
    });
  };

  const handleReactivateInstitution = (id: string, name: string) => {
    startTransition(async () => {
      const res = await reactivateInstitutionAction(id);
      if (res.success) {
        setFeedbackBanner({ type: "success", text: res.message || "Institución reactivada con éxito." });
      } else {
        setFeedbackBanner({ type: "error", text: res.error || "Error al reactivar la institución." });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner de feedback para acciones de borrado lógico / reactivación */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium shadow-xs ${
            feedbackBanner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{feedbackBanner.type === "success" ? "✅" : "⚠️"}</span>
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Panel de Superadministrador</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
              ACCESO MÁXIMO
            </span>
          </div>
          <p className="text-sm text-brand-200 mt-1 max-w-2xl">
            Suscripciones y cobros por usuario individual, periodos de prueba, reubicación de profesionales y protección estricta de tarifas vigentes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CreateInstitutionModal />
          <CreateUserModal
            institutions={institutions.map((i) => ({ id: i.id, name: i.name, active: i.active }))}
            packages={subscriptionPackages}
          />
        </div>
      </div>

      {/* Alerta de Vencimientos Próximos (<= 7 días) */}
      {upcomingExpiringUsers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shrink-0 font-bold">
              ⏳
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950">
                Atención: {upcomingExpiringUsers.length} {upcomingExpiringUsers.length === 1 ? "usuario tiene" : "usuarios tienen"} su suscripción por vencer en los próximos 7 días
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Al vencer su fecha, pasarán automáticamente a modo solo lectura sin afectar a los demás usuarios de su institución.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab("suscripciones");
                setSubStatusFilter("TODAS");
                setSelectedUserIds(upcomingExpiringUsers.map((u) => u.id));
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Ver y Renovar ({upcomingExpiringUsers.length})
            </button>
          </div>
        </div>
      )}

      {/* Métricas Globales */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Usuarios Globales" value={totals.users} color="indigo" />
        <StatCard label="Suscripciones Activas" value={totals.activeSubs} color="green" />
        <StatCard label="En Periodo Prueba" value={totals.trialSubs} color="blue" />
        <StatCard label="Suspendidos (Solo Lectura)" value={totals.suspendedSubs} color="rose" />
        <StatCard label="Cuentas Demo" value={totals.demoUsers} color="purple" />
        <StatCard label="Instituciones" value={totals.institutions} color="indigo" />
      </div>

      {/* Barra de Pestañas */}
      <div className="border-b border-slate-200 flex items-center gap-2">
        <button
          onClick={() => setActiveTab("usuarios")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "usuarios"
              ? "border-brand-600 text-brand-600 bg-brand-50/50 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>👥</span> Usuarios Globales ({users.length})
        </button>

        <button
          onClick={() => setActiveTab("suscripciones")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "suscripciones"
              ? "border-brand-600 text-brand-600 bg-brand-50/50 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>💳</span> Suscripciones & Tarifas (Regla 13)
        </button>

        <button
          onClick={() => setActiveTab("instituciones")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "instituciones"
              ? "border-brand-600 text-brand-600 bg-brand-50/50 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>🏛️</span> Vista Instituciones ({institutions.length})
        </button>

        <button
          onClick={() => setActiveTab("auditoria")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "auditoria"
              ? "border-brand-600 text-brand-600 bg-brand-50/50 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>📜</span> Auditoría Global
        </button>
      </div>

      {/* PESTAÑA 1: USUARIOS GLOBALES */}
      {activeTab === "usuarios" && (
        <div className="space-y-4">
          {/* Sub-pestañas Activos / Inactivos (Corrección 2) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUserSubTab("ACTIVOS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  userSubTab === "ACTIVOS"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>✅</span> Usuarios Activos ({activeUsersCount})
              </button>
              <button
                type="button"
                onClick={() => setUserSubTab("INACTIVOS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  userSubTab === "INACTIVOS"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>⏸️</span> Usuarios Inactivos / Desactivados ({inactiveUsersCount})
              </button>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              {userSubTab === "ACTIVOS"
                ? "Personal operativo con acceso al sistema."
                : "Personal desactivado. Sus expedientes DECE y firmas se conservan intactos."}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar usuario por nombre o correo..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input text-xs w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={userInstFilter}
                onChange={(e) => setUserInstFilter(e.target.value)}
                className="input text-xs bg-white text-slate-900 border border-slate-300"
              >
                <option value="TODAS">Todas las instituciones</option>
                <option value="CENTRAL">Nivel Central / Distrito (Sin inst.)</option>
                {institutions.filter((i) => i.active !== 0).length > 0 && (
                  <optgroup label="🟢 Instituciones Activas">
                    {institutions
                      .filter((i) => i.active !== 0)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          🟢 {i.name}
                        </option>
                      ))}
                  </optgroup>
                )}
                {institutions.filter((i) => i.active === 0).length > 0 && (
                  <optgroup label="⏸️ Instituciones Inactivas">
                    {institutions
                      .filter((i) => i.active === 0)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          ⏸️ {i.name} (Inactiva)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="input text-xs bg-white text-slate-900 border border-slate-300"
              >
                <option value="TODOS">Todos los roles</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
                <option value="DISTRITO">DISTRITO</option>
                <option value="ADMIN">ADMIN (Coordinador)</option>
                <option value="DECE">DECE (Profesional)</option>
                <option value="AUTORIDAD">AUTORIDAD</option>
                <option value="DOCENTE">DOCENTE</option>
              </select>

              <CreateUserModal
                institutions={institutions.map((i) => ({ id: i.id, name: i.name, active: i.active }))}
                packages={subscriptionPackages}
              />
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Nombre & Correo</th>
                  <th className="text-left px-4 py-3">Rol</th>
                  <th className="text-left px-4 py-3">Institución Asignada</th>
                  <th className="text-left px-4 py-3">Suscripción Individual</th>
                  <th className="text-left px-4 py-3">Acceso</th>
                  <th className="text-left px-4 py-3">Acciones de Superadmin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                              TÚ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-normal">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(
                            u.role
                          )}`}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {u.institution_name ? (
                          <span className="font-medium text-slate-800">{u.institution_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Nivel Central / Sin asignación</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getSubscriptionBadge(u.subscription)}
                        {u.subscription.end_date && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Vence: {u.subscription.end_date}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.active ? (
                          <Badge color="green">Habilitado</Badge>
                        ) : (
                          <Badge color="slate">Deshabilitado</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Modales de Suscripción */}
                          {!isSelf && u.role !== "SUPERADMIN" && !u.subscription.is_demo && (
                            <>
                              <RenewUserSubscriptionModal
                                user={{ id: u.id, name: u.name, email: u.email, institution_name: u.institution_name }}
                                subscription={u.subscription}
                                packages={subscriptionPackages}
                              />
                              <AssignUserSubscriptionModal
                                user={{ id: u.id, name: u.name, email: u.email, institution_name: u.institution_name }}
                                packages={subscriptionPackages}
                              />
                            </>
                          )}

                          {/* Reubicación a otra institución (Función 8) */}
                          {!isSelf && u.role !== "SUPERADMIN" && (
                            <ReassignInstitutionModal
                              user={{ id: u.id, name: u.name, email: u.email, institution_id: u.institution_id }}
                              institutions={institutions.map((i) => ({ id: i.id, name: i.name, active: i.active }))}
                            />
                          )}

                          <EditUserModal
                            user={u}
                            institutions={institutions.map((i) => ({ id: i.id, name: i.name, active: i.active }))}
                          />

                          <ResetPasswordModal userId={u.id} userName={u.name} />

                          {!isSelf && (
                            u.active === 1 ? (
                              <button
                                onClick={() => handleDeactivateUser(u.id, u.name)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition flex items-center gap-1"
                                title="Desactivar usuario (borrado lógico que conserva todo el historial DECE)"
                              >
                                <span>⏸️</span> Desactivar
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleReactivateUser(u.id, u.name)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold transition flex items-center gap-1"
                                  title="Reactivar usuario en el sistema"
                                >
                                  <span>✅</span> Reactivar
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteModal({
                                      isOpen: true,
                                      targetType: "user",
                                      targetId: u.id,
                                      targetName: `${u.name} (${u.email})`,
                                    });
                                  }}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-semibold transition"
                                  title="Eliminación permanente (valida dependencias)"
                                >
                                  🗑️
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No se encontraron usuarios con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: SUSCRIPCIONES Y PROTECCIÓN DE TARIFAS (REGLA 13) */}
      {activeTab === "suscripciones" && (
        <div className="space-y-6">
          {/* BANNER REGLA CRÍTICA DE PROTECCIÓN */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-start gap-3 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-blue-950">
                  Regla Crítica 13: Protección de Suscripciones por Usuario Individual
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200/80 text-blue-900 uppercase">
                  Protección Estricta
                </span>
              </div>
              <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                Cada usuario tiene su propio estado de pago y fecha de vencimiento independiente. Ningún usuario activo o en prueba es afectado por cambios posteriores en el catálogo de paquetes.
                Si un usuario es suspendido por falta de pago, pasa a modo <strong>solo lectura</strong> sin afectar a sus compañeros de institución.
              </p>
            </div>
          </div>

          {/* TARIFAS GLOBALES Y PAQUETES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <span>💲</span> Tarifa Global Referencial
                </h4>
                <EditGlobalRateModal currentRate={globalUserRate} />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-3xl font-extrabold font-mono text-slate-900">
                  ${Number(globalUserRate).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">USD mensual por usuario</div>
              </div>
              <p className="text-[11px] text-slate-400">
                Tarifa base para cotizaciones especiales o planes personalizados por usuario.
              </p>
            </div>

            <div className="card p-5 space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <span>📦</span> Catálogo de Paquetes Comerciales
                </h4>
                <span className="text-xs text-slate-400">{subscriptionPackages.length} paquetes disponibles</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="text-left px-3 py-2">Paquete</th>
                      <th className="text-left px-3 py-2">Tarifa a Congelar</th>
                      <th className="text-left px-3 py-2">Duración</th>
                      <th className="text-left px-3 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptionPackages.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {p.name}
                          {p.description && (
                            <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                              {p.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">
                          ${p.price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-medium">
                          {p.duration_months} {p.duration_months === 1 ? "mes" : "meses"}
                        </td>
                        <td className="px-3 py-2">
                          <EditPackageModal pkg={p} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TABLA PRINCIPAL: SUSCRIPCIONES POR USUARIO INDIVIDUAL */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              <div>
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <span>👤</span> Suscripciones Vigentes por Usuario
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Muestra la tarifa individual congelada, el estado de acceso y la fecha de vencimiento de cada profesional.
                </p>
              </div>

              {/* Controles de Selección Múltiple y Búsqueda */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {selectedUserIds.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <BatchRenewUsersModal
                      selectedUsers={selectedUsersData.map((u) => ({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        institution_name: u.institution_name,
                        package_name: u.subscription.package_name,
                        frozen_price: u.subscription.frozen_price,
                      }))}
                      packages={subscriptionPackages}
                      onClearSelection={clearSelection}
                    />
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Deseleccionar
                    </button>
                  </div>
                )}

                <select
                  value={subStatusFilter}
                  onChange={(e) => setSubStatusFilter(e.target.value)}
                  className="input text-xs"
                >
                  <option value="TODAS">Todos los estados</option>
                  <option value="ACTIVAS">Solo Activas</option>
                  <option value="EN_PRUEBA">En Periodo de Prueba</option>
                  <option value="SUSPENDIDAS">Suspendidas (Solo lectura)</option>
                  <option value="DEMO">Cuentas Demo</option>
                </select>

                <div className="w-full sm:w-60">
                  <input
                    type="text"
                    placeholder="Buscar usuario o institución..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="input text-xs w-full"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-3 w-8 text-center">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos los filtrados"
                        checked={
                          filteredSubscriptionUsers.length > 0 &&
                          filteredSubscriptionUsers
                            .filter((u) => u.role !== "SUPERADMIN" && !u.subscription.is_demo)
                            .every((u) => selectedUserIds.includes(u.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) selectAllFiltered();
                          else clearSelection();
                        }}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                    </th>
                    <th className="text-left px-4 py-3">Usuario & Correo</th>
                    <th className="text-left px-4 py-3">Institución</th>
                    <th className="text-left px-4 py-3">Plan / Paquete</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Monto Congelado</th>
                    <th className="text-left px-4 py-3">Vencimiento</th>
                    <th className="text-left px-4 py-3">Acciones de Tarifa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubscriptionUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    const isSuperadmin = u.role === "SUPERADMIN";
                    const isDemo = u.subscription.is_demo || u.subscription.status === "demo";
                    const isSuspended = u.subscription.status === "suspendido" || u.subscription.status === "cancelado";

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          {!isSuperadmin && !isDemo && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectUser(u.id)}
                              className="rounded text-brand-600 focus:ring-brand-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div>{u.name}</div>
                          <div className="text-xs text-slate-400 font-normal">{u.email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {u.institution_name || <span className="text-slate-400 italic">Nivel Central</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          <span className="font-semibold">{u.subscription.package_name}</span>
                          <span className="text-[10px] text-slate-400 block uppercase">
                            ({u.subscription.billing_type})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getSubscriptionBadge(u.subscription)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs">
                          ${u.subscription.frozen_price.toFixed(2)} USD
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {u.subscription.end_date ? (
                            <div>
                              <span className="font-semibold text-slate-800">{u.subscription.end_date}</span>
                              {u.subscription.days_left !== null && (
                                <span
                                  className={`block text-[10px] font-bold ${
                                    u.subscription.days_left < 0
                                      ? "text-red-600"
                                      : u.subscription.days_left <= 7
                                      ? "text-amber-600 font-bold"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {u.subscription.days_left < 0
                                    ? `Venció hace ${Math.abs(u.subscription.days_left)} días`
                                    : `Quedan ${u.subscription.days_left} días`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sin vencimiento</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!isSuperadmin && !isDemo ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <RenewUserSubscriptionModal
                                user={{ id: u.id, name: u.name, email: u.email, institution_name: u.institution_name }}
                                subscription={u.subscription}
                                packages={subscriptionPackages}
                              />
                              <AssignUserSubscriptionModal
                                user={{ id: u.id, name: u.name, email: u.email, institution_name: u.institution_name }}
                                packages={subscriptionPackages}
                              />
                              <ForceUserPriceChangeModal
                                user={{ id: u.id, name: u.name, email: u.email }}
                                subscription={u.subscription}
                                packages={subscriptionPackages}
                              />
                              {/* Botón manual de suspender / reactivar */}
                              <button
                                type="button"
                                onClick={() => {
                                  startTransition(async () => {
                                    await toggleUserSuspensionAction(
                                      u.id,
                                      !isSuspended,
                                      isSuspended ? "Reactivado por superadmin" : "Suspendido manualmente por superadmin"
                                    );
                                  });
                                }}
                                disabled={isPending}
                                className={`px-2 py-1 rounded text-xs font-semibold border transition ${
                                  isSuspended
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                                }`}
                              >
                                {isSuspended ? "Reactivar" : "Suspender"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No editable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubscriptionUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                        No se encontraron suscripciones de usuarios con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* HISTORIAL DE AUDITORÍA DE SUSCRIPCIONES INDIVIDUALES */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                  <span>📜</span> Historial de Suscripciones por Usuario
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registro inmutable de renovaciones, suspensiones, activaciones de prueba y reubicaciones.
                </p>
              </div>
              <span className="text-xs text-slate-400">{userSubscriptionHistory.length} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="text-left px-3 py-2">Fecha y Hora</th>
                    <th className="text-left px-3 py-2">Usuario</th>
                    <th className="text-left px-3 py-2">Institución (Snapshot)</th>
                    <th className="text-left px-3 py-2">Evento</th>
                    <th className="text-left px-3 py-2">Paquete / Plan</th>
                    <th className="text-left px-3 py-2">Monto Congelado</th>
                    <th className="text-left px-3 py-2">Vigencia</th>
                    <th className="text-left px-3 py-2">Ejecutado Por</th>
                    <th className="text-left px-3 py-2">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {userSubscriptionHistory.slice(0, 50).map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {h.created_at}
                      </td>
                      <td className="px-3 py-2 font-sans font-medium text-slate-900">
                        {h.user_name || "Usuario"}
                        <div className="text-[10px] text-slate-400 font-normal">{h.user_email}</div>
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-600">
                        {h.institution_name || "Nivel Central"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans ${
                            h.event_type === "RENOVACION"
                              ? "bg-emerald-100 text-emerald-800"
                              : h.event_type === "ACTIVACION_PRUEBA"
                              ? "bg-blue-100 text-blue-800"
                              : h.event_type === "REUBICACION"
                              ? "bg-purple-100 text-purple-800"
                              : h.event_type.includes("SUSPENSION")
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {h.event_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-800">
                        {h.package_name}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900">
                        ${h.frozen_price.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[11px]">
                        {h.end_date ? `hasta ${h.end_date}` : "Sin vencimiento"}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-600">
                        {h.executed_by_name || "Sistema"}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500 text-[11px] max-w-xs truncate">
                        {h.reason || "-"}
                      </td>
                    </tr>
                  ))}
                  {userSubscriptionHistory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-xs text-slate-400 font-sans">
                        No hay registros en el historial de suscripciones.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: VISTA POR INSTITUCIÓN (DESGLOSE DE USUARIOS) */}
      {activeTab === "instituciones" && (
        <div className="space-y-4">
          {/* Sub-pestañas Activas / Inactivas (Corrección 2) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInstSubTab("ACTIVAS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  instSubTab === "ACTIVAS"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>✅</span> Instituciones Activas ({activeInstCount})
              </button>
              <button
                type="button"
                onClick={() => setInstSubTab("INACTIVAS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  instSubTab === "INACTIVAS"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>⏸️</span> Instituciones Inactivas ({inactiveInstCount})
              </button>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              {instSubTab === "ACTIVAS"
                ? "Instituciones en operación activa."
                : "Instituciones inactivas. Sus usuarios, estudiantes y expedientes históricos se conservan."}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar institución..."
                value={instSearch}
                onChange={(e) => setInstSearch(e.target.value)}
                className="input text-xs w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <CreateInstitutionModal />
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Institución</th>
                  <th className="text-left px-4 py-3">Código AMIE</th>
                  <th className="text-left px-4 py-3">Distrito / Zona</th>
                  <th className="text-left px-4 py-3">Total Usuarios</th>
                  <th className="text-left px-4 py-3">Desglose de Suscripciones</th>
                  <th className="text-left px-4 py-3">Estado Institucional</th>
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInstitutions.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {i.name}
                      <div className="text-xs text-slate-400 font-normal">
                        {i.studentsCount} estudiantes · {i.casesCount} casos ({i.openCasesCount} abiertos)
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{i.amie_code || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {i.district || "-"} {i.zona ? `(${i.zona})` : ""}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 text-xs">
                      {i.usersCount} usuarios
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {i.activeSubsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {i.activeSubsCount} activos
                          </span>
                        )}
                        {i.trialSubsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            {i.trialSubsCount} en prueba
                          </span>
                        )}
                        {i.suspendedSubsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            {i.suspendedSubsCount} suspendidos
                          </span>
                        )}
                        {i.demoSubsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            {i.demoSubsCount} demo
                          </span>
                        )}
                        {i.usersCount === 0 && (
                          <span className="text-slate-400 italic">Sin usuarios</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {i.active ? <Badge color="green">Operativa</Badge> : <Badge color="slate">Inactiva</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveTab("suscripciones");
                            setSubSearch(i.name);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
                          title="Ver usuarios de esta institución"
                        >
                          👁️ Ver Usuarios
                        </button>
                        <EditInstitutionModal institution={i} />
                        {i.active === 1 ? (
                          <button
                            onClick={() => handleDeactivateInstitution(i.id, i.name)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition flex items-center gap-1"
                            title="Desactivar institución (borrado lógico que conserva expedientes y usuarios)"
                          >
                            <span>⏸️</span> Desactivar
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleReactivateInstitution(i.id, i.name)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold transition flex items-center gap-1"
                              title="Reactivar institución"
                            >
                              <span>✅</span> Reactivar
                            </button>
                            <button
                              onClick={() => {
                                setDeleteModal({
                                  isOpen: true,
                                  targetType: "institution",
                                  targetId: i.id,
                                  targetName: i.name,
                                });
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-semibold transition"
                              title="Eliminación definitiva (valida dependencias)"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredInstitutions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No se encontraron instituciones con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: AUDITORÍA GLOBAL */}
      {activeTab === "auditoria" && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                <span>📜</span> Registro de Auditoría Global del Sistema
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Bitácora cronológica de todas las acciones administrativas y de seguridad.
              </p>
            </div>
            <span className="text-xs text-slate-400">{auditLogs.length} eventos recientes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2">Fecha y Hora</th>
                  <th className="text-left px-3 py-2">Usuario</th>
                  <th className="text-left px-3 py-2">Acción</th>
                  <th className="text-left px-3 py-2">Entidad</th>
                  <th className="text-left px-3 py-2">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {log.created_at}
                    </td>
                    <td className="px-3 py-2 font-sans font-medium text-slate-900">
                      {log.user_name || "Sistema"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 font-sans">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)})` : ""}
                    </td>
                    <td className="px-3 py-2 font-sans text-slate-600 max-w-md truncate">
                      {log.details || "-"}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-slate-400 font-sans">
                      No hay registros de auditoría disponibles.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Borrado Seguro con Contraseña */}
      <SecureDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        targetType={deleteModal.targetType}
        targetId={deleteModal.targetId}
        targetName={deleteModal.targetName}
      />
    </div>
  );
}
