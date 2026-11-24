// src/multiDevice.js - V2 - Any Number Can Pair With Any Device
// Pairing via public/index.html - No QR, No Terminal, No Fixed Number
'use strict';

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

let deviceStatus = {};
try { deviceStatus = require('./deviceStatus'); } catch (e) { deviceStatus = { set:()=>{}, getAll:()=>({}) }; }

// Store all sockets so dashboard can ask for pairing code anytime
const allSocks = {}; // { 2: sock, 3: sock ... }
const allStates = {}; // { 2: {state, saveCreds} }

const DEVICE_NAMES = {
  2: 'Knight - Device 2', 3: 'Knight - Device 3', 4: 'Knight - Device 4',
  5: 'Knight - Device 5', 6: 'Knight - Device 6', 7: 'Knight - Device 7',
  8: 'Knight - Device 8', 9: 'Knight - Device 9', 10: 'Knight - Device 10',
  11: 'Knight - Device 11', 12: 'Knight - Device 12', 13: 'Knight - Device 13',
  14: 'Knight - Device 14', 15: 'Knight - Device 15', 16: 'Knight - Device 16',
  17: 'Knight - Device 17', 18: 'Knight - Device 18', 19: 'Knight - Device 19',
  20: 'Knight - Device 20',
};

async function startOneDevice(num, handler) {
  const folder = `sessions/device${num}`;
  const name = DEVICE_NAMES[num] || `Knight - Device ${num}`;

  const { state, saveCreds } = await useMultiFileAuthState(folder);
  allStates[num] = { state, saveCreds };

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // NO QR IN TERMINAL
    browser: [name, 'Chrome', '1.0'],
    syncFullHistory: false,
  });

  allSocks[num] = sock;

  sock.ev.on('creds.update', saveCreds);

  // Same handler for all devices
  sock.ev.on('messages.upsert', async (m) => {
    try { await handler(sock, m); } catch (e) { console.log(`[Device ${num}] handler error:`, e.message); }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log(`[Device ${num} | ${name}] ✅ Connected`);
      const old = deviceStatus.getAll()[num] || {};
      deviceStatus.set(num, { name, number: old.number || '', status: 'ONLINE', code: '', connected: true });
    }
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(`[Device ${num} | ${name}] ❌ Disconnected: ${reason}`);
      const old = deviceStatus.getAll()[num] || {};
      // Keep number, just mark offline - user can re-pair same or new number
      deviceStatus.set(num, { name, number: old.number || '', status: 'OFFLINE', code: '', connected: false });
    }
  });

  // Initial status
  const isRegistered = sock.authState.creds.registered;
  deviceStatus.set(num, { 
    name, 
    number: '', 
    status: isRegistered ? 'ONLINE' : 'NOT_PAIRED', 
    code: '', 
    connected: isRegistered 
  });

  return sock;
}

// === THIS IS THE MAIN FUNCTION DASHBOARD WILL CALL ===
// User types ANY number in public/index.html -> this generates code
async function requestPairingCode(num, phoneNumber) {
  const sock = allSocks[num];
  if (!sock) throw new Error(`Device ${num} not started`);

  // Clean number: remove +, spaces, -
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanNumber.length < 10) throw new Error('Invalid phone number');

  // If already registered with another number, user must delete sessions/device${num} first
  // OR we allow re-pair: Baileys will overwrite if not registered

  const code = await sock.requestPairingCode(cleanNumber);
  const name = DEVICE_NAMES[num];

  console.log(`[Device ${num}] Pairing Code for ${cleanNumber}: ${code}`);

  deviceStatus.set(num, { name, number: cleanNumber, status: 'WAITING_CODE', code, connected: false });

  return code;
}

async function startAllExtraDevices(handler) {
  console.log('--- Starting Knight XMD Devices 2-20 (Dashboard Pairing) ---');
  const socks = [];
  for (let num = 2; num <= 20; num++) {
    // No SESSION_ check again - All 20 always start, but NOT_PAIRED until user pairs
    // If you want to disable one, delete its folder and don't pair it
    try {
      const sock = await startOneDevice(num, handler);
      socks.push({ num, sock });
    } catch (e) { console.log(`[Device ${num}] Failed:`, e.message); }
  }
  console.log(`Started ${socks.length} extra devices. Pair them from public/index.html`);
  return socks;
}

module.exports = { startAllExtraDevices, startOneDevice, requestPairingCode, allSocks, DEVICE_NAMES };
