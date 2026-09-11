import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import LogoutButton from "@/components/LogoutButton";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import SchoolYearSelector from "@/components/SchoolYearSelector";
import GlobalSearchModal from "@/components/GlobalSearchModal";
import TopChatButton from "@/components/TopChatButton";
import DemoModeBanner from "@/components/DemoModeBanner";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import AmbientBackground from "@/components/AmbientBackground";
import ThemeToggle from "@/components/ThemeToggle";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import UserSubscriptionStatusBanner from "@/components/UserSubscriptionStatusBanner";
import { enterDemoModeAction } from "@/app/(app)/actions/demoMode";
import { listSchoolYears, getSelectedSchoolYear } from "@/lib/schoolYear";
import { ROLE_LABELS, type InstitutionRow } from "@/lib/types";
import SadexLogo from "@/components/SadexLogo";

import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { user } = session;

  const dbUser = db.prepare("SELECT id, institution_id, role, active FROM users WHERE id = ?").get(user.id) as any;
  if (!dbUser || !dbUser.active) {
    redirect("/login");
  }

  const isDemoMode = Boolean(user.is_demo_mode);
  const effectiveInstitutionId = isDemoMode ? "demo-los-alamos" : dbUser.institution_id;

  const institution = effectiveInstitutionId
    ? (db.prepare("SELECT name, seal_image FROM institutions WHERE id = ?").get(effectiveInstitutionId) as
        | Pick<InstitutionRow, "name" | "seal_image">
        | undefined)
    : undefined;

  const schoolYears = effectiveInstitutionId ? listSchoolYears(effectiveInstitutionId) : [];
  const selectedYear = effectiveInstitutionId ? await getSelectedSchoolYear(effectiveInstitutionId) : null;

  return (
    <div className="flex min-h-screen relative overflow-x-hidden bg-slate-50/70">
      <AmbientBackground />
      <Sidebar role={user.role} institutionName={institution?.name} institutionLogo={institution?.seal_image} />
      <div className="flex-1 flex flex-col min-w-0">
        <NetworkStatusBanner />
        {isDemoMode && <DemoModeBanner />}
        <UserSubscriptionStatusBanner subscription={(user as any).subscription} />
        <header className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/80 backdrop-blur-xl px-4 md:px-6 py-2.5 gap-3 shadow-2xs transition-colors">
          <div className="flex items-center gap-3">
            <MobileNav role={user.role} institutionName={institution?.name} />
            <div className="md:hidden">
              <SadexLogo variant="compact" size="xs" theme="light" showSubtitle={false} />
            </div>
            {effectiveInstitutionId && schoolYears.length > 0 && (
              <SchoolYearSelector
                schoolYears={schoolYears}
                currentYearId={selectedYear ? selectedYear.id : "ALL"}
              />
            )}
            {!isDemoMode && (
              <form action={enterDemoModeAction} className="hidden sm:inline-block">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  title="Activar entorno de demostración con datos ficticios para presentaciones"
                >
                  <span>🧪</span>
                  <span>Modo Demo</span>
                </button>
              </form>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isDemoMode && (
              <form action={enterDemoModeAction} className="sm:hidden">
                <button
                  type="submit"
                  className="p-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold"
                  title="Modo Demo"
                >
                  🧪
                </button>
              </form>
            )}
            {user.role !== "DISTRITO" && <GlobalSearchModal />}
            {user.role !== "DISTRITO" && <TopChatButton />}
            {(user.role === "ADMIN" || user.role === "DECE") && <PushSubscribeButton />}
            <PwaInstallPrompt />
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</div>
              <div className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</div>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs border border-slate-200">
              {user.name?.slice(0, 1).toUpperCase()}
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 bg-transparent animate-fade-in-up">{children}</main>
      </div>
    </div>
  );
}

