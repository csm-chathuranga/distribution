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

// Print multiple elements as sequential POS jobs (one per thermal cut).
// In Electron: fires each as a separate silent print job with a small delay.
// In browser: opens one popup with CSS page-breaks between receipts.
export async function printPOSAll(elements) {
  const inElectron = !!window.electronAPI?.isElectron;

  let widthMm = 80;
  if (inElectron) {
    try {
      const s = await window.electronAPI.getPrintSettings();
      widthMm = s?.paperWidthMm || 80;
    } catch {}
  }

  const toHtml = (el) => {
    const inner = renderToStaticMarkup(el);
    return `<!DOCTYPE html>
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
<body>${inner}</body>
</html>`;
  };

  if (inElectron) {
    for (const el of elements) {
      try {
        await window.electronAPI.posPrint(toHtml(el));
        // Small gap so the printer queue doesn't overlap
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        console.error('[printPOSAll] job failed:', e);
      }
    }
    return;
  }

  // Browser: single popup with CSS page-breaks
  const combinedInner = elements.map((el, i) => {
    const inner = renderToStaticMarkup(el);
    return i < elements.length - 1
      ? `<div style="page-break-after:always">${inner}</div>`
      : `<div>${inner}</div>`;
  }).join('');

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
<body>${combinedInner}</body>
</html>`;

  const win = window.open('', '_blank', 'width=320,height=800');
  if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export async function printPOS(element) {
  const html = renderToStaticMarkup(element);

  const inElectron = !!window.electronAPI?.isElectron;

  let widthMm = 80;
  if (inElectron) {
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
  if (inElectron) {
    try { await window.electronAPI.posPrint(fullHtml); } catch (e) { console.error('[print]', e); }
    return;
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
