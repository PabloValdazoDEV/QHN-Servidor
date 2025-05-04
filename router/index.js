const express = require("express");
const router = express.Router();

const eventos = require("./evento")
const auth = require("./auth");
const recommendations = require("./recommendations");

router.use("/", auth);
router.use('/uploads', express.static('public/uploads'));
router.use('/api/eventos', eventos);
router.use("/api/recommendations", recommendations); 

module.exports = router;