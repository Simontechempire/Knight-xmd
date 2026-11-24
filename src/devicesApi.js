// src/devicesApi.js - NEW - API for public/index.html
// You will add 2 lines in server.js later, we no touch server.js now
'use strict';
const express = require('express');
const router = express.Router();
const deviceStatus = require('./deviceStatus');
const { pairDeviceSlot, logoutDeviceSlot, syncStatus } = require('./multiDevice');

// GET /api/devices - List all 2-20
router.get('/devices', (req, res) => {
  syncStatus();
  const all = deviceStatus.getAll();
  // ✅ ADDED: Don't leak another person pairing code
  // If you ask for all devices, we hide code unless you specifically ask for your slot
  // Dashboard wey show code go use GET /api/devices/:slot with ?owner=yourNumber
  const safe = {};
  for (const slot in all) {
    const d = { ...all[slot] };
    // Hide code in list view - only owner fit see code for him slot via single endpoint
    if (d.code) d.code = '****';
    safe[slot] = d;
  }
  res.json(safe);
});

// ✅ ADDED: GET /api/devices/:slot - Get single device + code only if you be owner
// Example: GET /api/devices/5?owner=2348012345678 -> go show code if you be owner
router.get('/devices/:slot', (req, res) => {
  syncStatus();
  const slot = String(req.params.slot);
  const all = deviceStatus.getAll();
  const device = all[slot];
  if (!device) return res.json({ success: false, error: 'Device not found' });

  const requester = String(req.query.owner || req.query.number || '').replace(/[^0-9]/g, '');
  // If device get owner and you no be owner, hide code
  if (device.owner && requester && device.owner !== requester) {
    return res.json({ ...device, code: '****', message: 'You cannot see another person pairing code' });
  }
  // If no requester passed (dashboard admin view), show as is
  res.json(device);
});

// POST /api/pair/5  Body: { phone: "2348012345678" }
// Any number can pair with any slot
router.post('/pair/:slot', async (req, res) => {
  try {
    const slot = parseInt(req.params.slot);
    const { phone } = req.body || {};
    if (!phone) return res.json({ success: false, error: 'Phone number required' });
    const result = await pairDeviceSlot(slot, phone);
    res.json({ success: result.success, slot, phone: String(phone).replace(/[^0-9]/g, ''), code: result.code || null, message: result.message, owner: String(phone).replace(/[^0-9]/g, '') });
  } catch (e) {
    // ✅ ADDED: Hijack attempt go come here as error from multiDevice.js
    // Example: "Device 5 already ONLINE for 23480..." - user go see am
    res.json({ success: false, error: e.message });
  }
});

// ✅ ADDED: POST /api/logout/:slot Body: { phone: "2348012345678" }
// Only owner fit logout him own device
router.post('/logout/:slot', async (req, res) => {
  try {
    const slot = parseInt(req.params.slot);
    const { phone, owner } = req.body || {};
    const requester = phone || owner || '';
    const result = await logoutDeviceSlot(slot, requester);
    res.json(result);
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
