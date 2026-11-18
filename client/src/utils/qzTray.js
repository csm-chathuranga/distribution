/* QZ Tray WebSocket bridge utilities — uses window.qz loaded from CDN */

function getQZ() {
  if (!window.qz) throw new Error('QZ Tray script not loaded');
  return window.qz;
}

let _connected  = false;
let _configured = false;

function configure() {
  if (_configured) return;
  const qz = getQZ();
  // QZ Tray uses an executor pattern (resolve, reject) — not Promise.resolve()
  qz.security.setCertificatePromise(function(resolve) { resolve(''); });
  qz.security.setSignaturePromise(function(toSign) {
    return function(resolve) { resolve(''); };
  });
  _configured = true;
}

export function isConnected() { return _connected; }

export async function connect() {
  if (_connected) return;
  configure();
  try {
    await getQZ().websocket.connect();
  } catch (e) {
    // Already connected from a previous session — treat as success
    if (e?.message?.toLowerCase().includes('already exists') ||
        e?.message?.toLowerCase().includes('already connected')) {
      _connected = true;
      return;
    }
    throw e;
  }
  _connected = true;
}

export async function disconnect() {
  if (!_connected) return;
  await getQZ().websocket.disconnect();
  _connected = false;
}

export async function getPrinters() {
  if (!_connected) await connect();
  return getQZ().printers.find();
}

export async function printRaw(printerName, commands) {
  if (!_connected) await connect();
  const qz  = getQZ();
  console.log('[QZ] creating config for', printerName);
  const cfg  = qz.configs.create(printerName);

  // Convert binary ESC/POS string to base64 so QZ Tray sends raw bytes correctly
  const raw    = commands.join('');
  const bytes  = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xFF;
  const b64  = btoa(String.fromCharCode(...bytes));

  const data = [{ type: 'raw', format: 'base64', data: b64 }];
  console.log('[QZ] calling qz.print, data length:', b64.length);
  await qz.print(cfg, data);
  console.log('[QZ] print call resolved');
}
