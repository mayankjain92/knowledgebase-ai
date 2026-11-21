import { Request, Response } from "express";
import { parser, pipeline, vectorStore } from "../services.js";

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file)
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Form field must be 'file'.",
      });

    const parsed = await parser.parse(req.file.buffer, req.file.originalname);
    const doc = parser.toIngestionDocument(parsed);

    const chunks = await pipeline.ingest(doc);

    await vectorStore.insertDocument(doc);
    await vectorStore.insertChunks(chunks);

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully.",
      document: {
        id: doc.id,
        title: doc.title,
        format: parsed.format,
        toalChunks: chunks.length,
      },
    });
  } catch (err: any) {
    console.error("Upload failed:", err);
    return res
      .status(500)
      .json({ error: err.message || "Upload processing error" });
  }
};

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await vectorStore.listDocument();
    return res.status(200).json({
      success: true,
      message: "fetched documents",
      documents: documents,
    });
  } catch (err: any) {
    console.error("Failed to fetch documents:", err);
    return res
      .status(500)
      .json({ error: err.message || "failed to fetch documents" });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await vectorStore.deleteDocument(id as string);
    return res.json({ success: true, message: `Document ${id} deleted` });
  } catch (err: any) {
    console.error("Delete failed:", err);
    return res.status(500).json({ error: err.message });
  }
};
