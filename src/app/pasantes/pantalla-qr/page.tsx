import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DynamicQrScreenClient from "./DynamicQrScreenClient";

interface PageProps {
  searchParams: Promise<{ inst?: string }>;
}

export default async function PantallaQrPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let institutionId = params.inst;

  if (!institutionId) {
    const firstInst = db.prepare("SELECT id FROM institutions WHERE active = 1 LIMIT 1").get() as any;
    institutionId = firstInst?.id;
  }

  if (!institutionId) {
    redirect("/dashboard");
  }

  const institution = db
    .prepare("SELECT id, name, seal_image, district, daily_attendance_code FROM institutions WHERE id = ?")
    .get(institutionId) as any;

  const hostUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://dece-app-production.up.railway.app";

  return (
    <DynamicQrScreenClient
      institutionId={institutionId}
      institutionName={institution?.name || "UNIDAD EDUCATIVA"}
      institutionDistrict={institution?.district || ""}
      institutionSeal={institution?.seal_image || null}
      dailyCode={institution?.daily_attendance_code || ""}
      hostUrl={hostUrl}
    />
  );
}
