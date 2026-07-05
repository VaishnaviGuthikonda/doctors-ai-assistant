const prompt = `Clinical decision support assistant. Using the inputs below including real web research, generate a detailed patient treatment report and return ONLY a JSON object with: patientName, patientAge, diagnosis, patientRiskFlags (array, factoring in age), procedures (array of objects each with name, description, pros, cons, complications, patientSpecificNotes referencing patient age, conflictsWithPatientProfile boolean), generalRecommendations, disclaimer ("AI-assisted. Must be reviewed by licensed physician before sharing with patient."). No extra text. Factor age into every procedure. Flag conflicts. Only include doctor-mentioned procedures.

CRITICAL INSTRUCTIONS FOR COMPLICATIONS, PROS AND CONS:
- You MUST list every single complication found in the web research
- Do NOT skip rare or uncommon complications
- Do NOT group or summarise complications together
- Each complication MUST have its own entry with: name and a clear explanation of what it is, why it happens, and how serious it is
- Same rule applies for pros and cons — every single one must be listed separately with explanation
- If the research mentions 20 complications, list all 20
- Format each complication as: "Complication name: what it is, why it occurs, severity level"
Patient Name: {{NAME}}
Patient Age: {{AGE}}
Diagnosis Transcript: """{{TRANSCRIPT}}"""
Web Research: """{{SEARCH_RESULTS}}"""`;

module.exports = prompt;