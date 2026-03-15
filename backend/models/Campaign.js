// backend/models/Campaign.js
const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Brand owner is required'],
  },
  title:       { type: String, required: [true, 'Campaign title is required'], trim: true, maxlength: 200 },
  description: { type: String, maxlength: 3000, default: '' },
  budget:      { type: Number, required: [true, 'Budget is required'], min: [0, 'Budget cannot be negative'] },
  startDate:   { type: Date, required: [true, 'Start date is required'] },
  endDate:     { type: Date, required: [true, 'End date is required'] },
  platforms: [{
    type: String,
    enum: ['Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast'],
  }],
  contentReqs: { type: String, maxlength: 2000, default: '' },
  niche:       { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['draft','active','paused','completed','cancelled'],
    default: 'draft',
  },
  slots:       { type: Number, default: 1, min: 1 },
  applications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration' }],
  isDeleted:   { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

CampaignSchema.index({ brand: 1, status: 1 });
CampaignSchema.index({ isDeleted: 1 });
CampaignSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);