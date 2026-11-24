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

// Called from public/index.html: User picks Device 5, types ANY number
async function pairDeviceSlot(slot, phoneNumber) {
  const num = parseInt(slot);
  if (num < 2 || num > 20) throw new Error('Slot must be 2-20');

  const clean = String(phoneNumber).replace(/[^0-9]/g, '');
  if (clean.length < 10) throw new Error('Invalid phone number');

  slotMap[num] = clean;
  deviceStatus.set(num, { name: slotNames[num], number: clean, status: 'PAIRING', code: '', connected: false });

  // This calls YOUR existing startBot() in connection.js
  // It already handles SIMON LOCK, session folder sessions/<clean>, pairing code
  const result = await startBot(clean);

  if (result.code) {
    deviceStatus.set(num, { name: slotNames[num], number: clean, status: 'WAITING_CODE', code: result.code, connected: false });
  } else if (result.alreadyConnected) {
    deviceStatus.set(num, { name: slotNames[num], number: clean, status: 'ONLINE', code: '', connected: true });
  } else {
    deviceStatus.set(num, { name: slotNames[num], number: clean, status: 'PAIRING', code: '', connected: false });
  }

  return result; // { success, code, message }
}

// Check status - if socket exists in your activeSockets, mark ONLINE
function syncStatus() {
  for (let num = 2; num <= 20; num++) {
    const number = slotMap[num];
    if (!number) continue;
    const sock = activeSockets[number];
    if (sock && sock.user) {
      deviceStatus.set(num, { name: slotNames[num], number, status: 'ONLINE', code: '', connected: true });
    }
  }
  return deviceStatus.getAll();
}

function getSlotMap() { return { ...slotMap }; }
function getSlotNumber(slot) { return slotMap[slot] || ''; }

module.exports = { pairDeviceSlot, syncStatus, getSlotMap, getSlotNumber, slotNames };
