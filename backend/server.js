require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const promptTemplate = require("./prompt");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());

app.post("/generate", async (req, res) => {
  const { name, age, transcript } = req.body;

  const prompt = promptTemplate
    .replace("{{NAME}}", name)
    .replace("{{AGE}}", age)
    .replace("{{TRANSCRIPT}}", transcript);

  try {
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