import mongoose from "mongoose";

const Schema = mongoose.Schema;

const supportSchema = new Schema(
  {
    supportedProject: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Project",
      required: true,
    },
    supporter: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
    supportAmount: { type: Number, required: true, default: 0 },
    transaction: {
      token: { type: String },
      id: { type: String },
      statusCode: { type: String },
      status: { type: String },
      expiryTime: { type: Date },
    },
  },
  { timestamps: true }
);

const Support = mongoose.model("Support", supportSchema);

export default Support;
