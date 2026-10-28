import express from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/auth.js";
import { getSyncStatus, importEvents, isAllowedFeedUrl, parseICS, syncFeedAndLog } from "../services/ics.js";
import { fillMissingImages } from "../services/portugalRunning.js";
import { serverError } from "../utils/http.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 20 } });

router.use(requireAdmin);

// Upload .ics files (single or multiple)
router.post("/import-ics", upload.array("icsFiles", 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado." });
    }

    const allEvents = [];
    const fileNames = [];
    for (const file of req.files) {
      allEvents.push(...parseICS(file.buffer.toString("utf-8")));
      fileNames.push(file.originalname);
    }

    if (allEvents.length === 0) {
      return res.json({ imported: 0, total: 0, files: fileNames, message: "Nenhum evento encontrado nos ficheiros" });
    }

    const result = await importEvents(allEvents);
    res.json({ ...result, files: fileNames, errors: result.errors.length ? result.errors : undefined });
  } catch (err) {
    serverError(res, err, "Erro ao importar os ficheiros.");
  }
});

// Import from TeamUp ICS feed
router.post("/import-teamup", async (req, res) => {
  try {
    const feedUrl = req.body.feedUrl || process.env.TEAMUP_ICS_FEED;
    if (!feedUrl) return res.status(400).json({ error: "Indica o URL do feed ou define TEAMUP_ICS_FEED." });
    if (!isAllowedFeedUrl(feedUrl)) {
      return res.status(400).json({ error: "Só são aceites feeds https://ics.teamup.com/..." });
    }

    const result = await syncFeedAndLog(feedUrl, "manual");
    res.json({ ...result, errors: result.errors.length ? result.errors : undefined, source: "TeamUp ICS Feed" });
  } catch (err) {
    serverError(res, err, "Erro ao sincronizar o feed TeamUp.");
  }
});

// Looks up images on portugalrunning.com for upcoming races without one
router.post("/portugal-running-images", async (_req, res) => {
  try {
    const result = await fillMissingImages({ limit: 20, force: true });
    if (result.busy) return res.status(409).json({ error: "Já está a decorrer uma procura de imagens. Tenta daqui a pouco." });
    res.json(result);
  } catch (err) {
    serverError(res, err, "Erro ao procurar imagens no Portugal Running.");
  }
});

// Last TeamUp sync, automatic or manual
router.get("/sync-status", async (_req, res) => {
  try {
    res.json(await getSyncStatus());
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
