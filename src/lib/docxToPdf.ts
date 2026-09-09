import fs from "fs";
import path from "path";
import os from "os";
import { exec, execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * Convierte un Buffer de documento .docx a PDF.
 * - En Windows: Utiliza Word COM (Microsoft Word 16+) para fidelidad visual al 100%.
 * - En Linux (Docker/Railway): Utiliza LibreOffice headless ('soffice --headless --convert-to pdf').
 */
export async function convertDocxBufferToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const timestamp = Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const tmpDocxPath = path.join(tmpDir, `acta_${timestamp}.docx`);
  const tmpPdfPath = path.join(tmpDir, `acta_${timestamp}.pdf`);

  await fs.promises.writeFile(tmpDocxPath, docxBuffer);

  try {
    if (process.platform === "win32") {
      // Usar script PowerShell con Word COM
      const psScriptPath = path.join(process.cwd(), "scripts", "convertDocxToPdfWin.ps1");
      
      if (!fs.existsSync(psScriptPath)) {
        // Generar script si no existe
        const scriptContent = `param([string]\$docxPath, [string]\$pdfPath)
\$word = \$null
\$doc = \$null
try {
  \$word = New-Object -ComObject Word.Application
  \$word.Visible = \$false
  \$word.DisplayAlerts = 0
  \$doc = \$word.Documents.Open(\$docxPath, \$false, \$true)
  \$wdFormatPDF = 17
  \$doc.SaveAs([ref]\$pdfPath, [ref]\$wdFormatPDF)
} catch {
  Write-Error \$_.Exception.Message
  exit 1
} finally {
  if (\$doc -ne \$null) {
    \$doc.Close([ref]\$false)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject(\$doc) | Out-Null
  }
  if (\$word -ne \$null) {
    \$word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject(\$word) | Out-Null
  }
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}
`;
        fs.writeFileSync(psScriptPath, scriptContent);
      }

      await execFileAsync("powershell.exe", [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        psScriptPath,
        "-docxPath",
        tmpDocxPath,
        "-pdfPath",
        tmpPdfPath,
      ]);
    } else {
      // Linux / Docker: LibreOffice headless con perfil aislado para evitar colisiones de locks
      const userProfileDir = path.join(tmpDir, `lo_p_${timestamp}`);
      await fs.promises.mkdir(userProfileDir, { recursive: true });
      try {
        await execAsync(`soffice --headless "-env:UserInstallation=file://${userProfileDir.replace(/\\/g, "/")}" --convert-to pdf --outdir "${tmpDir}" "${tmpDocxPath}"`);
      } finally {
        try {
          await fs.promises.rm(userProfileDir, { recursive: true, force: true });
        } catch {}
      }
    }

    if (!fs.existsSync(tmpPdfPath)) {
      throw new Error("No se pudo generar el archivo PDF desde el documento Word.");
    }

    const pdfBuffer = await fs.promises.readFile(tmpPdfPath);
    return pdfBuffer;
  } finally {
    // Limpieza de temporales
    try {
      if (fs.existsSync(tmpDocxPath)) await fs.promises.unlink(tmpDocxPath);
      if (fs.existsSync(tmpPdfPath)) await fs.promises.unlink(tmpPdfPath);
    } catch {}
  }
}

/**
 * Renderizado nativo ultrarrápido con pdftoppm (poppler-utils instalado en Linux/Docker).
 * No depende de Workers de Javascript ni genera conflictos de empaquetado de Webpack/Next.js.
 */
async function renderPdfWithPdftoppm(pdfBuffer: Buffer): Promise<Buffer[]> {
  const tmpDir = os.tmpdir();
  const id = Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const tmpPdfPath = path.join(tmpDir, `render_${id}.pdf`);
  const outPrefix = path.join(tmpDir, `page_${id}`);

  await fs.promises.writeFile(tmpPdfPath, pdfBuffer);

  try {
    // -png: renderiza a PNG
    // -r 150: 150 DPI proporciona excelente nitidez y velocidad (~30ms)
    await execFileAsync("pdftoppm", ["-png", "-r", "150", tmpPdfPath, outPrefix]);

    const prefixBase = `page_${id}`;
    const files = await fs.promises.readdir(tmpDir);
    const matchingFiles = files
      .filter((f) => f.startsWith(`${prefixBase}-`) && f.endsWith(".png"))
      .sort((a, b) => {
        const numA = parseInt(a.slice(prefixBase.length + 1, -4), 10) || 0;
        const numB = parseInt(b.slice(prefixBase.length + 1, -4), 10) || 0;
        return numA - numB;
      });

    if (matchingFiles.length === 0) {
      throw new Error("pdftoppm no generó ninguna imagen");
    }

    const pages: Buffer[] = [];
    for (const f of matchingFiles) {
      const fullP = path.join(tmpDir, f);
      pages.push(await fs.promises.readFile(fullP));
      try {
        await fs.promises.unlink(fullP);
      } catch {}
    }

    return pages;
  } finally {
    try {
      if (fs.existsSync(tmpPdfPath)) await fs.promises.unlink(tmpPdfPath);
    } catch {}
  }
}

/**
 * Convierte un PDF a imágenes PNG de alta fidelidad.
 * - En Linux / Docker: Utiliza pdftoppm (poppler-utils) de forma nativa en C++, instantáneo y sin workers Webpack.
 * - Fallback: Utiliza pdf-to-png-converter.
 */
export async function convertPdfBufferToPngPages(pdfBuffer: Buffer): Promise<Buffer[]> {
  // 1. Intento nativo de alto rendimiento (pdftoppm)
  try {
    const pages = await renderPdfWithPdftoppm(pdfBuffer);
    if (pages && pages.length > 0) {
      return pages;
    }
  } catch (err: any) {
    console.warn("[convertPdfBufferToPngPages] pdftoppm no disponible o falló:", err?.message);
  }

  // 2. Fallback de compatibilidad
  try {
    const { pdfToPng } = await import("pdf-to-png-converter");
    const pngPages = await pdfToPng(pdfBuffer, {
      viewportScale: 2.0,
    });

    return pngPages
      .map((page) => page.content)
      .filter((content): content is Buffer => Buffer.isBuffer(content));
  } catch (fallbackErr: any) {
    console.error("[convertPdfBufferToPngPages] Fallback pdf-to-png-converter también falló:", fallbackErr);
    throw fallbackErr;
  }
}
