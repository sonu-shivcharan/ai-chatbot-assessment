import { asyncHandler } from "../../utils/async-handler";
import { Conversation } from "../../models/conversation.model";
import { Message } from "../../models/message.model";
import { LLMSDK } from "../../services/llm/sdk";
import ApiResponse from "../../utils/api-response";
import ApiError from "../../utils/api-error";
import type { ChatMessage } from "../../services/llm/types";

const sendMessage = asyncHandler(async (req, res) => {
  const {
    conversationId,
    message: content,
    provider: reqProvider,
    model: reqModel,
    temperature,
    stream,
  } = req.body;

  if (!content) {
    throw new ApiError(400, "Message content is required");
  }

  let conversation: any;
  let provider = reqProvider;
  let model = reqModel;

  if (conversationId) {
    // Retrieve existing conversation
    conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }
    // Fall back to conversation's provider/model if not specified in request
    provider = provider || conversation.provider;
    model = model || conversation.model;
  } else {
    // Validate for new conversation
    if (!provider) {
      throw new ApiError(
        400,
        "Provider is required to start a new conversation",
      );
    }
    if (!model) {
      throw new ApiError(400, "Model is required to start a new conversation");
    }
  }

  // Model restrictions validation
  if (provider === "gemini" && model !== "gemini-2.5-flash") {
    throw new ApiError(
      400,
      `Only 'gemini-2.5-flash' is allowed for Gemini provider. Got '${model}'`
    );
  }
  if (
    provider === "groq" &&
    model !== "groq/compound" &&
    model !== "llama-3.1-8b-instant"
  ) {
    throw new ApiError(
      400,
      `Only 'groq/compound' and 'llama-3.1-8b-instant' are allowed for Groq provider. Got '${model}'`
    );
  }

  if (!conversationId) {
    const title =
      content.split(" ").slice(0, 5).join(" ") || "New Conversation";
    conversation = await Conversation.create({
      title,
      provider,
      model,
      lastMessageAt: new Date(),
    });
  }

  // Get previous messages to construct chat history (supports multi-turn)
  const previousMessages = await Message.find({
    conversationId: conversation._id,
  }).sort({ createdAt: 1 });

  // Map to ChatMessage format expected by LLM adapters
  const chatMessages: ChatMessage[] = [
    ...previousMessages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user", content },
  ];

  // Save the user's message in DB
  const userMessage = await Message.create({
    conversationId: conversation._id,
    role: "user",
    content,
    tokenCount: 0,
  });

  // If streaming response is requested
  if (stream === true) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Check if flushHeaders is defined on the response object
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    let fullResponseContent = "";

    try {
      const chunkStream = LLMSDK.chatStream(
        conversation._id.toString(),
        provider,
        chatMessages,
        { model, temperature }
      );

      for await (const chunk of chunkStream) {
        fullResponseContent += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Save the LLM's response in DB
      const assistantMessage = await Message.create({
        conversationId: conversation._id,
        role: "assistant",
        content: fullResponseContent,
        tokenCount: Math.ceil(fullResponseContent.length / 4), // Simple token estimate for streaming
      });

      // Update user message token count with simple estimate
      userMessage.tokenCount = Math.ceil(content.length / 4);
      await userMessage.save();

      // Update last message timestamp of the conversation
      conversation.lastMessageAt = new Date();
      await conversation.save();

      // Send the final event with complete data
      res.write(
        `data: ${JSON.stringify({
          done: true,
          conversation,
          userMessage,
          assistantMessage,
        })}\n\n`,
      );
      res.end();
      return;
    } catch (error: any) {
      res.write(
        `data: ${JSON.stringify({ error: error.message || "Streaming failed" })}\n\n`,
      );
      res.end();
      return;
    }
  }

  // Non-streaming fallback flow using decoupled LLMSDK
  let adapterResponse;

  try {
    adapterResponse = await LLMSDK.chat(
      conversation._id.toString(),
      provider,
      chatMessages,
      { model, temperature }
    );
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to generate LLM response");
  }

  // Save the LLM's response in DB
  const assistantMessage = await Message.create({
    conversationId: conversation._id,
    role: "assistant",
    content: adapterResponse.content,
    tokenCount: adapterResponse.usage?.completionTokens || 0,
  });

  // Update user message token count with prompt tokens if returned by provider
  if (adapterResponse.usage?.promptTokens) {
    userMessage.tokenCount = adapterResponse.usage.promptTokens;
    await userMessage.save();
  }

  // Update last message timestamp of the conversation
  conversation.lastMessageAt = new Date();
  await conversation.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        conversation,
        userMessage,
        assistantMessage,
        usage: adapterResponse.usage,
      },
      "Message processed and response generated successfully",
    ),
  );
});

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find().sort({ lastMessageAt: -1 });
  return res.status(200).json(
    new ApiResponse(200, conversations, "Conversations fetched successfully")
  );
});

const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
  return res.status(200).json(
    new ApiResponse(200, messages, "Messages fetched successfully")
  );
});

const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  await Conversation.findByIdAndDelete(conversationId);
  await Message.deleteMany({ conversationId });
  return res.status(200).json(
    new ApiResponse(200, null, "Conversation deleted successfully")
  );
});

export { sendMessage, getConversations, getConversationMessages, deleteConversation };
