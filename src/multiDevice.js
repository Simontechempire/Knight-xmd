// src/multiDevice.js - V3 - Uses your existing connection.js startBot()
// No duplicate makeWASocket, No QR, No fixed number
// Any number can pair with any device slot 2-20 via public/index.html
'use strict';

const { startBot, activeSockets } = require('./connection');
const deviceStatus = require('./deviceStatus');

// Slot 2-20 -> Phone Number mapping (in memory only)
// Example: slotMap[5] = "2348012345678"
const slotMap = {}; // { 2: '234...', 3: '234...' }
const slotNames = {};
for (let i = 2; i <= 20; i++) slotNames[i] = `Knight - Device ${i}`;

// ===== ✅ ADDED: PER-SESSION ISOLATION FOR 20 DEVICES =====
// Before: Anybody fit pair any slot, overwrite another person bot
// Now: Slot get owner. If Slot 5 na for You and e ONLINE, David no fit take am.
// And one number no fit occupy 2 slots at same time.

function findSlotByNumber(clean) {
  for (const slot in slotMap) {
    if (slotMap[slot] === clean) return parseInt(slot);
  }
  return null;
}

// Called from public/index.html: User picks Device 5, types ANY number
async function pairDeviceSlot(slot, phoneNumber) {
  const num = parseInt(slot);
  if (num < 2 || num > 20) throw new Error('Slot must be 2-20');

  const clean = String(phoneNumber).replace(/[^0-9]/g, '');
  if (clean.length < 10) throw new Error('Invalid phone number');

  // ✅ ADDED: 1 number = 1 slot. Prevent same number for 2 slots.
  const existingSlot = findSlotByNumber(clean);
  if (existingSlot && existingSlot !== num) {
    throw new Error(`This number already paired on Device ${existingSlot}. Use that slot or logout first.`);
  }

  // ✅ ADDED: 1 slot = 1 owner. Prevent hijack.
  // If slot already get different number and e ONLINE, block am.
  const currentNumber = slotMap[num];
  if (currentNumber && currentNumber !== clean) {
    const currentSock = activeSockets[currentNumber];
    if (currentSock && currentSock.user) {
      throw new Error(`Device ${num} already ONLINE for ${currentNumber}. You cannot take over another person's bot. Logout that device first.`);
    }
    // If old number no online, allow to replace am - but log am
    console.log(`[DEVICE ${num}] Slot reused: ${currentNumber} -> ${clean}`);
  }

  slotMap[num] = clean;
  deviceStatus.set(num, { name: slotNames[num], number: clean, status: 'PAIRING', code: '', connected: false, owner: clean });

  // This calls YOUR existing startBot() in connection.js
  // It already handles SIMON LOCK, session folder sessions/<clean>, pairing code
  // And now startBot() creates sessions/<clean>/settings.json with owner = clean
  const result = await startBot(clean);

  if (result.code) {
    deviceStatus.set(num, { name: slotNames[num], number: clean, status: 'WAITING_CODE', code: result.code, connected: false, owner: clean });
  } else if (result.alreadyConnected) {
    deviceStatus.set(num, { name: slotNames[num], number: clean, status: 'ONLINE', code: '', connected: true, owner: clean });
  } else {
    deviceStatus.set(num, { name: slotNames[num], number: clean, status: 'PAIRING', code: '', connected: false, owner: clean });
  }

  return result; // { success, code, message }
}

// ✅ ADDED: Logout only your own slot - you no fit logout another person device
async function logoutDeviceSlot(slot, requesterNumber) {
  const num = parseInt(slot);
  const clean = slotMap[num];
  if (!clean) throw new Error(`Device ${num} not paired`);
  if (requesterNumber) {
    const reqClean = String(requesterNumber).replace(/[^0-9]/g, '');
    // Only owner fit logout him own slot. If no requester passed, allow (dashboard admin)
    if (reqClean && reqClean !== clean) {
      throw new Error('You cannot logout another person device. Na only owner fit logout am.');
    }
  }
  const sock = activeSockets[clean];
  try { if (sock) { await sock.logout().catch(() => {}); sock.end(); } } catch {}
  delete activeSockets[clean];
  delete slotMap[num];
  deviceStatus.set(num, { name: slotNames[num], number: '', status: 'OFFLINE', code: '', connected: false, owner: '' });
  return { success: true, message: `Device ${num} logged out` };
}

// Check status - if socket exists in your activeSockets, mark ONLINE
function syncStatus() {
  for (let num = 2; num <= 20; num++) {
    const number = slotMap[num];
    if (!number) continue;
    const sock = activeSockets[number];
    if (sock && sock.user) {
      // ✅ ADDED: Show owner + session prefix for this device
      const prefix = sock.sessionSettings?.prefix || '.';
      deviceStatus.set(num, { name: slotNames[num], number, status: 'ONLINE', code: '', connected: true, owner: number, prefix });
    }
  }
  return deviceStatus.getAll();
}

function getSlotMap() { return { ...slotMap }; }
function getSlotNumber(slot) { return slotMap[slot] || ''; }

module.exports = { pairDeviceSlot, logoutDeviceSlot, syncStatus, getSlotMap, getSlotNumber, slotNames };
