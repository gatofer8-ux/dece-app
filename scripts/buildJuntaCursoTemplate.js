const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

function buildJuntaCursoTemplate() {
  const rootDir = 'C:/Users/USER/Downloads/dece-app';
  const srcPath = path.join(rootDir, 'templates', 'INFORME_DE_JUNTAS_ORIGINAL.docx');
  const destPath = path.join(rootDir, 'templates', 'INFORME_JUNTAS_CURSO_TEMPLATE.docx');

  if (!fs.existsSync(srcPath)) {
    throw new Error('No se encontró el archivo original en: ' + srcPath);
  }

  const content = fs.readFileSync(srcPath);
  const zip = new PizZip(content);

  // 1. Header 1: nombre de institución dinámico
  if (zip.file('word/header1.xml')) {
    let headerXml = zip.file('word/header1.xml').asText();
    headerXml = headerXml.replace('Escuela de Educación Básica “Manuela Espejo”', '{nombre_institucion}');
    zip.file('word/header1.xml', headerXml);
  }

  // 2. Document XML
  let docXml = zip.file('word/document.xml').asText();
  const doc = new DOMParser().parseFromString(docXml, 'application/xml');

  const tables = doc.getElementsByTagName('w:tbl');
  if (tables.length < 3) {
    throw new Error('El documento no contiene las 3 tablas esperadas.');
  }

  const tbl0 = tables[0]; // Datos generales
  const tbl1 = tables[1]; // Casos
  const tbl2 = tables[2]; // Firmas

  function setCellText(cell, placeholder, bold = false) {
    const p = cell.getElementsByTagName('w:p')[0];
    if (!p) return;
    const runs = p.getElementsByTagName('w:r');
    let rPr = null;
    if (runs.length > 0) {
      const rPrEl = runs[0].getElementsByTagName('w:rPr')[0];
      if (rPrEl) rPr = rPrEl.cloneNode(true);
    }
    
    // Limpiar runs existentes
    while (p.getElementsByTagName('w:r').length > 0) {
      p.removeChild(p.getElementsByTagName('w:r')[0]);
    }
    
    const lines = String(placeholder).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        const brR = doc.createElement('w:r');
        brR.appendChild(doc.createElement('w:br'));
        p.appendChild(brR);
      }
      const newR = doc.createElement('w:r');
      if (rPr) {
        newR.appendChild(rPr.cloneNode(true));
      } else {
        const defaultRPr = doc.createElement('w:rPr');
        const rFonts = doc.createElement('w:rFonts');
        rFonts.setAttribute('w:ascii', 'Times New Roman');
        rFonts.setAttribute('w:hAnsi', 'Times New Roman');
        defaultRPr.appendChild(rFonts);
        if (bold) defaultRPr.appendChild(doc.createElement('w:b'));
        newR.appendChild(defaultRPr);
      }
      const newT = doc.createElement('w:t');
      newT.setAttribute('xml:space', 'preserve');
      newT.textContent = lines[i];
      newR.appendChild(newT);
      p.appendChild(newR);
    }
  }

  // Configurar Table 0 (Datos Generales)
  const t0Rows = tbl0.getElementsByTagName('w:tr');
  // R1: Fecha de Informe | No. De Informe | Estándar
  const r1Cells = t0Rows[1].getElementsByTagName('w:tc');
  setCellText(r1Cells[1], '{fecha_informe}');
  setCellText(r1Cells[3], '{numero_informe}');
  setCellText(r1Cells[5], '{estandar}');

  // R4: Funcionario Responsable DECE
  const r4Cells = t0Rows[4].getElementsByTagName('w:tc');
  setCellText(r4Cells[1], '{dece_nombre}');
  setCellText(r4Cells[2], '{dece_telefono}');
  setCellText(r4Cells[3], '{dece_email}');
  setCellText(r4Cells[4], '{dece_cargo}');

  // R7: Informe dirigido a (Autoridad)
  const r7Cells = t0Rows[7].getElementsByTagName('w:tc');
  setCellText(r7Cells[1], '{autoridad_nombre}');
  setCellText(r7Cells[2], '{autoridad_telefono}');
  setCellText(r7Cells[3], '{autoridad_email}');
  setCellText(r7Cells[4], '{autoridad_cargo}');

  // R8: Docente tutor
  const r8Cells = t0Rows[8].getElementsByTagName('w:tc');
  setCellText(r8Cells[1], '{tutor_nombre}');
  setCellText(r8Cells[2], '{tutor_telefono}');
  setCellText(r8Cells[3], '{tutor_email}');
  setCellText(r8Cells[4], 'Docente tutor');

  // R10: TEMA
  const r10Cells = t0Rows[10].getElementsByTagName('w:tc');
  setCellText(r10Cells[1], '{tema_informe}');

  // Configurar Table 1 (Casos)
  const t1Rows = tbl1.getElementsByTagName('w:tr');
  while (t1Rows.length > 2) {
    tbl1.removeChild(t1Rows[2]);
  }

  const caseRowCells = t1Rows[1].getElementsByTagName('w:tc');
  setCellText(caseRowCells[0], '{#casos}{curso}');
  setCellText(caseRowCells[1], '{cedula}');
  setCellText(caseRowCells[2], '{estudiante}');
  setCellText(caseRowCells[3], '{situacion}{/casos}');

  // Configurar Table 2 (Firmas)
  const t2Rows = tbl2.getElementsByTagName('w:tr');
  // R2: Elaborado por (DECE)
  const r2Cells = t2Rows[2].getElementsByTagName('w:tc');
  setCellText(r2Cells[0], '{dece_nombre}\n{dece_cargo}');
  setCellText(r2Cells[1], '');
  setCellText(r2Cells[2], '{fecha_informe}');

  // R5: Revisado por (Coordinador / DECE)
  const r5Cells = t2Rows[5].getElementsByTagName('w:tc');
  setCellText(r5Cells[0], '{revisado_nombre}\n{revisado_cargo}');
  setCellText(r5Cells[1], '');
  setCellText(r5Cells[2], '{fecha_informe}');

  // R8: Aprobado por (Rector / Autoridad)
  const r8Cells2 = t2Rows[8].getElementsByTagName('w:tc');
  setCellText(r8Cells2[0], '{autoridad_nombre}\n{autoridad_cargo}');
  setCellText(r8Cells2[1], '');
  setCellText(r8Cells2[2], '{fecha_informe}');

  // Eliminar párrafos vacíos finales en el body antes del sectPr para evitar páginas en blanco
  const body = doc.getElementsByTagName('w:body')[0];
  if (body) {
    for (let i = body.childNodes.length - 1; i >= 0; i--) {
      const node = body.childNodes[i];
      if (node.nodeName === 'w:p') {
        const text = node.textContent;
        if (!text || text.trim().length === 0) {
          body.removeChild(node);
        } else {
          break;
        }
      } else if (node.nodeName === 'w:tbl') {
        break;
      }
    }
  }

  // Serializar
  const serializer = new XMLSerializer();
  let updatedXml = serializer.serializeToString(doc);

  // Actualizar Alcance y Objetivos
  updatedXml = updatedXml.replace(
    'Departamento de Consejería Estudiantil de la Escuela de Educación Básica “Manuela Espejo” al docente tutor y a la Junta de Junta de Docentes de Grado o Curso.',
    'Departamento de Consejería Estudiantil de la {nombre_institucion} al docente tutor y a la Junta de Docentes de Grado o Curso.'
  );

  updatedXml = updatedXml.replace(
    'Informar a la Junta de Docentes de Grado o Curso sobre los reportes realizados por los docentes y detectados por el DECE, durante el año lectivo 2024-2025 , procesos de abordaje y atención psicosocial.',
    'Informar a la Junta de Docentes de Grado o Curso sobre los reportes realizados por los docentes y detectados por el DECE, durante el año lectivo {anio_lectivo}, procesos de abordaje y atención psicosocial.'
  );

  // Reemplazar texto de conclusiones fijas por marcador dinámico
  const oldConclusiones = `Los estudiantes reportados han recibido atención psicosocial por parte del DECE.`;
  if (updatedXml.includes(oldConclusiones)) {
    updatedXml = updatedXml.replace(oldConclusiones, '{conclusiones}');
    // Eliminar el segundo párrafo fijo de conclusiones si existe
    updatedXml = updatedXml.replace(
      `<w:p w14:paraId="429A26A2" w14:textId="77777777" w:rsidR="00D0465D" w:rsidRDefault="00D0465D"><w:pPr><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">–  </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:t>Se han realizado acciones en favor de los estudiantes reportados y detectados hasta la presente fecha, se han aplicado estrategias para resolución pacífica de conflictos.</w:t></w:r></w:p>`,
      ''
    );
  }

  // Reemplazar texto de recomendaciones fijas por marcador dinámico
  const oldRecomendaciones = `Detectar y reportar oportunamente mediante la ficha de alerta a los y las estudiantes que presentan dificultades y requieran atención psicosocial , para desarrollar estrategias adecuadas y garantizar la educación.`;
  if (updatedXml.includes(oldRecomendaciones)) {
    updatedXml = updatedXml.replace(oldRecomendaciones, '{recomendaciones}');
    // Limpiar párrafos fijos adicionales de recomendaciones de forma segura
    const idxRec = updatedXml.indexOf('{recomendaciones}');
    if (idxRec !== -1) {
      const idxTbl2 = updatedXml.indexOf('<w:tbl', idxRec);
      if (idxTbl2 !== -1) {
        // Between {recomendaciones} and the signatures table, replace any extra bullet paragraphs
        const between = updatedXml.slice(idxRec, idxTbl2);
        const cleanedBetween = between.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (pMatch) => {
          if (pMatch.includes('{recomendaciones}')) return pMatch;
          return '';
        });
        updatedXml = updatedXml.slice(0, idxRec) + cleanedBetween + updatedXml.slice(idxTbl2);
      }
    }
  }
  zip.file('word/document.xml', updatedXml);

  const finalBuffer = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(destPath, finalBuffer);
  console.log('✓ Plantilla canónica generada exitosamente:', destPath, '(', finalBuffer.length, 'bytes)');
  return finalBuffer;
}

if (require.main === module) {
  buildJuntaCursoTemplate();
}

module.exports = { buildJuntaCursoTemplate };
