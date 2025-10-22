import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
    analyzeResume,
    enhanceJobDescription,
    enhanceProfessionalSummary,
    uploadResume,
    createRazorpayOrder,
    verifyRazorpayPayment
} from "../controllers/aiController.js";

const aiRouter = express.Router();

aiRouter.post('/enhance-pro-sum', protect, enhanceProfessionalSummary);
aiRouter.post('/enhance-job-desc', protect, enhanceJobDescription);
aiRouter.post('/upload-resume', protect, uploadResume);
aiRouter.post('/analyze-resume', protect, analyzeResume);
aiRouter.post('/create-order', protect, createRazorpayOrder);
aiRouter.post('/verify-payment', protect, verifyRazorpayPayment);

export default aiRouter;