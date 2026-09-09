import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageOrientation,
  BorderStyle,
} from "docx";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { parseActionPlanItems, parseActionPlanAnalysts, parseActionPlanSignatories } from "@/lib/actionPlan";
import type { ActionPlanRow, ActionPlanSignatory } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO"]);
  const institutionId = session.user.role === "DISTRITO" ? null : requireInstitutionId(session);

  let query = "SELECT ap.*, i.name as inst_name FROM action_plans ap JOIN institutions i ON i.id = ap.institution_id WHERE ap.id = ?";
  const queryParams: any[] = [params.id];

  if (institutionId) {
    query += " AND ap.institution_id = ?";
    queryParams.push(institutionId);
  }

  const plan = db.prepare(query).get(...queryParams) as (ActionPlanRow & { inst_name: string }) | undefined;
  if (!plan) {
    return new NextResponse("Plan de Acción no encontrado", { status: 404 });
  }

  const items = parseActionPlanItems(plan.items_data);
  const analysts = parseActionPlanAnalysts(plan.analysts_data);
  const elaboratedList = parseActionPlanSignatories(plan.elaborated_by);
  const reviewed = plan.reviewed_by ? (JSON.parse(plan.reviewed_by) as ActionPlanSignatory) : null;
  const approved = plan.approved_by ? (JSON.parse(plan.approved_by) as ActionPlanSignatory) : null;

  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  };

  const tableRows: TableRow[] = [
    // Header row
    new TableRow({
      tableHeader: true,
      children: [
        "Acción",
        "Actividades",
        "Población Objetivo",
        "Logro esperado (Estándar)",
        "Plazo",
        "Insumos",
        "Responsable",
        "Observación",
      ].map(
        (h) =>
          new TableCell({
            borders: tableBorder,
            shading: { fill: "1B365D" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18 }),
                ],
              }),
            ],
          })
      ),
    }),
  ];

  items.forEach((item, idx) => {
    const isFirstOfDimension = idx === 0 || items[idx - 1].dimension !== item.dimension;
    const isFirstOfComponent = idx === 0 || items[idx - 1].component !== item.component;

    if (isFirstOfDimension) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 8,
              borders: tableBorder,
              shading: { fill: "1B365D" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.dimension,
                      bold: true,
                      color: "FFFFFF",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    }

    if (isFirstOfComponent) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 8,
              borders: tableBorder,
              shading: { fill: "D9E1F2" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.component,
                      bold: true,
                      color: "000000",
                      size: 19,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    }

    tableRows.push(
      new TableRow({
        children: [
          item.action,
          item.activities,
          item.target_population,
          item.expected_goal_standard,
          item.execution_term,
          item.supplies_inputs,
          item.responsible,
          item.observations,
        ].map(
          (text) =>
            new TableCell({
              borders: tableBorder,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: text || "", size: 17 })],
                }),
              ],
            })
        ),
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "MINISTERIO DE EDUCACIÓN DEL ECUADOR",
                bold: true,
                size: 22,
                color: "1B365D",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "PLAN DE ACCIÓN DEL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${plan.inst_name} - AÑO LECTIVO ${plan.school_year_text}`,
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "EVALUACIÓN Y AJUSTES:",
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: plan.evaluation_notes || "Cumplimiento conforme a estándares.",
                size: 18,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `Plan_Accion_DECE_${plan.school_year_text.replace(/\s+/g, "_")}.docx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
