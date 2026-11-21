import express from "express";
import { chat, chatStream } from "../controllers/chat.controller.js";

const chatRoutes = express.Router();

chatRoutes.post("/", chat);
chatRoutes.post("/stream", chatStream);

export default chatRoutes;
