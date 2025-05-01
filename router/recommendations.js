const express = require("express");
const router = express.Router();

const recommendations = [];

router.post("/", (req, res) => {
  const data = req.body;

  recommendations.push({
    ...data,
    id: Date.now(),
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true });
});

router.get("/", (req, res) => {
  res.json(recommendations);
});

router.put("/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const index = recommendations.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).json({ error: "No encontrado" });
  
    recommendations[index] = { ...recommendations[index], ...req.body };
    res.json({ success: true, updated: recommendations[index] });
});
  
router.delete("/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const index = recommendations.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).json({ error: "No encontrado" });
  
    recommendations.splice(index, 1);
    res.json({ success: true });
});

module.exports = router;
