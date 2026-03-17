const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['lesson', 'blog'], required: true },
  description: String,
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  fileUrl: String, // If you want to store uploaded file URLs
  author: { type: String }, // You can use user ID or name
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Content', ContentSchema);