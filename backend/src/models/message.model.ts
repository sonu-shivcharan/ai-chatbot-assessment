import { Schema, model, models, Types } from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    tokenCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const Message = model("Message", MessageSchema);
