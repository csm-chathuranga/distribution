import { renderToStaticMarkup } from 'react-dom/server';

const inElectron = () => !!window.electronAPI?.isElectron;

function buildA4Html(bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; }
    @media print {
      @page { size: A4; margin: 8mm 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function buildPosHtml(bodyHtml, widthMm = 80) {
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
<body>${bodyHtml}</body>
</html>`;
}

// A4 print — silent in Electron via printReceiptHtml, popup in browser
export async function printComponent(element) {
  const bodyHtml = renderToStaticMarkup(element);
  const fullHtml = buildA4Html(bodyHtml);

  if (inElectron()) {
    try {
      await window.electronAPI.printReceiptHtml(bodyHtml, { paperSize: 'A4' });
    } catch (e) {
      console.error('[printComponent] Electron printReceiptHtml failed:', e);
    }
    return;
  }

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// Thermal POS print — silent in Electron, popup in browser
export async function printPOS(element) {
  const bodyHtml = renderToStaticMarkup(element);
  const fullHtml = buildPosHtml(bodyHtml);

  if (inElectron()) {
    try {
      await window.electronAPI.printReceiptHtml(bodyHtml);
    } catch (e) {
      console.error('[printPOS] Electron printReceiptHtml failed:', e);
    }
    return;
  }

  const win = window.open('', '_blank', 'width=320,height=800');
  if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// Multiple thermal receipts — one Electron job each, or single popup with page-breaks in browser
export async function printPOSAll(elements) {
  if (inElectron()) {
    for (const el of elements) {
      try {
        await window.electronAPI.printReceiptHtml(renderToStaticMarkup(el));
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        console.error('[printPOSAll] job failed:', e);
      }
    }
    return;
  }

  const combinedInner = elements.map((el, i) => {
    const inner = renderToStaticMarkup(el);
    return i < elements.length - 1
      ? `<div style="page-break-after:always">${inner}</div>`
      : `<div>${inner}</div>`;
  }).join('');

  const win = window.open('', '_blank', 'width=320,height=800');
  if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
  win.document.write(buildPosHtml(combinedInner));
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
