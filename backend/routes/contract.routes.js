// backend/routes/contract.routes.js
// Contract generation (PDF), signing, signed-copy upload, and notifications
//
// SETUP:
//   npm install pdfkit socket.io multer
//
// Routes:
//   POST /api/contracts/generate            — brand generates PDF contract
//   GET  /api/contracts                     — list contracts (role-aware)
//   GET  /api/contracts/:id                 — single contract
//   POST /api/contracts/:id/sign            — creator digitally signs
//   POST /api/contracts/:id/upload-signed   — creator uploads signed PDF copy   ← NEW
//   GET  /api/contracts/:id/download        — stream original PDF
//   GET  /api/contracts/:id/download-signed — stream signed copy PDF             ← NEW

'use strict';
require('dotenv').config();

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { CreatorContract, CreatorNotification, CampaignApplication } = require('../models/CreatorModels');
const User = require('../models/User');

let Collaboration;
try { ({ Collaboration } = require('../models/BrandModels')); } catch(_) {}

const ok  = (res, data, code = 200) => res.status(code).json({ success: true, ...data });
const err = (res, msg, code = 400)  => res.status(code).json({ success: false, message: msg });

const CONTRACTS_DIR       = path.join(__dirname, '..', 'uploads', 'contracts');
const SIGNED_CONTRACTS_DIR = path.join(__dirname, '..', 'uploads', 'signed-contracts');
if (!fs.existsSync(CONTRACTS_DIR))        fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
if (!fs.existsSync(SIGNED_CONTRACTS_DIR)) fs.mkdirSync(SIGNED_CONTRACTS_DIR, { recursive: true });

// ── Multer for signed-copy uploads ──────────────────────────────────────
let uploadSigned = null;
try {
  const multer = require('multer');
  const signedStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, SIGNED_CONTRACTS_DIR),
    filename:    (req,  file, cb)  => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `signed_${req.params.id}_${Date.now()}${ext}`);
    },
  });
  uploadSigned = multer({
    storage:    signedStorage,
    limits:     { fileSize: 25 * 1024 * 1024 }, // 25 MB
    fileFilter: (_req, file, cb) => {
      const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
      cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
    },
  });
} catch (_) {
  console.warn('[contract.routes] multer not installed — upload-signed route disabled. Run: npm install multer');
}

router.use(protect);

/* ── PDF generation helper ──────────────────────────────────────────────
   Uses pdfkit. Falls back to a plain text .txt if pdfkit not installed.
──────────────────────────────────────────────────────────────────────── */
async function generateContractPDF({
  contractId, brandName, creatorName, campaignTitle,
  proposalMessage, priceQuote, startDate, endDate, clauses,
}) {
  const filename = `contract_${contractId}_${Date.now()}.pdf`;
  const filepath = path.join(CONTRACTS_DIR, filename);
  const fileUrl  = `/uploads/contracts/${filename}`;

  try {
    const PDFDocument = require('pdfkit');
    const doc    = new PDFDocument({ margin: 60, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('COLLABORATION CONTRACT', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#666')
       .text(`Contract ID: ${contractId}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}`, { align: 'center' });
    doc.moveDown(1.2);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#8B5CF6').lineWidth(2).stroke();
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('PARTIES');
    doc.moveDown(0.4);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Brand / Client: ${brandName}`);
    doc.text(`Content Creator: ${creatorName}`);
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('PROJECT DETAILS');
    doc.moveDown(0.4);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Campaign Title: ${campaignTitle}`);
    doc.text(`Agreed Amount: ₹${Number(priceQuote).toLocaleString('en-IN')}`);
    if (startDate) doc.text(`Start Date: ${new Date(startDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}`);
    if (endDate)   doc.text(`End Date:   ${new Date(endDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}`);
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('DELIVERABLES / PROPOSAL');
    doc.moveDown(0.4);
    doc.fontSize(11).font('Helvetica').fillColor('#333')
       .text(proposalMessage || 'As agreed between the parties.', { lineGap: 4 });
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('TERMS & CONDITIONS');
    doc.moveDown(0.4);
    const defaultClauses = clauses?.length ? clauses : [
      '1. The Creator agrees to produce original content exclusively for this campaign during the contract period.',
      '2. The Brand agrees to release the agreed payment within 7 business days of content approval via Razorpay.',
      '3. The Creator grants the Brand a non-exclusive licence to use the content for the campaign duration.',
      '4. Either party may terminate this agreement with 7 days written notice prior to content submission.',
      '5. All content remains the intellectual property of the Creator unless otherwise negotiated.',
      '6. Any disputes shall be resolved through mutual negotiation, and if unresolved, under Indian Arbitration Act.',
      '7. This contract is governed by the laws of India.',
    ];
    doc.fontSize(10).font('Helvetica').fillColor('#444');
    defaultClauses.forEach(c => { doc.text(c, { lineGap: 5 }); doc.moveDown(0.3); });
    doc.moveDown(0.8);

    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#ddd').lineWidth(1).stroke();
    doc.moveDown(1.2);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text('SIGNATURES');
    doc.moveDown(0.8);

    const sigY = doc.y;
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(`Brand: ${brandName}`, 60, sigY);
    doc.text('Signature: ____________________________', 60, sigY + 16);
    doc.text('Date: ____________________________',      60, sigY + 32);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(`Creator: ${creatorName}`, 300, sigY);
    doc.text('Signature: ____________________________', 300, sigY + 16);
    doc.text('Date: ____________________________',      300, sigY + 32);

    doc.moveDown(3);
    doc.fontSize(8).fillColor('#999').text(
      "This contract was generated by CollabSpace — India's Creator × Brand Collaboration Platform.",
      { align: 'center' }
    );
    doc.end();
    await new Promise((res, rej) => { stream.on('finish', res); stream.on('error', rej); });
    return { fileUrl, filename };

  } catch (pdfErr) {
    console.warn('[contract] pdfkit not installed — generating text fallback. Run: npm install pdfkit');
    const txtFile = filename.replace('.pdf', '.txt');
    const txtPath = path.join(CONTRACTS_DIR, txtFile);
    fs.writeFileSync(txtPath,
      `COLLABORATION CONTRACT\n${'='.repeat(50)}\nID: ${contractId}\nDate: ${new Date().toLocaleDateString()}\n\nBrand: ${brandName}\nCreator: ${creatorName}\nCampaign: ${campaignTitle}\nAmount: ₹${priceQuote}\n\nDeliverables:\n${proposalMessage}\n\nTerms: Standard CollabSpace terms apply.\n\nBrand Signature: ________________________\nCreator Signature: ______________________\n`
    );
    return { fileUrl: `/uploads/contracts/${txtFile}`, filename: txtFile };
  }
}

/* ══════════════════════════════════════════════════════════════════════
   POST /api/contracts/generate
   Brand generates a PDF contract for an accepted application OR
   an accepted invitation (pass invitationId instead of applicationId).
   Body: { applicationId?, invitationId?, clauses? }
══════════════════════════════════════════════════════════════════════ */
router.post('/generate', async (req, res) => {
  try {
    if (!['brand','admin'].includes(req.user.role)) return err(res, 'Only brands can generate contracts.', 403);

    const { applicationId, invitationId, clauses } = req.body;
    if (!applicationId && !invitationId) return err(res, 'applicationId or invitationId is required.');

    let creatorId, campaignTitle, proposalMessage, priceQuote, startDate, endDate;

    if (applicationId) {
      const app = await CampaignApplication.findById(applicationId)
        .populate('creator',  'firstName lastName email')
        .populate('campaign', 'title budget startDate endDate brand');
      if (!app) return err(res, 'Application not found.', 404);
      if (!['accepted','pending'].includes(app.status)) return err(res, 'Application must be accepted first.', 400);
      if (app.campaign?.brand?.toString() !== req.user._id.toString()) return err(res, 'Not authorised.', 403);

      creatorId       = app.creator._id;
      campaignTitle   = app.campaign?.title || 'Campaign';
      proposalMessage = app.proposalMessage || '';
      priceQuote      = app.priceQuote || 0;
      startDate       = app.campaign?.startDate;
      endDate         = app.campaign?.endDate;

    } else {
      // invitation-based contract
      let BrandInvitation;
      try { ({ BrandInvitation } = require('../models/CreatorModels')); } catch(_) {}
      if (!BrandInvitation) return err(res, 'BrandInvitation model not available.', 500);

      const inv = await BrandInvitation.findById(invitationId)
        .populate('creator',  'firstName lastName email')
        .populate('campaign', 'title budget startDate endDate');
      if (!inv) return err(res, 'Invitation not found.', 404);
      if (inv.brand.toString() !== req.user._id.toString()) return err(res, 'Not authorised.', 403);

      creatorId       = inv.creator._id;
      campaignTitle   = inv.campaign?.title || 'Collaboration';
      proposalMessage = inv.invitationMessage || '';
      priceQuote      = inv.proposedAmount || 0;
      startDate       = inv.campaign?.startDate;
      endDate         = inv.campaign?.endDate;
    }

    const creator = await User.findById(creatorId).select('firstName lastName');
    if (!creator) return err(res, 'Creator not found.', 404);

    const brandName   = req.user.companyName || `${req.user.firstName} ${req.user.lastName}`;
    const creatorName = `${creator.firstName} ${creator.lastName}`;

    const { fileUrl } = await generateContractPDF({
      contractId: (applicationId || invitationId).toString().slice(-8).toUpperCase(),
      brandName, creatorName, campaignTitle, proposalMessage, priceQuote,
      startDate, endDate, clauses: clauses || [],
    });

    let collabId = null;
    if (Collaboration) {
      try {
        const collab = await Collaboration.findOne({ creator: creatorId, brand: req.user._id }).lean();
        collabId = collab?._id || null;
      } catch(_) {}
    }

    const contract = await CreatorContract.create({
      creator:       creatorId,
      brand:         req.user._id,
      collaboration: collabId,
      title:         `Contract — ${campaignTitle}`,
      content:       `Brand: ${brandName} | Creator: ${creatorName} | Campaign: ${campaignTitle} | Amount: ₹${priceQuote}`,
      fileUrl,
      status:        'pending',
      expiresAt:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // In-app notification for creator
    await CreatorNotification.create({
      recipient: creatorId,
      type:      'system',
      title:     '📄 Contract Ready to Sign',
      message:   `${brandName} has sent you a contract for "${campaignTitle}". Please review and sign it.`,
      refId:     contract._id,
      refModel:  'CreatorContract',
      link:      '/dashboard/creator/contracts',
    }).catch(() => {});

    // Real-time push to creator
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${creatorId.toString()}`).emit('contract:new', {
        contractId: contract._id,
        title:      contract.title,
        brandName,
        fileUrl,
      });
    }

    return ok(res, { contract, fileUrl, message: 'Contract generated and sent to creator.' }, 201);
  } catch (e) {
    console.error('[contract/generate]', e);
    return err(res, e.message, 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   GET /api/contracts
   Creator: their own contracts. Brand: contracts they issued.
══════════════════════════════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const q = req.user.role === 'brand'
      ? { brand: req.user._id, isDeleted: false }
      : { creator: req.user._id, isDeleted: false };

    const contracts = await CreatorContract.find(q)
      .populate('creator', 'firstName lastName email avatar')
      .populate('brand',   'firstName lastName companyName email')
      .sort({ createdAt: -1 });

    return ok(res, { contracts });
  } catch (e) { return err(res, e.message, 500); }
});

/* ══════════════════════════════════════════════════════════════════════
   GET /api/contracts/:id
══════════════════════════════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const contract = await CreatorContract.findOne({
      _id: req.params.id,
      $or: [{ creator: req.user._id }, { brand: req.user._id }],
      isDeleted: false,
    })
      .populate('creator', 'firstName lastName email')
      .populate('brand',   'firstName lastName companyName email');

    if (!contract) return err(res, 'Contract not found.', 404);
    return ok(res, { contract });
  } catch (e) { return err(res, e.message, 500); }
});

/* ══════════════════════════════════════════════════════════════════════
   POST /api/contracts/:id/sign
   Creator digitally signs. Brand notified via notification + Socket.IO.
══════════════════════════════════════════════════════════════════════ */
router.post('/:id/sign', async (req, res) => {
  try {
    if (req.user.role !== 'creator') return err(res, 'Only creators can sign contracts.', 403);

    const contract = await CreatorContract.findOneAndUpdate(
      { _id: req.params.id, creator: req.user._id, status: 'pending', isDeleted: false },
      { status: 'signed', signedAt: new Date() },
      { new: true }
    ).populate('brand', 'firstName lastName companyName email');

    if (!contract) return err(res, 'Contract not found or already signed.', 404);

    const creatorName = `${req.user.firstName} ${req.user.lastName}`;

    if (contract.brand) {
      await CreatorNotification.create({
        recipient: contract.brand._id,
        type:      'system',
        title:     '✍️ Contract Signed!',
        message:   `${creatorName} has signed the contract "${contract.title}". The collaboration is now confirmed.`,
        refId:     contract._id,
        refModel:  'CreatorContract',
        link:      '/dashboard/brand/contracts',
      }).catch(() => {});

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${contract.brand._id.toString()}`).emit('contract:signed', {
          contractId:  contract._id,
          title:       contract.title,
          creatorName,
          signedAt:    contract.signedAt,
        });
      }
    }

    return ok(res, { contract, message: 'Contract signed successfully! Brand has been notified.' });
  } catch (e) { return err(res, e.message, 500); }
});

/* ══════════════════════════════════════════════════════════════════════
   POST /api/contracts/:id/upload-signed
   Creator uploads the physically signed copy (PDF/image).
   Brand gets a real-time notification with the file URL.
══════════════════════════════════════════════════════════════════════ */
router.post('/:id/upload-signed', (req, res, next) => {
  if (!uploadSigned) {
    return err(res, 'File upload not available. Run: npm install multer', 503);
  }
  uploadSigned.single('signedContract')(req, res, next);
}, async (req, res) => {
  try {
    if (req.user.role !== 'creator') return err(res, 'Only creators can upload signed contracts.', 403);

    const contract = await CreatorContract.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    }).populate('brand', 'firstName lastName companyName');

    if (!contract) return err(res, 'Contract not found.', 404);
    if (!req.file)  return err(res, 'No file uploaded. Attach a PDF or image as "signedContract".', 400);

    const signedFileUrl = `/uploads/signed-contracts/${req.file.filename}`;
    contract.signedFileUrl = signedFileUrl;
    // Mark signed if not already
    if (contract.status !== 'signed') {
      contract.status   = 'signed';
      contract.signedAt = new Date();
    }
    await contract.save();

    const creatorName = `${req.user.firstName} ${req.user.lastName}`;

    // Notify brand
    if (contract.brand) {
      await CreatorNotification.create({
        recipient: contract.brand._id,
        type:      'system',
        title:     '📎 Signed Contract Uploaded',
        message:   `${creatorName} has uploaded their signed copy of "${contract.title}". Download it from the Contracts tab.`,
        refId:     contract._id,
        refModel:  'CreatorContract',
        link:      '/dashboard/brand/contracts',
      }).catch(() => {});

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${contract.brand._id.toString()}`).emit('contract:signed', {
          contractId:    contract._id,
          title:         contract.title,
          creatorName,
          signedAt:      contract.signedAt,
          signedFileUrl,
        });
      }
    }

    return ok(res, {
      contract,
      signedFileUrl,
      message: 'Signed contract uploaded! Brand has been notified.',
    });
  } catch (e) {
    console.error('[contract/upload-signed]', e);
    return err(res, e.message, 500);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   GET /api/contracts/:id/download
   Streams original PDF to client.
══════════════════════════════════════════════════════════════════════ */
router.get('/:id/download', async (req, res) => {
  try {
    const contract = await CreatorContract.findOne({
      _id: req.params.id,
      $or: [{ creator: req.user._id }, { brand: req.user._id }],
      isDeleted: false,
    });
    if (!contract || !contract.fileUrl) return err(res, 'Contract file not found.', 404);

    const filePath = path.join(__dirname, '..', contract.fileUrl);
    if (!fs.existsSync(filePath)) return err(res, 'Contract file missing on disk.', 404);

    const ext      = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf' : 'text/plain';
    res.setHeader('Content-Type',        mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="contract_${contract._id}${ext}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { return err(res, e.message, 500); }
});

/* ══════════════════════════════════════════════════════════════════════
   GET /api/contracts/:id/download-signed
   Streams the signed copy uploaded by the creator.
══════════════════════════════════════════════════════════════════════ */
router.get('/:id/download-signed', async (req, res) => {
  try {
    const contract = await CreatorContract.findOne({
      _id: req.params.id,
      $or: [{ creator: req.user._id }, { brand: req.user._id }],
      isDeleted: false,
    });
    if (!contract || !contract.signedFileUrl) return err(res, 'Signed copy not uploaded yet.', 404);

    const filePath = path.join(__dirname, '..', contract.signedFileUrl);
    if (!fs.existsSync(filePath)) return err(res, 'Signed file missing on disk.', 404);

    const ext      = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf' : (ext.match(/png|jpg|jpeg/) ? `image/${ext.replace('.', '')}` : 'application/octet-stream');
    res.setHeader('Content-Type',        mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="signed_contract_${contract._id}${ext}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { return err(res, e.message, 500); }
});

module.exports = router;