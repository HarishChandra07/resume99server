import Resume from "../models/Resume.js";
import ai from "../configs/ai.js";
import razorpay from "../configs/razorpay.js";
import crypto from "crypto";

// controller for enhancing a resume's professional summary
// POST: /api/ai/enhance-pro-sum
export const enhanceProfessionalSummary = async (req, res) => {
    try {
        const { userContent } = req.body;

        if(!userContent){
            return res.status(400).json({message: 'Missing required fields'})
        }

       const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                { role: "system", content: "You are an expert in resume writing. Your task is to enhance the professional summary of a resume. The summary should be 1-2 sentences also highlighting key skills, experience, and career objectives. Make it compelling and ATS-friendly. and only return text no options or anything else." },
                {
                    role: "user",
                    content: userContent,
                },
    ],
        })

        const enhancedContent = response.choices[0].message.content;
        return res.status(200).json({enhancedContent})
    } catch (error) {
        return res.status(400).json({message: error.message})
    }
}

// controller for enhancing a resume's job description
// POST: /api/ai/enhance-job-desc
export const enhanceJobDescription = async (req, res) => {
    try {
        const { userContent } = req.body;

        if(!userContent){
            return res.status(400).json({message: 'Missing required fields'})
        }

       const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                { role: "system",
                 content: "You are an expert in resume writing. Your task is to enhance the job description of a resume. The job description should be only in 1-2 sentence also highlighting key responsibilities and achievements. Use action verbs and quantifiable results where possible. Make it ATS-friendly. and only return text no options or anything else." },
                {
                    role: "user",
                    content: userContent,
                },
    ],
        })

        const enhancedContent = response.choices[0].message.content;
        return res.status(200).json({enhancedContent})
    } catch (error) {
        return res.status(400).json({message: error.message})
    }
}

// controller for uploading a resume to the database
// POST: /api/ai/upload-resume
export const uploadResume = async (req, res) => {
    try {
       
        const {resumeText, title} = req.body;
        const userId = req.userId;

        if(!resumeText){
            return res.status(400).json({message: 'Missing required fields'})
        }

        const systemPrompt = "You are an expert AI Agent to extract data from resume."

        const userPrompt = `extract data from this resume: ${resumeText}
        
        Provide data in the following JSON format with no additional text before or after:

        {
        professional_summary: { type: String, default: '' },
        skills: [{ type: String }],
        personal_info: {
            image: {type: String, default: '' },
            full_name: {type: String, default: '' },
            profession: {type: String, default: '' },
            email: {type: String, default: '' },
            phone: {type: String, default: '' },
            location: {type: String, default: '' },
            linkedin: {type: String, default: '' },
            website: {type: String, default: '' },
        },
        experience: [
            {
                company: { type: String },
                position: { type: String },
                start_date: { type: String },
                end_date: { type: String },
                description: { type: String },
                is_current: { type: Boolean },
            }
        ],
        project: [
            {
                name: { type: String },
                type: { type: String },
                description: { type: String },
            }
        ],
        education: [
            {
                institution: { type: String },
                degree: { type: String },
                field: { type: String },
                graduation_date: { type: String },
                gpa: { type: String },
            }
        ],          
        }
        `;

       const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                { role: "system",
                 content: systemPrompt },
                {
                    role: "user",
                    content: userPrompt,
                },
        ],
        response_format: {type:  'json_object'}
        })

        const extractedData = response.choices[0].message.content;
        const parsedData = JSON.parse(extractedData)
        const newResume = await Resume.create({userId, title, ...parsedData})

        res.json({resumeId: newResume._id})
    } catch (error) {
        return res.status(400).json({message: error.message})
    }
}

// controller for analyzing a resume and providing a score and feedback
// POST: /api/ai/analyze-resume
export const analyzeResume = async (req, res) => {
    try {
        const { resumeId } = req.body;
        const userId = req.userId;

        if (!resumeId) {
            return res.status(400).json({ message: 'Resume ID is required' });
        }

        // Find the resume to ensure the user owns it
        const resume = await Resume.findOne({ _id: resumeId, userId });

        if (!resume) {
            return res.status(404).json({ message: 'Resume not found or you do not have permission to access it.' });
        }

        // Check if the analysis has been purchased
        if (!resume.analysis_purchased) {
            return res.status(403).json({ message: 'Please purchase the analysis for this resume to get the score and feedback.' });
        }

        // Convert the resume data to a string format for the AI prompt
        const resumeString = `
            Professional Summary: ${resume.professional_summary}
            Skills: ${resume.skills.join(', ')}
            Experience: ${resume.experience.map(exp => `${exp.position} at ${exp.company}: ${exp.description}`).join('; ')}
            Education: ${resume.education.map(edu => `${edu.degree} from ${edu.institution}`).join('; ')}
            Projects: ${resume.project.map(p => `${p.name}: ${p.description}`).join('; ')}
        `;

        const systemPrompt = `You are an expert resume reviewer and career coach. Your task is to analyze a resume and provide a detailed review.
        Provide a score out of 100 and constructive feedback on the following criteria:
        1.  **Clarity and Conciseness:** Is the resume easy to read and understand?
        2.  **ATS Optimization:** Is the resume optimized with relevant keywords for Applicant Tracking Systems?
        3.  **Action Verbs and Impact:** Does the resume use strong action verbs and quantify achievements?
        4.  **Completeness:** Are there any missing sections or information?
        5.  **Overall Impression:** Your final thoughts and key recommendations.

        Return your analysis ONLY in the following JSON format, with no additional text or explanations before or after the JSON object:
        {
          "score": 85,
          "feedback": {
            "overall": "This is a strong resume with great potential. With a few tweaks to the impact statements and keyword optimization, it can be outstanding.",
            "clarity": "The resume is well-structured and easy to follow. The use of sections is clear. Consider using bullet points more consistently in the experience section.",
            "ats_optimization": "The resume could be better optimized for ATS. It lacks some of the keywords found in typical job descriptions for this role. I recommend adding a dedicated 'Skills' section with terms like 'Project Management', 'Agile Methodologies', etc.",
            "impact": "The experience descriptions are good but could be more impactful. Try to quantify achievements. For example, instead of 'Managed a team', write 'Managed a team of 5 engineers and increased productivity by 15%'.",
            "completeness": "The resume is comprehensive. All standard sections are present. The contact information is clear."
          }
        }
        `;

        const userPrompt = `Please analyze the following resume:\n\n${resumeString}`;

        const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(response.choices[0].message.content);

        return res.status(200).json({ analysis });

    } catch (error) {
        // Log the error for debugging
        console.error("Error in analyzeResume:", error);
        // Check if the error is from parsing JSON
        if (error instanceof SyntaxError) {
            return res.status(500).json({ message: "Failed to parse AI response. Please try again." });
        }
        return res.status(500).json({ message: error.message || "An unexpected error occurred." });
    }
};

// controller for creating a razorpay order for a resume analysis
// POST: /api/ai/create-order
export const createRazorpayOrder = async (req, res) => {
    try {
        const { resumeId, amount } = req.body; // Amount in smallest currency unit
        const userId = req.userId;

        if (!resumeId || !amount) {
            return res.status(400).json({ message: 'Resume ID and amount are required' });
        }

        const resume = await Resume.findOne({ _id: resumeId, userId });

        if (!resume) {
            return res.status(404).json({ message: 'Resume not found or you do not have permission to access it.' });
        }
        
        if (resume.analysis_purchased) {
            return res.status(400).json({ message: 'Analysis for this resume has already been purchased.' });
        }

        const options = {
            amount, // amount in the smallest currency unit
            currency: "INR",
            receipt: `receipt_resume_${resumeId}`,
            notes: {
                resumeId: resumeId.toString(),
                userId: userId.toString(),
            }
        };

        const order = await razorpay.orders.create(options);

        if (!order) {
            return res.status(500).json({ message: "Something went wrong" });
        }

        res.json(order);

    } catch (error) {
        res.status(500).json({ message: error.message || 'An unexpected error occurred.' });
    }
};

// controller for verifying a razorpay payment
// POST: /api/ai/verify-payment
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, resumeId } = req.body;
        const userId = req.userId;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !resumeId) {
            return res.status(400).json({ message: 'Missing required payment details' });
        }

        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
        }
        
        // Payment is verified, now update the resume
        const resume = await Resume.findOne({ _id: resumeId, userId });

        if (!resume) {
             return res.status(404).json({ message: 'Resume not found or you do not have permission to access it.' });
        }
        
        resume.analysis_purchased = true;
        await resume.save();
        
        res.status(200).json({
            message: "Payment successful! Resume analysis has been unlocked.",
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
        });

    } catch (error) {
         res.status(500).json({ message: error.message || 'An unexpected error occurred.' });
    }
};