const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function createDemoTemplate() {
  const dir = path.join(process.cwd(), 'public', 'templates');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ministerio de Educación - Distrito 17D03';
  wb.created = new Date();

  const ws = wb.addWorksheet('Matriz_Vulnerabilidad_DECE', {
    views: [{ showGridLines: true }]
  });

  // 1. Título institucional
  ws.mergeCells('A1:L1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'MINISTERIO DE EDUCACIÓN - DIRECCIÓN DISTRITAL 17D03 - MATRIZ DE SEGUIMIENTO Y MONITOREO DE CASOS DE VULNERABILIDAD DECE';
  titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // 2. Subtítulo
  ws.mergeCells('A2:L2');
  const subCell = ws.getCell('A2');
  subCell.value = 'FORMATO OFICIAL DE REPORTE Y CONSOLIDACIÓN DE EXPEDIENTES PSICOSOCIALES - RÉGIMEN SIERRA-AMAZONÍA';
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF333333' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // 3. Fila en blanco
  ws.getRow(3).height = 10;

  // 4. Encabezados de columnas (Fila 4)
  const headers = [
    'No.',
    'Código de Caso',
    'Nombres y Apellidos del Estudiante',
    'No. Cédula',
    'Curso y Paralelo',
    'Jornada',
    'Tipología de Vulnerabilidad',
    'Prioridad',
    'Estado del Caso',
    'Fecha de Detección',
    'Profesional Asignado',
    'Descripción / Situación Detectada'
  ];

  const headerRow = ws.getRow(4);
  headerRow.values = headers;
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    };
  });

  // Configurar anchos de columna
  ws.columns = [
    { key: 'num', width: 6 },
    { key: 'codigo', width: 16 },
    { key: 'estudiante', width: 34 },
    { key: 'cedula', width: 14 },
    { key: 'curso', width: 22 },
    { key: 'jornada', width: 14 },
    { key: 'tipologia', width: 30 },
    { key: 'prioridad', width: 14 },
    { key: 'estado', width: 18 },
    { key: 'fecha', width: 16 },
    { key: 'profesional', width: 32 },
    { key: 'descripcion', width: 45 }
  ];

  // 5. Fila 5: Fila modelo / de ejemplo con validación y fórmulas
  const sampleRow = ws.getRow(5);
  sampleRow.values = [
    1,
    'DECE-2025-0001',
    'Mendoza Morales Carlos Andrés',
    '1701234567',
    '8.° EGB "A"',
    'MATUTINA',
    'Violencia intrafamiliar',
    'ALTA',
    'EN_SEGUIMIENTO',
    '2025-09-18',
    'Psic. Cl. Mateo Sebastián Alarcón Morales',
    'Estudiante en acompañamiento psicosocial con visitas y actas suscritas.'
  ];
  sampleRow.height = 22;

  sampleRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 1 || colNumber === 2 || colNumber === 4 || colNumber === 8 || colNumber === 9 || colNumber === 10 ? 'center' : 'left'
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    };
  });

  // Lista desplegable para Estado del Caso en columna I (col 9)
  const cellEstado = sampleRow.getCell(9);
  cellEstado.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"ABIERTO, EN_SEGUIMIENTO, CERRADO, DERIVADO"'],
    showErrorMessage: true,
    errorTitle: 'Estado inválido',
    error: 'Seleccione un estado de la lista oficial: ABIERTO, EN_SEGUIMIENTO, CERRADO o DERIVADO.'
  };

  // Lista desplegable para Prioridad en columna H (col 8)
  const cellPrioridad = sampleRow.getCell(8);
  cellPrioridad.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"ALTA, MEDIA, BAJA"']
  };

  const outputPath = path.join(dir, 'Matriz_Seguimiento_Casos_Distrito_Demo.xlsx');
  await wb.xlsx.writeFile(outputPath);
  console.log('Plantilla Excel guardada exitosamente en:', outputPath);
}

createDemoTemplate().catch(console.error);
