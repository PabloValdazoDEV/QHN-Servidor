const express = require("express");
const router = express.Router();

const auth = require("./auth");
const recommendations = require("./recommendations");

router.use("/", auth);
router.use("/api/recommendations", recommendations); 

module.exports = router;