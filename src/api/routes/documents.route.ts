import express from "express";
import multer from "multer";
import {
  deleteDocument,
  getDocuments,
  uploadDocument,
} from "../controllers/documents.controller.js";

const upload = multer({ storage: multer.memoryStorage() });
const documentsRoutes = express.Router();

documentsRoutes.post("/upload", upload.single("file"), uploadDocument);
documentsRoutes.get("/", getDocuments);
documentsRoutes.delete("/:id", deleteDocument);

export default documentsRoutes;
