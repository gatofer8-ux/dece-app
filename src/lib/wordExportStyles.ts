// Hoja de estilos "de repuesto" para la descarga en Word editable de los
// documentos oficiales. Las páginas de impresión usan clases utilitarias de
// Tailwind, que solo existen como reglas CSS reales cuando el navegador las
// procesa dentro de la app — un archivo .doc exportado no tiene ese
// stylesheet disponible. Este bloque reproduce en CSS plano las clases que
// realmente se usan en las vistas de impresión (bordes, colores, tipografía,
// espaciados) para que Word muestre tablas, encabezados y negritas de forma
// reconocible al abrir el documento, aunque no sea 100% idéntico al PDF.
//
// Word no soporta flexbox ni CSS grid: esas reglas se degradan a bloques
// apilados verticalmente, lo cual es aceptable — el contenido y los datos
// siguen presentes y editables, que es el objetivo de esta descarga.
export const WORD_EXPORT_CSS = `
  body { font-family: Calibri, Arial, sans-serif; color: #0f172a; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 6pt; }
  td, th { padding: 3pt 5pt; vertical-align: top; }
  .border, .border-slate-800, .border-slate-400, .border-slate-300, .border-slate-200, .border-t, .border-b { border: 1pt solid #1e293b; }
  .border-slate-400 { border-color: #94a3b8; }
  .border-slate-300 { border-color: #cbd5e1; }
  .border-slate-200 { border-color: #e2e8f0; }
  .border-t { border-top: 1pt solid #64748b; border-left: none; border-right: none; border-bottom: none; }
  .bg-slate-800 { background-color: #1e293b; color: #ffffff; }
  .bg-slate-100 { background-color: #f1f5f9; }
  .bg-slate-50 { background-color: #f8fafc; }
  .text-white { color: #ffffff; }
  .text-slate-400 { color: #94a3b8; }
  .text-slate-500 { color: #64748b; }
  .text-slate-600 { color: #475569; }
  .text-slate-700 { color: #334155; }
  .font-semibold, .font-bold { font-weight: bold; }
  .font-medium { font-weight: 600; }
  .uppercase { text-transform: uppercase; }
  .italic { font-style: italic; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .whitespace-pre-wrap { white-space: pre-wrap; }
  .whitespace-nowrap { white-space: nowrap; }
  .leading-tight { line-height: 1.2; }
  h1 { font-size: 14pt; font-weight: bold; margin: 0 0 4pt 0; }
  h2 { font-size: 11pt; font-weight: bold; margin: 8pt 0 4pt 0; }
  p { margin: 0 0 4pt 0; }
  ul { margin: 0 0 4pt 0; padding-left: 14pt; }
  li { margin-bottom: 2pt; }
  /* grid/flex de Tailwind no existen en Word: se apilan en bloque, lo cual sigue siendo legible y editable */
  [class*="grid"], [class*="flex"] { display: block !important; }
  [class*="grid"] > *, [class*="flex"] > * { display: block !important; margin-bottom: 4pt; }
  .no-print { display: none !important; }
  [class*="border-[#808080]"] { border: 1pt solid #808080 !important; }
  [class*="bg-[#CECDCD]"] { background-color: #CECDCD !important; }
  [class*="bg-[#F6F6F6]"] { background-color: #F6F6F6 !important; }
  [class*="w-1/4"] { width: 25% !important; }
  [class*="w-1/2"] { width: 50% !important; }
  [class*="w-3/4"] { width: 75% !important; }
  [class*="w-full"] { width: 100% !important; }
  .text-justify { text-align: justify; }
`;

/** Envuelve el HTML de un documento imprimible en un shell reconocible por Word (formato HTML/MHTML clásico). */
export function buildWordDocument(innerHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>${WORD_EXPORT_CSS}</style>
</head>
<body>
${innerHtml}
</body>
</html>`;
}
