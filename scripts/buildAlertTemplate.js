const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

function buildAlertTemplate() {
  const originalPath = path.join(process.cwd(), 'templates', 'NOTIFICACION_DE_ALERTA_ORIGINAL.docx');
  const templatePath = path.join(process.cwd(), 'templates', 'NOTIFICACION_DE_ALERTA_TEMPLATE.docx');

  if (!fs.existsSync(originalPath)) {
    throw new Error(`No se encontró el archivo original en: ${originalPath}`);
  }

  const content = fs.readFileSync(originalPath);
  const zip = new PizZip(content);
  let docXml = zip.file('word/document.xml').asText();

  // 1. Limpiar marcas de ortografía
  docXml = docXml.replace(/<w:proofErr[^>]*\/>/g, '');

  const doc = new DOMParser().parseFromString(docXml, 'text/xml');

  function getElementText(el) {
    const tNodes = el.getElementsByTagName('w:t');
    let s = '';
    for (let i = 0; i < tNodes.length; i++) {
      s += tNodes[i].textContent;
    }
    return s;
  }

  function setParagraphText(p, placeholder) {
    const tNodes = Array.from(p.getElementsByTagName('w:t'));
    if (tNodes.length > 0) {
      tNodes[0].textContent = placeholder;
      for (let i = 1; i < tNodes.length; i++) {
        tNodes[i].textContent = '';
      }
    }
  }

  // Row 12: INTERVENCIÓN DEL DOCENTE QUE DETECTA EL CASO -> Salto de página para que comience en Página 2
  const rows = Array.from(doc.getElementsByTagName('w:tr'));
  for (const tr of rows) {
    const text = getElementText(tr);
    if (text.includes('INTERVENCIÓN DEL DOCENTE QUE DETECTA EL CASO')) {
      const firstP = tr.getElementsByTagName('w:p')[0];
      if (firstP) {
        let pPr = firstP.getElementsByTagName('w:pPr')[0];
        if (!pPr) {
          pPr = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:pPr');
          firstP.insertBefore(pPr, firstP.firstChild);
        }
        const pbb = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:pageBreakBefore');
        pPr.appendChild(pbb);
      }
    }
  }

  const paras = Array.from(doc.getElementsByTagName('w:p'));

  // 2. Información del Estudiante
  for (const p of paras) {
    const text = getElementText(p);

    if (text.includes('Tatiana Lizbeth Toapanta Pilamunga')) {
      setParagraphText(p, '{{nombre_estudiante}}');
    } else if (text.includes('1850811231')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('1850811231')) {
          t.textContent = t.textContent.replace('1850811231', '{{cedula_estudiante}}');
        }
      }
    } else if (text.includes('28/04/2010')) {
      setParagraphText(p, '{{fecha_nacimiento_estudiante}}');
    } else if (text.includes('15 años')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('15 años')) {
          t.textContent = t.textContent.replace('15 años', '{{edad_estudiante}}');
        }
      }
    } else if (text.includes('Rosa María Pilamunga Flores')) {
      setParagraphText(p, '{{nombre_representante}}');
    } else if (text.includes('Santa Rosa, Sector San Pablo')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('Santa Rosa, Sector San Pablo, Cuatro Esquinas')) {
          t.textContent = t.textContent.replace('Santa Rosa, Sector San Pablo, Cuatro Esquinas', '{{direccion_domiciliaria}}');
        }
      }
    } else if (text.includes('0989330713')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('0989330713')) {
          t.textContent = t.textContent.replace('0989330713', '{{telefono_representante}}');
        }
      }
    } else if (text === '1ro. BGF') {
      setParagraphText(p, '{{grado_curso}}');
    } else if (text.includes('“B”')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('“B”')) {
          t.textContent = t.textContent.replace('“B”', '“{{paralelo}}”');
        }
      }
    } else if (text.includes('Jornada: M ( X )  V (    )')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('Jornada: M ( X )  V (    )')) {
          t.textContent = 'Jornada: M ( {{jornada_m}} )  V ( {{jornada_v}} )';
        }
      }
    } else if (text === 'Licda. Cecilia Naranjo') {
      setParagraphText(p, '{{docente_tutor}}');
    }

    // 3. Aspectos de Dificultad (casillas de verificación)
    if (text === '( )' && p.nextSibling) {
      setParagraphText(p, '({{alerta_inestabilidad_emocional}})');
    } else if (text === '(….)' || text === '( X )' || text === '(…..)' || text === '(…)') {
      const parentCell = p.parentNode;
      const cellText = getElementText(parentCell);
      if (cellText.includes('Hijo/a de PPL')) {
        setParagraphText(p, '({{alerta_hijo_ppl}})');
      } else if (cellText.includes('Trabajo infantil')) {
        setParagraphText(p, '({{alerta_trabajo_infantil}})');
      } else if (cellText.includes('Riesgo Psicosocial')) {
        setParagraphText(p, '({{alerta_riesgo_psicosocial}})');
      } else if (cellText.includes('Movilidad Humana')) {
        setParagraphText(p, '({{alerta_movilidad_humana}})');
      } else if (cellText.includes('Conflictos')) {
        setParagraphText(p, '({{alerta_conflictos_intrafamiliares}})');
      } else if (cellText.includes('Autolesiones')) {
        setParagraphText(p, '({{alerta_autolesiones_ideacion}})');
      } else if (cellText.includes('Hostigamiento')) {
        setParagraphText(p, '({{alerta_hostigamiento_academico}})');
      } else if (cellText.includes('Embarazo, maternidad')) {
        setParagraphText(p, '({{alerta_embarazo_maternidad_paternidad}})');
      } else if (cellText.includes('Posible dependencia')) {
        setParagraphText(p, '({{alerta_posible_dependencia_sustancias}})');
      } else if (cellText.includes('Vulneración de Derechos')) {
        setParagraphText(p, '({{alerta_vulneracion_derechos}})');
      }
    } else if (text.includes('(….) Otros')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('(….) Otros')) {
          t.textContent = t.textContent.replace('(….) Otros', '({{alerta_otros}}) Otros');
        }
      }
    }

    // 4. Especificar Alerta
    if (text.includes('Especificar:') && text.includes('Victima de Violencia Sexual')) {
      const tNodes = Array.from(p.getElementsByTagName('w:t'));
      let replaced = false;
      for (const t of tNodes) {
        if (t.textContent.includes('Presunta') || t.textContent.includes('Victima')) {
          if (!replaced) {
            t.textContent = ' {{especificar_alerta}}';
            replaced = true;
          } else {
            t.textContent = '';
          }
        } else if (t.textContent.includes('de Violencia Sexual')) {
          t.textContent = '';
        }
      }
    }

    // 5. Lugar y fecha
    if (text.startsWith('Lugar y fecha:') && text.includes('Con fecha lunes 20 de abril de 2026')) {
      const tNodes = Array.from(p.getElementsByTagName('w:t'));
      let foundColon = false;
      let replaced = false;
      for (const t of tNodes) {
        if (!foundColon) {
          if (t.textContent.includes(':')) {
            foundColon = true;
          }
        } else {
          if (!replaced) {
            t.textContent = ' {{lugar_fecha_hechos}}';
            replaced = true;
          } else {
            t.textContent = '';
          }
        }
      }
    }

    // Eliminar párrafos específicos de ejemplo de Tatiana (57 y 58)
    if (text.startsWith('Los representantes legales refieren que la adolescente')) {
      p.parentNode.removeChild(p);
    } else if (text.startsWith('En este contexto, los representantes expresan la percepción')) {
      p.parentNode.removeChild(p);
    }

    // 6. Intervención Docente (Preguntas 1 a 5)
    if (text.startsWith('La estudiante requiere atención psicosocial urgente del DECE')) {
      setParagraphText(p, '{{intervencion_pregunta_1}}');
    } else if (text.startsWith('El caso refleja una configuración de vulnerabilidad psicosocial compleja')) {
      setParagraphText(p, '{{intervencion_pregunta_2}}');
    } else if (
      text.startsWith('Desde un enfoque psicosocial, estas dificultades pueden estar vinculadas a:') ||
      text.startsWith('Procesos propios de la adolescencia') ||
      text.startsWith('Déficits en habilidades para la toma de decisiones') ||
      text.startsWith('Carencias en educación afectivo-sexual') ||
      text.startsWith('Necesidades emocionales no cubiertas en el entorno familiar')
    ) {
      p.parentNode.removeChild(p);
    } else if (text.startsWith('El caso evidencia un modelo multicausal')) {
      setParagraphText(p, '{{intervencion_pregunta_3}}');
    } else if (
      text.startsWith('Procesos evolutivos no acompañados') ||
      text.startsWith('Entornos con limitaciones en educación afectivo-sexual') ||
      text.startsWith('Influencias externas significativas (pareja y entorno digital)') ||
      text.startsWith('Déficits en redes de apoyo y contención')
    ) {
      p.parentNode.removeChild(p);
    } else if (text.startsWith('El hecho fue informado al DECE por parte de su representante legal')) {
      setParagraphText(p, '{{intervencion_pregunta_4}}');
    } else if (text === 'Se desconoce') {
      setParagraphText(p, '{{intervencion_pregunta_5}}');
    }

    // 7. Notificador de la Alerta
    if (text.includes('Nombre y apellido:') && text.includes('Marlon Jácome')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('Psc')) {
          t.textContent = ' {{notificador_nombre}}';
        } else if (t.textContent.includes('Marlon Jácome')) {
          t.textContent = '';
        }
      }
    } else if (text === 'Analista DECE') {
      setParagraphText(p, '{{notificador_cargo}}');
    } else if (text.includes('Contacto:') && text.includes('0995590239')) {
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('0995590239')) {
          t.textContent = t.textContent.replace('0995590239', '{{notificador_contacto}}');
        }
      }
    } else if (text.includes('Fecha de entrega al Dpto. DECE:') && text.includes('21/04/2026')) {
      let replaced = false;
      for (const t of Array.from(p.getElementsByTagName('w:t'))) {
        if (t.textContent.includes('21') || t.textContent.includes('/0') || t.textContent.includes('4') || t.textContent.includes('/2026')) {
          if (!replaced) {
            t.textContent = ' {{fecha_entrega_dece}}';
            replaced = true;
          } else {
            t.textContent = '';
          }
        }
      }
    }
  }

  const serializedXml = new XMLSerializer().serializeToString(doc);
  console.log(`XML Serializado con éxito. Longitud: ${serializedXml.length}, Párrafos: ${doc.getElementsByTagName('w:p').length}`);

  zip.file('word/document.xml', serializedXml);
  const outBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(templatePath, outBuffer);
  console.log(`Plantilla canónica de alerta generada con éxito en: ${templatePath} (${outBuffer.length} bytes)`);
}

if (require.main === module) {
  buildAlertTemplate();
}

module.exports = { buildAlertTemplate };

