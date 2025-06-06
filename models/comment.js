import mongoose from "mongoose";

const Schema = mongoose.Schema;

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comments", commentSchema);

export default Comment;
