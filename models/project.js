import mongoose from "mongoose";
import slugify from "slugify";
const Schema = mongoose.Schema;

const projectSchema = new Schema(
  {
    basic: {
      title: {
        type: String,
        required: true,
        default: "empty",
      },
      subTitle: {
        type: String,
        required: true,
        default: "empty",
      },
      category: {
        type: String,
        required: true,
        default: "empty",
      },
      location: {
        type: String,
        required: true,
        default: "empty",
      },
      imageUrl: {
        type: String,
        required: true,
        default: "empty",
      },
      fundTarget: {
        type: Number,
        required: true,
        default: 0,
      },
      launchDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
    },
    story: {
      detail: {
        type: String,
        required: true,
        default: "empty",
      },
      benefits: {
        type: String,
        required: true,
        default: "empty",
      },
      chalenges: {
        type: String,
        required: true,
        default: "empty",
      },
      faqs: [
        {
          question: String,
          answer: String,
        },
      ],
    },
    payment: {
      businessType: { type: String, required: true, default: "empty" },
      bankName: { type: String, required: true, default: "empty" },
      bankAccountNumber: { type: String, required: true, default: "empty" },
    },
    creator: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
    studentProofUrl: { type: String, required: true, default: "empty" },
    school: { type: String, default: "" },
    otherSchool: { type: Boolean, default: false },
    slug: { type: String, unique: true },
    funding: { type: Number, default: 0 },
    status: { type: String, default: "draft" },
  },
  { timestamps: true }
);

projectSchema.pre("validate", async function (next) {
  // If no title, use the document _id as slug
  if (
    !this.basic.title ||
    this.basic.title.trim() === "" ||
    this.basic.title.trim() === "empty"
  ) {
    this.slug = this._id?.toString(); // fallback to _id
    return next();
  }

  let baseSlug = slugify(this.basic.title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  // Ensure uniqueness
  while (await mongoose.models.Project.findOne({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
  next();
});

const Project = mongoose.model("Project", projectSchema);

export default Project;
