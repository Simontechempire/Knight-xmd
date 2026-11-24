// src/deviceStatus.js - NEW - Status for 20 devices
// No touch to connection.js
'use strict';

const store = {}; // { 2: {name, number, status, code, connected, owner, prefix}, ... }

function set(num, data) {
  store[num] = { ...store[num], ...data, updatedAt: Date.now() };
  // ✅ ADDED: If number dey, owner = number automatically (unless explicitly set)
  // So Slot 5 with number 23480... -> owner = 23480...
  if (data.number && !data.owner) store[num].owner = String(data.number).replace(/[^0-9]/g, '');
  if (!store[num].prefix) store[num].prefix = '.';
  if (!store[num].owner) store[num].owner = '';
}

function get(num) { return store[num] || null; }

function getAll() {
  const out = {};
  for (let i = 2; i <= 20; i++) {
    out[i] = store[i] || { name: `Knight - Device ${i}`, number: '', status: 'NOT_PAIRED', code: '', connected: false, owner: '', prefix: '.' };
  }
  return out;
}

function clearCode(num) {
  if (store[num]) store[num].code = '';
}

// ✅ ADDED: Find device by owner number - to prevent 1 number = 2 slots
function getByOwner(ownerNumber) {
  const clean = String(ownerNumber || '').replace(/[^0-9]/g, '');
  for (let i = 2; i <= 20; i++) {
    if (store[i]?.owner === clean || store[i]?.number === clean) return { slot: i, ...store[i] };
  }
  return null;
}

// ✅ ADDED: Check if requester be owner for this slot
function isOwner(num, requesterNumber) {
  const clean = String(requesterNumber || '').replace(/[^0-9]/g, '');
  const device = store[num];
  if (!device || !device.owner) return true; // No owner yet, allow
  return device.owner === clean;
}

module.exports = { set, get, getAll, clearCode, getByOwner, isOwner };
