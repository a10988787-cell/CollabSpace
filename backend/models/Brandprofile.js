// backend/models/BrandProfile.js
const mongoose = require('mongoose');

const BrandProfileSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  brandName:    { type: String, required: [true, 'Brand name is required'], trim: true, maxlength: 100 },
  industry: {
    type: String,
    enum: ['Fashion','Tech','Fitness','Beauty','Food','Travel','Gaming','Finance',
           'Health','Education','Entertainment','Outdoor','Other'],
    default: 'Other',
  },
  logo:         { type: String, default: '' },
  website:      { type: String, trim: true, default: '' },
  description:  { type: String, maxlength: 2000, default: '' },
  contactName:  { type: String, trim: true, default: '' },
  contactEmail: { type: String, trim: true, lowercase: true, default: '' },
  contactPhone: { type: String, trim: true, default: '' },
  isArchived:   { type: Boolean, default: false },
  socialLinks: {
    instagram: { type: String, default: '' },
    youtube:   { type: String, default: '' },
    tiktok:    { type: String, default: '' },
    twitter:   { type: String, default: '' },
  },
}, { timestamps: true, versionKey: false });

BrandProfileSchema.index({ owner: 1 });
BrandProfileSchema.index({ industry: 1 });

module.exports = mongoose.model('BrandProfile', BrandProfileSchema);