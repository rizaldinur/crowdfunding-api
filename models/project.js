import mongoose from "mongoose";
import slugify from "slugify";
const Schema = mongoose.Schema;

const projectSchema = new Schema(
  {
    basic: {
      title: {
        type: String,
        default: "",
      },
      subTitle: {
        type: String,
        default: "",
      },
      category: {
        type: String,
        default: "",
      },
      location: {
        type: String,
        default: "",
      },
      imageUrl: {
        type: String,
        default: "",
      },
      fundTarget: {
        type: Number,
        default: 0,
      },
      launchDate: {
        type: Date,
      },
      duration: {
        type: Number,
        default: 0,
      },
      endDate: {
        type: Date,
      },
    },
    story: {
      detail: {
        type: String,
        default: "",
      },
      benefits: {
        type: String,
        default: "",
      },
      challenges: {
        type: String,
        default: "",
      },
      faqs: [
        {
          question: String,
          answer: String,
        },
      ],
    },
    payment: {
      businessType: { type: String, default: "" },
      bankName: { type: String, default: "" },
      bankAccountNumber: { type: String, default: "" },
    },
    creator: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
    },
    studentProofUrl: { type: String },
    school: { type: String, default: "" },
    otherSchool: { type: Boolean, default: true },
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

  let existing = await mongoose.models.Project.findOne({ slug });

  if (existing && existing._id.toString() !== this._id.toString()) {
    let counter = 1;
    // Ensure uniqueness
    while (await mongoose.models.Project.findOne({ slug })) {
      counter++;
    }
    slug = `${baseSlug}-${counter}`;
  }

  this.slug = slug;
  next();
});

const Project = mongoose.model("Project", projectSchema);

export default Project;
