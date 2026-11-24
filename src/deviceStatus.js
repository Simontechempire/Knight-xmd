// src/deviceStatus.js - NEW - Status for 20 devices
// No touch to connection.js
'use strict';

const store = {}; // { 2: {name, number, status, code, connected}, ... }

function set(num, data) {
  store[num] = { ...store[num], ...data, updatedAt: Date.now() };
}

function get(num) { return store[num] || null; }

function getAll() {
  const out = {};
  for (let i = 2; i <= 20; i++) {
    out[i] = store[i] || { name: `Knight - Device ${i}`, number: '', status: 'NOT_PAIRED', code: '', connected: false };
  }
  return out;
}

function clearCode(num) {
  if (store[num]) store[num].code = '';
}

module.exports = { set, get, getAll, clearCode };
