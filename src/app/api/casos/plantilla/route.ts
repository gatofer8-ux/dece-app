import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/session";
import { RISK_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { header: "Nombres y apellidos del estudiante *", key: "full_name", width: 34 },
  { header: "Cédula / Documento", key: "document_id", width: 18 },
  { header: "Curso *", key: "course", width: 16 },
  { header: "Paralelo", key: "parallel", width: 10 },
  { header: "Tipología / Vulnerabilidad *", key: "typology", width: 32 },
  { header: "Observaciones / Antecedentes del caso", key: "description", width: 45 },
  { header: "Prioridad (Alta, Media, Baja)", key: "priority", width: 22 },
  { header: "Fecha de detección (AAAA-MM-DD)", key: "date", width: 26 },
  { header: "Representante legal", key: "representative", width: 28 },
  { header: "Teléfono de contacto", key: "phone", width: 18 },
];

export async function GET() {
  const session = await getSession();
  if (!session?.user || !["ADMIN", "DECE"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Gestión DECE";
  workbook.created = new Date();

  // Hoja 1: Matriz de Casos
  const sheet = workbook.addWorksheet("Matriz_Casos");
  sheet.columns = COLUMNS;

  // Estilo de la cabecera
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E79" }, // Azul institucional oscuro
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 32;

  // Filas de ejemplo
  const sampleRows = [
    {
      full_name: "Ejemplo: Juan Carlos Pérez Gómez",
      document_id: "1720345678",
      course: "10mo",
      parallel: "A",
      typology: "Violencia intrafamiliar",
      description: "Caso en seguimiento desde el período anterior por presunta negligencia y dinámica familiar compleja.",
      priority: "Media",
      date: "2026-09-01",
      representative: "Rosa Gómez (Madre)",
      phone: "0987654321",
    },
    {
      full_name: "Ejemplo: María Belén López Morales",
      document_id: "1804567890",
      course: "1ro BGU",
      parallel: "B",
      typology: "Salud mental",
      description: "Seguimiento socioemocional por crisis de ansiedad y reporte de autolesiones leves.",
      priority: "Alta",
      date: "2026-08-15",
      representative: "Carlos López (Padre)",
      phone: "0991234567",
    },
    {
      full_name: "Ejemplo: Mateo Alexander Silva Castro",
      document_id: "",
      course: "8vo",
      parallel: "C",
      typology: "Dificultad de aprendizaje",
      description: "Estudiante con Necesidades Educativas Específicas no asociadas a la discapacidad (rezago pedagógico).",
      priority: "Media",
      date: "2026-09-05",
      representative: "Ana Castro (Tía / Tutora)",
      phone: "0982345678",
    },
  ];

  for (const sr of sampleRows) {
    const r = sheet.addRow(sr);
    r.font = { italic: true, color: { argb: "FF64748B" } };
  }

  // Validación de datos para la columna Prioridad (columna G)
  for (let r = 2; r <= 300; r++) {
    sheet.getCell(`G${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Alta,Media,Baja"'],
    };
  }

  // Hoja 2: Catálogo oficial de tipologías DECE
  const catSheet = workbook.addWorksheet("Catalogo_Tipologias");
  catSheet.columns = [
    { header: "Código del Sistema", key: "code", width: 32 },
    { header: "Tipología Oficial (Modelo de Gestión DECE)", key: "label", width: 45 },
    { header: "Términos reconocidos automáticamente", key: "synonyms", width: 55 },
  ];

  const catHeader = catSheet.getRow(1);
  catHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  catHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };

  const typologies = [
    {
      code: "VIOLENCIA_INTRAFAMILIAR",
      label: RISK_TYPE_LABELS.VIOLENCIA_INTRAFAMILIAR,
      synonyms: "Violencia intrafamiliar, maltrato infantil, violencia física o psicológica en el hogar",
    },
    {
      code: "VIOLENCIA_ESCOLAR_BULLYING",
      label: RISK_TYPE_LABELS.VIOLENCIA_ESCOLAR_BULLYING,
      synonyms: "Bullying, acoso escolar, ciberacoso, violencia entre pares, agresión en aula",
    },
    {
      code: "VIOLENCIA_SEXUAL",
      label: RISK_TYPE_LABELS.VIOLENCIA_SEXUAL,
      synonyms: "Violencia sexual, presunto abuso sexual, tocamientos, acoso sexual",
    },
    {
      code: "CONSUMO_SUSTANCIAS",
      label: RISK_TYPE_LABELS.CONSUMO_SUSTANCIAS,
      synonyms: "Consumo de sustancias, SPA, drogas, alcohol, tabaco, vapeo",
    },
    {
      code: "SALUD_MENTAL",
      label: RISK_TYPE_LABELS.SALUD_MENTAL,
      synonyms: "Salud mental, depresión, ideación suicida, autolesiones, cutting, crisis de ansiedad",
    },
    {
      code: "EMBARAZO_ADOLESCENTE",
      label: RISK_TYPE_LABELS.EMBARAZO_ADOLESCENTE,
      synonyms: "Embarazo en adolescentes, maternidad o paternidad temprana",
    },
    {
      code: "VULNERACION_DERECHOS",
      label: RISK_TYPE_LABELS.VULNERACION_DERECHOS,
      synonyms: "Vulneración de derechos, trabajo infantil, negligencia, abandono, mendicidad",
    },
    {
      code: "DIFICULTAD_APRENDIZAJE",
      label: RISK_TYPE_LABELS.DIFICULTAD_APRENDIZAJE,
      synonyms: "Dificultades de aprendizaje, NEE, necesidades educativas, rezago escolar, dislexia",
    },
    {
      code: "CONFLICTO_FAMILIAR",
      label: RISK_TYPE_LABELS.CONFLICTO_FAMILIAR,
      synonyms: "Conflicto familiar, separación o divorcio de padres, patria potestad, pensión",
    },
    {
      code: "CONECTIVIDAD_ACCESO_EDUCATIVO",
      label: RISK_TYPE_LABELS.CONECTIVIDAD_ACCESO_EDUCATIVO,
      synonyms: "Conectividad, acceso a la educación, deserción escolar, ausentismo, movilidad humana",
    },
    {
      code: "OTRO",
      label: RISK_TYPE_LABELS.OTRO,
      synonyms: "Otras problemáticas o riesgos psicosociales no clasificados anteriormente",
    },
  ];

  for (const t of typologies) {
    catSheet.addRow(t);
  }

  // Hoja 3: Instrucciones
  const instSheet = workbook.addWorksheet("Instrucciones");
  instSheet.columns = [{ width: 85 }];
  const instructions = [
    "INSTRUCCIONES PARA LA IMPORTACIÓN MASIVA DE CASOS Y MATRICES DE VULNERABILIDAD",
    "",
    "1. En la hoja 'Matriz_Casos', llena la información de los estudiantes en seguimiento.",
    "2. Las columnas con asterisco (*) son obligatorias: Nombre, Curso y Tipología.",
    "3. Si un estudiante ya está registrado en tu institución (por cédula o nombre en el curso), el sistema lo vinculará automáticamente a su ficha.",
    "4. Si el estudiante es nuevo, el sistema creará su ficha de estudiante y abrirá su caso en un solo paso.",
    "5. Cada caso se creará automáticamente en estado 'En seguimiento' con su código correlativo oficial (ej. SIGLAS-CEDULA-AÑO-01).",
    "6. Puedes borrar las filas de ejemplo antes de subir la planilla o dejarlas (el sistema las ignorará si contienen la palabra 'Ejemplo').",
    "7. Guarda el archivo como .xlsx y súbelo en el módulo 'Importar matriz de casos'.",
  ];

  for (const line of instructions) {
    instSheet.addRow([line]);
  }
  instSheet.getRow(1).font = { bold: true, size: 12 };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Plantilla_Matriz_Casos_DECE.xlsx"',
    },
  });
}
