const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createEvento,
  getEventos,
  uploadEventoImage,
  updateEvento,
  getEventoById,
  getEventCity,
  getEventCityCategory,
  getEventCategory,
  getEventSlug,
  deleteEvent,
  updateEventVerified,
  getEventosCollaborator,
  getAllEventUser,
  getAllEventUserLast,
} = require("../controllers/eventoController.js");
const authMiddleware = require("../middelwares/authMiddleware");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/ciudad/:city", getEventCity);
router.get("/ciudad/:city/:category", getEventCityCategory);
router.get("/categoria/:category", getEventCategory);
router.get("/event/:city/:category/:slug", getEventSlug);
router.put("/verified/:id", authMiddleware, updateEventVerified);
router.get("/user/last", getAllEventUserLast);
router.get("/user", getAllEventUser);
router.put("/:id", authMiddleware, updateEvento);
router.delete("/:id", authMiddleware, deleteEvent);
router.post("/", authMiddleware, createEvento);
router.get("/", authMiddleware, getEventos);
router.get("/collaborator/:id",authMiddleware, getEventosCollaborator);
router.get("/:id",authMiddleware, getEventoById);
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadEventoImage
);

module.exports = router;
