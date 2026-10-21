import { renderToStaticMarkup } from 'react-dom/server';

export function printComponent(element) {
  const html = renderToStaticMarkup(element);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site.');
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; }
    @media print {
      @page { margin: 8mm 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${html}</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export async function printPOS(element) {
  const html = renderToStaticMarkup(element);

  // Resolve paper width from saved Electron settings (or default 80mm)
  let widthMm = 80;
  if (window.electronAPI?.isElectron) {
    try {
      const s = await window.electronAPI.getPrintSettings();
      widthMm = s?.paperWidthMm || 80;
    } catch {}
  }

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>POS Print</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; width: ${widthMm}mm; }
    @media print {
      @page { size: ${widthMm}mm auto; margin: 0mm 2mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; width: ${widthMm}mm; }
    }
  </style>
</head>
<body>${html}</body>
</html>`;

  // Electron: silent print — no dialog
  if (window.electronAPI?.isElectron) {
    return window.electronAPI.posPrint(fullHtml);
  }

  // Browser fallback: popup + native print dialog
  const win = window.open('', '_blank', 'width=320,height=800');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site.');
    return;
  }
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
