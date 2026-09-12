import { describe, it, expect } from "vitest";
import { generateAlertIdentificationDocx } from "./alertIdentificationDocx";
import type { AlertIdentificationSessionRowLike, AlertIdentificationEntryLike } from "./alertIdentificationDocx";

describe("generateAlertIdentificationDocx", () => {
  it("genera un buffer de Word válido para el Acta de Identificación de Alertas", async () => {
    const session: AlertIdentificationSessionRowLike = {
      curso: "10mo A",
      fecha: "2026-09-12",
      lugar: "Sala de Profesores",
      responsible_name: "Lic. Carlos Mendoza",
      responsible_email: "carlos.mendoza@educacion.gob.ec",
      responsible_phone_ext: "104",
      responsible_role: "Coordinador DECE",
      attendees_json: JSON.stringify([{ nombre: "Prof. Ana Gómez", telefono: "0991234567" }]),
      observaciones: "Se detectan alertas preventivas en el aula.",
    };

    const entries: AlertIdentificationEntryLike[] = [
      {
        student_name: "Estudiante Prueba 1",
        risk_type: "SALUD_MENTAL",
        teacher_name: "Prof. Ana Gómez",
        description: "Aislamiento recurrente durante recreos.",
      },
    ];

    const buffer = await generateAlertIdentificationDocx(session, entries, "Colegio Nacional Experimental");
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("genera un buffer de Word con recuadro formal de custodia física institucional", async () => {
    const sessionCustody: AlertIdentificationSessionRowLike = {
      curso: "9no B",
      fecha: "2026-09-12",
      lugar: "Bloque B - Aula 3",
      responsible_name: "Psic. Roberto Silva",
      responsible_email: "roberto.silva@educacion.gob.ec",
      responsible_phone_ext: "105",
      responsible_role: "Psicólogo DECE",
      attendees_json: "[]",
      observaciones: "Acta firmada en reunión y archivada.",
      physical_file_ref: "Carpeta DECE 2026 / Juntas de Curso / Exp #09",
      physical_evidence_url: "https://ejemplo.com/escaneo_acta.pdf",
    };

    const entries: AlertIdentificationEntryLike[] = [
      {
        student_name: "Estudiante Prueba 2",
        risk_type: "BAJO_RENDIMIENTO",
        teacher_name: "Lic. Elena Vaca",
        description: "Desinterés repentino en tareas.",
      },
    ];

    const buffer = await generateAlertIdentificationDocx(sessionCustody, entries, "Colegio Nacional Experimental");
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
