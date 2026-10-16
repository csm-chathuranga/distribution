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

export function printPOS(element) {
  const html = renderToStaticMarkup(element);
  const win = window.open('', '_blank', 'width=320,height=800');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site.');
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>POS Print</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; width: 76mm; }
    @media print {
      @page { size: 76mm auto; margin: 2mm 2mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 76mm; }
    }
  </style>
</head>
<body>${html}</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
