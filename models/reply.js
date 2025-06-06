import mongoose from "mongoose";

const Schema = mongoose.Schema;

const replySchema = new Schema(
  {
    comment: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Comment",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Reply = mongoose.model("Reply", replySchema);

export default Reply;
