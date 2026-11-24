// src/devicesApi.js - NEW - API for public/index.html
// You will add 2 lines in server.js later, we no touch server.js now
'use strict';
const express = require('express');
const router = express.Router();
const deviceStatus = require('./deviceStatus');
const { pairDeviceSlot, syncStatus } = require('./multiDevice');

// GET /api/devices - List all 2-20
router.get('/devices', (req, res) => {
  syncStatus();
  res.json(deviceStatus.getAll());
});

// POST /api/pair/5  Body: { phone: "2348012345678" }
// Any number can pair with any slot
router.post('/pair/:slot', async (req, res) => {
  try {
    const slot = parseInt(req.params.slot);
    const { phone } = req.body || {};
    if (!phone) return res.json({ success: false, error: 'Phone number required' });
    const result = await pairDeviceSlot(slot, phone);
    res.json({ success: result.success, slot, phone: String(phone).replace(/[^0-9]/g, ''), code: result.code || null, message: result.message });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
