import { Router } from "express";
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  deleteConversation,
} from "./chat.controller";

const chatRouter = Router();

chatRouter.post("/message", sendMessage);
chatRouter.get("/conversations", getConversations);
chatRouter.get("/conversations/:conversationId/messages", getConversationMessages);
chatRouter.delete("/conversations/:conversationId", deleteConversation);

export default chatRouter;
