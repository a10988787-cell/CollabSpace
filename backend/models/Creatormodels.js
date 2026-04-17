// backend/models/CreatorModels.js
const mongoose = require('mongoose');

/* ═══════════════════════════════════════════════════════════════════════════
   1. CREATOR PROFILE
   ═══════════════════════════════════════════════════════════════════════════ */
const CreatorProfileSchema = new mongoose.Schema({
  owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  username:       { type: String, trim: true, lowercase: true, maxlength: 50, default: '' },
  bio:            { type: String, maxlength: 1000, default: '' },
  niche:          { type: String, enum: ['Fashion','Beauty','Tech','Gaming','Food','Travel','Fitness','Lifestyle','Music','Education','Comedy','Other'], default: 'Other' },
  country:        { type: String, trim: true, default: '' },
  profilePicture: { type: String, default: '' },
  contactInfo: {
    phone:    { type: String, default: '' },
    website:  { type: String, default: '' },
    linkedin: { type: String, default: '' },
  },
  isVerified:  { type: Boolean, default: false },
  isArchived:  { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
CreatorProfileSchema.index({ owner: 1 });
CreatorProfileSchema.index({ niche: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   2. SOCIAL MEDIA ACCOUNT
   ═══════════════════════════════════════════════════════════════════════════ */
const SocialAccountSchema = new mongoose.Schema({
  creator:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform:       { type: String, enum: ['Instagram','YouTube','TikTok','Twitter','Twitch','Pinterest','LinkedIn','Podcast'], required: true },
  username:       { type: String, trim: true, required: true },
  followersCount: { type: Number, default: 0, min: 0 },
  engagementRate: { type: Number, default: 0, min: 0 },
  accessToken:    { type: String, select: false, default: '' },
  profileUrl:     { type: String, default: '' },
  isActive:       { type: Boolean, default: true },
  followingCount: { type: Number, default: 0 },
  postsCount:     { type: Number, default: 0 },
  profilePicture: { type: String, default: '' },
  bio:            { type: String, default: '' },
  website:        { type: String, default: '' },
  accountType:    { type: String, default: 'PERSONAL' },
  recentMediaCount:{ type: Number, default: 0 },
  lastSyncedAt:   { type: Date, default: null },
}, { timestamps: true, versionKey: false });
SocialAccountSchema.index({ creator: 1 });
SocialAccountSchema.index({ creator: 1, platform: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   3. PORTFOLIO / MEDIA KIT
   ═══════════════════════════════════════════════════════════════════════════ */
const PortfolioItemSchema = new mongoose.Schema({
  creator:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignTitle: { type: String, required: true, trim: true, maxlength: 200 },
  mediaType:    { type: String, enum: ['image','video','reel','story','blog','podcast'], default: 'image' },
  platform:     { type: String, enum: ['Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast','Other'], default: 'Other' },
  brandName:    { type: String, trim: true, default: '' },
  contentUrl:   { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  metrics: {
    views:    { type: Number, default: 0 },
    likes:    { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares:   { type: Number, default: 0 },
    reach:    { type: Number, default: 0 },
  },
  description:  { type: String, maxlength: 1000, default: '' },
  isPublic:     { type: Boolean, default: true },
  isDeleted:    { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
PortfolioItemSchema.index({ creator: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   4. CAMPAIGN APPLICATION
   ═══════════════════════════════════════════════════════════════════════════ */
const CampaignApplicationSchema = new mongoose.Schema({
  campaign:        { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  creator:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  proposalMessage: { type: String, maxlength: 2000, default: '' },
  priceQuote:      { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending','reviewing','accepted','rejected','withdrawn'],
    default: 'pending',
  },
  brandResponse:  { type: String, maxlength: 500, default: '' },
  submittedAt:    { type: Date, default: Date.now },
  respondedAt:    { type: Date },
  isDeleted:      { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
CampaignApplicationSchema.index({ creator: 1, status: 1 });
CampaignApplicationSchema.index({ campaign: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   5. COLLABORATION POST (creator posts content for accepted collab)
   ═══════════════════════════════════════════════════════════════════════════ */
const CollabPostSchema = new mongoose.Schema({
  collaboration:  { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration', required: true },
  creator:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:          { type: String, required: true, trim: true, maxlength: 200 },
  caption:        { type: String, maxlength: 3000, default: '' },
  contentType:    { type: String, enum: ['text','image','video'], required: true },
  mediaUrls:      [{ type: String }],
  hashtags:       [{ type: String, trim: true }],
  platform:       { type: String, enum: ['Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast','Other'], default: 'Other' },
  status: {
    type: String,
    enum: ['draft','submitted','approved','revision_requested','rejected','paid'],
    default: 'draft',
  },
  brandNotes:     { type: String, maxlength: 1000, default: '' },
  submittedAt:    { type: Date },
  approvedAt:     { type: Date },
  paymentAmount:  { type: Number, default: 0 },
  isPaid:         { type: Boolean, default: false },
  razorpayOrderId:    { type: String, default: null },
  razorpayPaymentId:  { type: String, default: null },
  paidAt:         { type: Date },
  isDeleted:      { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
CollabPostSchema.index({ creator: 1, status: 1 });
CollabPostSchema.index({ brand: 1, status: 1 });
CollabPostSchema.index({ collaboration: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   6. CONTENT LIBRARY
   ═══════════════════════════════════════════════════════════════════════════ */
const ContentLibrarySchema = new mongoose.Schema({
  creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName:    { type: String, required: true, trim: true },
  fileType:    { type: String, enum: ['image','video','reel','story','audio','document'], required: true },
  fileUrl:     { type: String, required: true },
  thumbnailUrl:{ type: String, default: '' },
  fileSize:    { type: Number, default: 0 },
  mimeType:    { type: String, default: '' },
  caption:     { type: String, maxlength: 2200, default: '' },
  hashtags:    [{ type: String, trim: true }],
  tags:        [{ type: String, trim: true }],
  isDeleted:   { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
ContentLibrarySchema.index({ creator: 1, fileType: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   7. NOTIFICATION
   ═══════════════════════════════════════════════════════════════════════════ */
const CreatorNotificationSchema = new mongoose.Schema({
  recipient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['campaign_invite','application_update','payment','message','collab_update','content_approved','content_revision','system'],
    required: true,
  },
  title:       { type: String, required: true, maxlength: 200 },
  message:     { type: String, required: true, maxlength: 1000 },
  link:        { type: String, default: '' },
  refId:       { type: mongoose.Schema.Types.ObjectId },
  refModel:    { type: String, enum: ['Campaign','Collaboration','CollabPost','Payment','Message','BrandInvitation','CampaignApplication'] },
  isRead:      { type: Boolean, default: false },
  isDeleted:   { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
CreatorNotificationSchema.index({ recipient: 1, isRead: 1 });
CreatorNotificationSchema.index({ recipient: 1, createdAt: -1 });

/* ═══════════════════════════════════════════════════════════════════════════
   8. PERFORMANCE ANALYTICS
   ═══════════════════════════════════════════════════════════════════════════ */
const PerformanceAnalyticsSchema = new mongoose.Schema({
  creator:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform:       { type: String, enum: ['Instagram','YouTube','TikTok','Twitter','All'], default: 'All' },
  period:         { type: String, enum: ['7d','30d','90d','6m','1y'], default: '30d' },
  followers:      { type: Number, default: 0 },
  engagementRate: { type: Number, default: 0 },
  avgLikes:       { type: Number, default: 0 },
  avgComments:    { type: Number, default: 0 },
  reach:          { type: Number, default: 0 },
  impressions:    { type: Number, default: 0 },
  profileVisits:  { type: Number, default: 0 },
  generatedAt:    { type: Date, default: Date.now },
  isDeleted:      { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
PerformanceAnalyticsSchema.index({ creator: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   9. AUDIENCE INSIGHTS
   ═══════════════════════════════════════════════════════════════════════════ */
const AudienceInsightSchema = new mongoose.Schema({
  creator:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['Instagram','YouTube','TikTok','Twitter','All'], default: 'All' },
  ageGroups: [{
    label:      { type: String },
    percentage: { type: Number, min: 0, max: 100 },
  }],
  genderDistribution: {
    male:   { type: Number, default: 0 },
    female: { type: Number, default: 0 },
    other:  { type: Number, default: 0 },
  },
  topCountries: [{
    country:    { type: String },
    percentage: { type: Number, min: 0, max: 100 },
  }],
  interests: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
  isDeleted:   { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
AudienceInsightSchema.index({ creator: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   10. REVENUE TRACKING
   ═══════════════════════════════════════════════════════════════════════════ */
const RevenueEntrySchema = new mongoose.Schema({
  creator:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaboration: { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration' },
  collabPost:    { type: mongoose.Schema.Types.ObjectId, ref: 'CollabPost' },
  campaignName:  { type: String, required: true, trim: true },
  brandName:     { type: String, trim: true, default: '' },
  amount:        { type: Number, required: true, min: 0 },
  currency:      { type: String, default: 'USD', uppercase: true, maxlength: 3 },
  status:        { type: String, enum: ['pending','processing','received','failed'], default: 'pending' },
  paymentDate:   { type: Date },
  invoiceNumber: { type: String, default: '' },
  notes:         { type: String, maxlength: 500, default: '' },
  isDeleted:     { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
RevenueEntrySchema.index({ creator: 1, status: 1 });
RevenueEntrySchema.index({ creator: 1, createdAt: -1 });

/* ═══════════════════════════════════════════════════════════════════════════
   11. BRAND INVITATION (received by creator)
   ═══════════════════════════════════════════════════════════════════════════ */
const BrandInvitationSchema = new mongoose.Schema({
  creator:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaboration:    { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration' },
  campaign:         { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  invitationMessage:{ type: String, maxlength: 1000, default: '' },
  proposedAmount:   { type: Number, default: 0 },
  status:           { type: String, enum: ['pending','accepted','rejected','expired'], default: 'pending' },
  expiresAt:        { type: Date },
  respondedAt:      { type: Date },
  creatorResponse:  { type: String, maxlength: 500, default: '' },
  isDeleted:        { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
BrandInvitationSchema.index({ creator: 1, status: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   12. AI CONTENT TOOL SUGGESTION
   ═══════════════════════════════════════════════════════════════════════════ */
const AiSuggestionSchema = new mongoose.Schema({
  creator:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:             { type: String, enum: ['caption','hashtags','content_idea','full_post','content_analysis'], required: true },
  prompt:           { type: String, maxlength: 2000, default: '' },
  generatedCaption: { type: String, maxlength: 5000, default: '' },
  hashtags:         [{ type: String }],
  hashtagDetails:   [{
    tag:      { type: String },
    reach:    { type: String },
    ctrScore: { type: Number },
    category: { type: String },
  }],
  titleSuggestions: [{
    title:    { type: String },
    ctrScore: { type: Number },
    hook:     { type: String },
    emoji:    { type: String },
  }],
  contentIdea:      { type: String, maxlength: 3000, default: '' },
  callToAction:     { type: String, maxlength: 500,  default: '' },
  contentTips:      [{ type: String }],
  platform:         { type: String, default: '' },
  niche:            { type: String, default: '' },
  editedContent:    { type: String, maxlength: 5000, default: '' },
  isSaved:          { type: Boolean, default: false },
  isDeleted:        { type: Boolean, default: false },
  uploadedFileName: { type: String, default: '' },
  uploadedFileType: { type: String, default: '' },
}, { timestamps: true, versionKey: false });
AiSuggestionSchema.index({ creator: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   13. GROWTH METRICS
   ═══════════════════════════════════════════════════════════════════════════ */
const GrowthMetricSchema = new mongoose.Schema({
  creator:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform:       { type: String, enum: ['Instagram','YouTube','TikTok','Twitter','All'], default: 'All' },
  period:         { type: String, enum: ['7d','30d','90d','6m','1y'], default: '30d' },
  dailyFollowers: [{ date: Date, count: Number }],
  monthlyGrowth:  { type: Number, default: 0 },
  weeklyGrowth:   { type: Number, default: 0 },
  engagementTrend:{ type: Number, default: 0 },
  generatedAt:    { type: Date, default: Date.now },
  isDeleted:      { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
GrowthMetricSchema.index({ creator: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   14. CONTRACT (creator side)
   ═══════════════════════════════════════════════════════════════════════════ */
const CreatorContractSchema = new mongoose.Schema({
  creator:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collaboration: { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration' },
  title:         { type: String, required: true, trim: true, maxlength: 200 },
  content:       { type: String, default: '' },
  fileUrl:       { type: String, default: '' },
  status:        { type: String, enum: ['pending','signed','expired','archived'], default: 'pending' },
  signedAt:      { type: Date },
  expiresAt:     { type: Date },
  isDeleted:     { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
CreatorContractSchema.index({ creator: 1, status: 1 });

/* ═══════════════════════════════════════════════════════════════════════════
   15. MESSAGE THREAD
   ═══════════════════════════════════════════════════════════════════════════ */
const MessageSchema = new mongoose.Schema({
  sender:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  threadId:    { type: String, required: true },
  content:     { type: String, required: true, maxlength: 5000 },
  attachments: [{ url: String, type: { type: String } }],
  isRead:      { type: Boolean, default: false },
  readAt:      { type: Date },
  isDraft:     { type: Boolean, default: false },
  isDeleted:   { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
MessageSchema.index({ threadId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ receiver: 1 });

MessageSchema.statics.getOrCreateThreadId = function(userA, userB) {
  const sorted = [userA.toString(), userB.toString()].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

// Guard against OverwriteModelError on nodemon hot-reloads:
// re-use the already-compiled model if it exists, otherwise compile fresh.
const m = mongoose.models;
module.exports = {
  CreatorProfile:      m.CreatorProfile      || mongoose.model('CreatorProfile',      CreatorProfileSchema),
  SocialAccount:       m.SocialAccount       || mongoose.model('SocialAccount',       SocialAccountSchema),
  PortfolioItem:       m.PortfolioItem       || mongoose.model('PortfolioItem',       PortfolioItemSchema),
  CampaignApplication: m.CampaignApplication || mongoose.model('CampaignApplication', CampaignApplicationSchema),
  CollabPost:          m.CollabPost          || mongoose.model('CollabPost',          CollabPostSchema),
  ContentLibrary:      m.ContentLibrary      || mongoose.model('ContentLibrary',      ContentLibrarySchema),
  CreatorNotification: m.CreatorNotification || mongoose.model('CreatorNotification', CreatorNotificationSchema),
  PerformanceAnalytics:m.PerformanceAnalytics|| mongoose.model('PerformanceAnalytics',PerformanceAnalyticsSchema),
  AudienceInsight:     m.AudienceInsight     || mongoose.model('AudienceInsight',     AudienceInsightSchema),
  RevenueEntry:        m.RevenueEntry        || mongoose.model('RevenueEntry',        RevenueEntrySchema),
  BrandInvitation:     m.BrandInvitation     || mongoose.model('BrandInvitation',     BrandInvitationSchema),
  AiSuggestion:        m.AiSuggestion        || mongoose.model('AiSuggestion',        AiSuggestionSchema),
  GrowthMetric:        m.GrowthMetric        || mongoose.model('GrowthMetric',        GrowthMetricSchema),
  CreatorContract:     m.CreatorContract     || mongoose.model('CreatorContract',     CreatorContractSchema),
  Message:             m.Message             || mongoose.model('Message',             MessageSchema),
};