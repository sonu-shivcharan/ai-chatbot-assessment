import { Schema, model, models } from "mongoose";

const ConversationSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
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

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const Conversation = model("Conversation", ConversationSchema);
