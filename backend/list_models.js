const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key from an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // This method fetches the list of models accessible with your API key
    const result = await genAI.listModels();
    
    console.log("Available models that support generateContent:\n");
    for (const model of result.models) {
      // Filter for models that support the generateContent method
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`- ${model.name}`);
      }
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();