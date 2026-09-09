import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { header: "Nombre completo *", key: "full_name", width: 32 },
  { header: "Cédula/documento", key: "document_id", width: 16 },
  { header: "Fecha de nacimiento (AAAA-MM-DD)", key: "birth_date", width: 24 },
  { header: "Género", key: "gender", width: 14 },
  { header: "Curso *", key: "course", width: 16 },
  { header: "Paralelo", key: "parallel", width: 10 },
  { header: "Representante", key: "representative", width: 28 },
  { header: "Teléfono representante", key: "rep_phone", width: 18 },
  { header: "Correo representante", key: "rep_email", width: 26 },
  { header: "Dirección", key: "address", width: 30 },
];

export async function GET() {
  const session = await getSession();
  if (!session?.user || !["ADMIN", "DECE"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Gestión DECE";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Estudiantes");
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

  sheet.addRow({
    full_name: "Ejemplo: Ana Pérez Solís",
    document_id: "0102030405",
    birth_date: "2012-05-14",
    gender: "Femenino",
    course: "8vo",
    parallel: "A",
    representative: "María Solís",
    rep_phone: "0999999999",
    rep_email: "maria.solis@correo.com",
    address: "Barrio Central, calle S/N",
  });
  sheet.getRow(2).font = { italic: true, color: { argb: "FF94A3B8" } };

  // Validación de datos: género limitado a 3 opciones (a partir de la fila 2, 500 filas)
  for (let r = 2; r <= 500; r++) {
    sheet.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Femenino,Masculino,Otro"'],
    };
  }

  const instructions = workbook.addWorksheet("Instrucciones");
  instructions.columns = [{ width: 90 }];
  const lines = [
    "Instrucciones para la importación masiva de estudiantes",
    "",
    "1. Complete la hoja \"Estudiantes\" con un estudiante por fila, a partir de la fila 2 (borre o reemplace la fila de ejemplo).",
    "2. Los campos marcados con * son obligatorios: Nombre completo y Curso.",
    "3. La fecha de nacimiento debe tener el formato AAAA-MM-DD (por ejemplo 2012-05-14). Si no la tiene, deje la celda vacía.",
    "4. El género debe ser exactamente uno de: Femenino, Masculino, Otro (o vacío).",
    "5. Si la cédula/documento ya existe para otro estudiante de esta institución, esa fila se omitirá y se reportará como duplicada.",
    "6. No agregue ni elimine columnas de la hoja \"Estudiantes\"; el sistema las lee por posición.",
    "7. Este formulario carga los datos básicos del estudiante. Los datos de familia, salud y necesidades educativas específicas se completan luego, editando la ficha de cada estudiante.",
  ];
  lines.forEach((l, i) => {
    const row = instructions.addRow([l]);
    if (i === 0) row.font = { bold: true, size: 13 };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-estudiantes.xlsx"',
    },
  });
}
