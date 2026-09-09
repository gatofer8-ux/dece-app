import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getInterns,
  getTodayAttendances,
  generateQrDataUrl,
  getOrCreateDailyAttendanceCode,
} from "@/lib/pasantes";
import PasantesDashboardClient from "./PasantesDashboardClient";
import type { InstitutionRow } from "@/lib/types";

export default async function PasantesPage() {
  const session = await getSession();
  if (!session || !session.user) {
    redirect("/login");
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    redirect("/dashboard");
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const dailyAttendanceCode = getOrCreateDailyAttendanceCode(institutionId);

  const deceUsers = db
    .prepare(
      "SELECT id, name, role FROM users WHERE institution_id = ? AND active = 1 AND role IN ('DECE', 'ADMIN') ORDER BY name ASC"
    )
    .all(institutionId) as { id: string; name: string; role: string }[];

  const interns = getInterns(institutionId, "TODOS");
  const todayAttendances = getTodayAttendances(institutionId);

  const hostUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://dece-app-production.up.railway.app";

  const generalQrUrl = await generateQrDataUrl(
    `${hostUrl}/pasantes/marcar?inst=${institutionId}`
  );

  return (
    <PasantesDashboardClient
      interns={interns}
      todayAttendances={todayAttendances}
      institutionId={institutionId}
      institutionName={institution?.name || "UNIDAD EDUCATIVA"}
      institutionDistrict={institution?.district || ""}
      institutionLat={institution?.latitude ?? null}
      institutionLon={institution?.longitude ?? null}
      institutionRadius={institution?.geofence_radius_meters ?? 250}
      institutionRequireGeo={institution?.require_geolocation ?? 1}
      dailyAttendanceCode={institution?.daily_attendance_code || dailyAttendanceCode}
      generalQrUrl={generalQrUrl}
      hostUrl={hostUrl}
      deceUsers={deceUsers}
    />
  );
}

