const express = require("express");
const router = express.Router();

const eventos = require("./evento")
const auth = require("./auth");

router.use("/", auth);
router.use('/uploads', express.static('public/uploads'));
router.use('/api/eventos', eventos);

module.exports = router;