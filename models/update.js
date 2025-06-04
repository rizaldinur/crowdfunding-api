import mongoose from "mongoose";

const Schema = mongoose.Schema;

const updateSchema = new Schema(
  {
    title: {
      type: String,
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
    project: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  { timestamps: true }
);

const Update = mongoose.model("Update", updateSchema);

export default Update;
