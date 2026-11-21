import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import documentsRoutes from "./routes/documents.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/documents", documentsRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
