const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const srcPath = path.join(__dirname, '..', 'templates', 'ACTAS_DE_COMPROMISO_CORRESPONSABILIDAD_CON_REPRESENTANTES_LEGALES.docx');
const destPath = path.join(__dirname, '..', 'templates', 'ACTA_CORRESPONSABILIDAD_TEMPLATE.docx');

if (!fs.existsSync(srcPath)) {
  console.error('No se encontró el archivo original en:', srcPath);
  process.exit(1);
}

const content = fs.readFileSync(srcPath);
const zip = new PizZip(content);

let docXml = zip.file('word/document.xml').asText();

// Extract sectPr to preserve exact page margins and headers
const sectPrMatch = docXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
const sectPr = sectPrMatch ? sectPrMatch[0] : '';

const pPrCenter = '<w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/></w:rPr></w:pPr>';
const pPrJustified = '<w:pPr><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/></w:rPr></w:pPr>';
const pPrJustifiedSpacing = '<w:pPr><w:jc w:val="both"/><w:spacing w:after="160" w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/></w:rPr></w:pPr>';

const rPrNormal = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>';
const rPrBold = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>';

function r(text, isBold = false) {
  return `<w:r>${isBold ? rPrBold : rPrNormal}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 2-column signature table XML without borders
const tableXml = `
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="8931" w:type="dxa"/>
    <w:jc w:val="center"/>
    <w:tblBorders>
      <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top w:w="80" w:type="dxa"/>
      <w:left w:w="120" w:type="dxa"/>
      <w:bottom w:w="80" w:type="dxa"/>
      <w:right w:w="120" w:type="dxa"/>
    </w:tblCellMar>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="4400"/>
    <w:gridCol w:w="4531"/>
  </w:tblGrid>
  <w:tr>
    <w:trPr><w:cantSplit/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4400" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('____________________________________')}
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('PROFESIONAL DECE', true)}
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4531" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('____________________________________')}
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('REPRESENTANTE LEGAL', true)}
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="30" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('Nombres completos: {nombre_representante_legal}')}
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="30" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('Cédula: {cedula_representante_legal}')}
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="30" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('Teléfono: {telefono_representante_legal}')}
      </w:p>
    </w:tc>
  </w:tr>
  <w:tr>
    <w:trPr><w:cantSplit/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4400" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('____________________________________')}
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
        ${r('TUTOR / AUTORIDAD', true)}
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4531" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>
      <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
    </w:tc>
  </w:tr>
</w:tbl>
`;

const newDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2016/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/chartex/format" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/chartex/layout" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/chartex/shared" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/chartex/stat" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2017/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2018/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/overviewlayout" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh wp14">
  <w:body>
    <w:p>
      ${pPrCenter}
    </w:p>
    <w:p>
      ${pPrCenter}
      ${r('ACTA DE CORRESPONSABILIDAD ENTRE DECE Y PREPRESENTANTES LEGALES', true)}
    </w:p>
    <w:p>
      ${pPrJustifiedSpacing}
      ${r('En Ambato a los: ')}
      ${r('{dia}')}
      ${r(' días del mes de ')}
      ${r('{mes}')}
      ${r(' de 20')}
      ${r('{anio_2_digitos}')}
      ${r(' siendo las: ')}
      ${r('{hora}')}
      ${r(' H, Yo ')}
      ${r('{nombre_representante_legal}')}
      ${r(' Con CI ')}
      ${r('{cedula_representante_legal}')}
      ${r(' en calidad de representante legal del/la estudiante ')}
      ${r('{nombre_estudiante}')}
      ${r(' que cursa el ')}
      ${r('{curso}')}
      ${r(' Jornada M ( {jornada_m} ) V ( {jornada_v} ) en presencia del/la profesional del Departamento de Consejería estudiantil. Mediante presente documento hago constar que conozco: ')}
    </w:p>
    <w:p>
      ${pPrJustified}
      ${r('Dificultad detectada:')}
    </w:p>
    <w:p>
      ${pPrJustifiedSpacing}
      ${r('{dificultad_detectada}')}
    </w:p>
    <w:p>
      ${pPrJustifiedSpacing}
      ${r('Se realiza la atención y valoración integral, llegando a los siguientes acuerdos y compromisos por el bienestar del estudiante, en consideración a lo que menciona en la LOEI, en el Artículo 13 (inciso “a”-“k”) referente a las obligaciones de las madres, padres y/o representantes legales. CONNA, Artículo 39 obligaciones de los progenitores, Art 29 y 39.- derechos y deberes de los progenitores con relación al derecho a la educación (numeral 1 al 8).')}
    </w:p>
    <w:p>
      ${pPrJustified}
      ${r('Para ello se llega a los siguientes acuerdos y compromisos:')}
    </w:p>
    <w:p>
      ${pPrJustifiedSpacing}
      ${r('{acuerdos_y_compromisos}')}
    </w:p>
    <w:p>
      ${pPrJustifiedSpacing}
      ${r('Los compromisos aquí establecidos se realizan sin prejuicio de los procedimientos comportamentales y académicos a los que hubiere lugar.')}
    </w:p>
    <w:p>
      ${pPrJustifiedSpacing}
      ${r('Por su parte el profesional DECE se compromete a brindar el contingente y seguimiento necesario al estudiante, según sus competencias, mientras se encuentre dentro del sistema educativo. Una vez dada lectura del acta y en acuerdo de la misma se procede a firmarla tomando en consideración que al no cumplir con los compromisos establecidos se procederá a enviar el caso a instancias pertinentes.')}
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="240"/></w:pPr>
    </w:p>
    ${tableXml}
    ${sectPr}
  </w:body>
</w:document>
`;

zip.file('word/document.xml', newDocXml);
fs.writeFileSync(destPath, zip.generate({ type: 'nodebuffer' }));
console.log('✅ Plantilla oficial generada con éxito en:', destPath);
