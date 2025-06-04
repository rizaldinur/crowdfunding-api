import mongoose from "mongoose";
import slugify from "slugify";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatarUrl: { type: String },
    biography: { type: String },
    slug: { type: String, unique: true },
    savedProjects: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Project" }],
    isAdmin: { type: Boolean },
  },
  { timestamps: true }
);

userSchema.pre("validate", async function (next) {
  if (!this.isModified("name") && !this.isModified("slug")) {
    return next();
  }

  let baseSlug =
    this.isModified("slug") && this.slug
      ? slugify(this.slug, { lower: true, strict: true })
      : slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  // Ensure uniqueness
  while (await mongoose.models.User.findOne({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
