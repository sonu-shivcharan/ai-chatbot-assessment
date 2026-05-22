import { Schema, model, models, Types } from "mongoose";

const InferenceLogSchema = new Schema(
  {
    conversationId: {
      type: Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["groq", "gemini", "mock"],
      required: true,
    },

    model: {
      type: String,
      required: true,
    },

    latencyMs: {
      type: Number,
      required: true,
    },

    promptTokens: {
      type: Number,
      default: 0,
    },

    completionTokens: {
      type: Number,
      default: 0,
    },

    totalTokens: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["success", "error"],
      required: true,
    },

    requestPreview: {
      type: String,
      maxlength: 300,
    },

    responsePreview: {
      type: String,
      maxlength: 300,
    },

    errorMessage: {
      type: String,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    completedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const InferenceLog = model("InferenceLog", InferenceLogSchema);
