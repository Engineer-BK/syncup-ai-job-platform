import OpenAI from "openai";

/**
 * AI SERVICE CONFIGURATION
 * 
 * NOTE FOR LEARNING:
 * Groq AI provides ultra-fast free AI models (like Meta's Llama 3.3).
 * Groq designed their API to be 100% compatible with the standard OpenAI SDK.
 * By setting `baseURL: "https://api.groq.com/openai/v1"`, we use the standard `openai` library
 * to send requests directly to Groq's high-speed AI engine for free!
 */
const openai = new OpenAI({
  apiKey: process.env.GROK_AI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * AI MATCHING FUNCTION
 * Evaluates candidate resume text against job description and required skills.
 * 
 * @param resumeText - Plain text extracted from candidate's PDF resume
 * @param jobDescription - Detailed description of the job listing
 * @param jobSkills - Array of required skills (e.g., ["React", "TypeScript", "Node.js"])
 * @returns Object containing numerical matchScore (0-100) and skillSummary text.
 */
export const matchResumeWithJob = async (
  resumeText: string,
  jobDescription: string,
  jobSkills: string[]
) => {
  try {
    // 1. Build structured prompt for AI
    const prompt = `
      You are an expert ATS (Applicant Tracking System).
      I will provide you with a candidate's resume text, job description, and required skills.
      
      Resume:
      ${resumeText}
      
      Job Description:
      ${jobDescription}
      
      Required Skills:
      ${jobSkills.join(", ")}
      
      Please evaluate the candidate's resume against the job description and skills.
      Respond strictly in JSON format with the following structure:
      {
        "matchScore": <number between 0 and 100 representing the fit>,
        "skillSummary": "<A short paragraph summarizing matching and missing skills>"
      }
    `;

    // 2. Request completion from Groq AI using Llama 3.3 model
    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, // Forces AI to return valid JSON
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned empty response");

    const result = JSON.parse(content);
    console.log(`🤖 Groq AI calculated match score: ${result.matchScore}%`);
    return result;

  } catch (error) {
    console.error("⚠️ AI Service call failed (API key quota or network issue):", (error as any).message || error);
    
    /**
     * DYNAMIC MOCK FALLBACK SCORING
     * 
     * WHY DO WE HAVE THIS FALLBACK?
     * If the free AI API key expires, runs out of quota, or goes offline,
     * we don't want candidate applications to crash!
     * 
     * SOLUTION:
     * We calculate a realistic fallback score by checking how many required job skills 
     * appear in the candidate's resume text, plus a small random variance for realism.
     */
    console.log("🔄 Switching to dynamic keyword-matching fallback scoring...");

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const resumeTextLower = resumeText.toLowerCase();

    // Check presence of each required skill in resume
    jobSkills.forEach((skill) => {
      if (resumeTextLower.includes(skill.toLowerCase())) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    // Base match score percentage calculated from matched skills ratio
    const matchPercentage = jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 65;

    // Add slight random variation (-5 to +5) for realistic natural scoring
    let finalScore = matchPercentage + Math.floor(Math.random() * 11) - 5;
    
    // Keep score bounded strictly between 15% and 98%
    finalScore = Math.max(15, Math.min(98, finalScore));

    // Construct helpful feedback summary string
    const summary = matchedSkills.length > 0
      ? `(Simulated AI) Candidate matched key skills: ${matchedSkills.join(", ")}.` +
        (missingSkills.length > 0 ? ` Missing: ${missingSkills.join(", ")}.` : " Matched all required skills!")
      : `(Simulated AI) Candidate resume lacked clear mentions of required skills (${missingSkills.join(", ")}).`;

    return {
      matchScore: finalScore,
      skillSummary: summary,
    };
  }
};
