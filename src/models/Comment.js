import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  document_id: { type: String, required: true },
  comment: { type: String, required: true },
  assign: { type: String, default: "lead admin" },
  created_date: { type: Date, default: Date.now },
});

commentSchema.methods.toJSON = function () {
  const commentObject = this.toObject();

  // Fix: No manual offset needed, use correct timezone conversion
  commentObject.created_date = new Date(commentObject.created_date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata", // Correctly converts from UTC to IST
  });

  return commentObject;
};

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
