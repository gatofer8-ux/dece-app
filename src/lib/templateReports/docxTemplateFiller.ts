import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { TemplateFieldMapping } from "./types";

/**
 * Llena una plantilla Word (.docx) sustituyendo marcadores y repitiendo
 * filas de tabla sin alterar márgenes, cabeceras ni estilos institucionales.
 */
export async function fillDocxTemplate(opts: {
  templateBuffer: Buffer;
  mapping: TemplateFieldMapping;
  data: Record<string, any>[];
}): Promise<{
  buffer: Buffer;
  recordsCount: number;
}> {
  const { templateBuffer, mapping, data } = opts;

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // 1. Transformar la lista de casos usando el mapeo de campos
  // En Word, cada objeto caso tiene las claves de los marcadores (ej. { nombre: "...", curso: "..." })
  const casesArray = data.map((caseRec) => {
    const mappedCase: Record<string, any> = { ...caseRec };
    for (const [marker, fieldKey] of Object.entries(mapping)) {
      if (marker && fieldKey && caseRec[fieldKey] !== undefined) {
        mappedCase[marker] = caseRec[fieldKey];
      }
    }
    return mappedCase;
  });

  // 2. Preparar el contexto global para Docxtemplater
  // Soporta tanto loops {#casos}...{/casos} como marcadores individuales del primer caso
  const firstCase = casesArray[0] || {};
  const templateData = {
    ...firstCase,
    casos: casesArray,
    estudiantes: casesArray,
    total_casos: String(casesArray.length),
    fecha_emision: new Date().toISOString().slice(0, 10),
  };

  doc.render(templateData);

  const outBuffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return {
    buffer: outBuffer,
    recordsCount: data.length,
  };
}
