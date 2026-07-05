require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const { tavily } = require("@tavily/core");
const promptTemplate = require("./prompt");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

app.use(cors());
app.use(express.json());

// Step 1 — Extract procedure names from transcript
async function extractProcedures(transcript) {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{
      role: "user",
      content: `Extract only the medical procedure and treatment names from this transcript. Return ONLY a JSON array of strings. No extra text.\n\nTranscript: """${transcript}"""`
    }]
  });
  const text = response.choices[0].message.content;
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// Step 2 — Search Tavily for each procedure
async function searchProcedures(procedures) {
  const results = await Promise.all(procedures.map(async (proc) => {
    const [complicationsRes, prosConsRes] = await Promise.all([
      tavilyClient.search(`${proc} all medical complications risks side effects list`, { 
        maxResults: 7, 
        searchDepth: "advanced",
        includeAnswer: true
      }),
      tavilyClient.search(`${proc} complete pros cons benefits drawbacks list`, { 
        maxResults: 7, 
        searchDepth: "advanced",
        includeAnswer: true
      })
    ]);

    const complications = [
      complicationsRes.answer || "",
      ...complicationsRes.results.map(r => `${r.title}: ${r.content}`)
    ].join("\n");

    const prosCons = [
      prosConsRes.answer || "",
      ...prosConsRes.results.map(r => `${r.title}: ${r.content}`)
    ].join("\n");

    return { procedure: proc, complications, prosCons };
  }));
  return results;
}

// Step 3 — Format search results for prompt
function formatSearchResults(searchResults) {
  return searchResults.map(r => `
Procedure: ${r.procedure}
Complications & Risks: ${r.complications}
Pros & Cons: ${r.prosCons}
`).join("\n---\n");
}

// Main route
app.post("/generate", async (req, res) => {
  const { name, age, transcript } = req.body;

  try {
    // Extract procedures
    const procedures = await extractProcedures(transcript);

    // Search Tavily
    const searchResults = await searchProcedures(procedures);
    const formattedResults = formatSearchResults(searchResults);

    // Build final prompt
    const prompt = promptTemplate
      .replace("{{NAME}}", name)
      .replace("{{AGE}}", age)
      .replace("{{TRANSCRIPT}}", transcript)
      .replace("{{SEARCH_RESULTS}}", formattedResults);

    // Call Groq
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));