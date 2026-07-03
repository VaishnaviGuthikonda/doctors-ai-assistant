const prompt = `Clinical decision support assistant. Using the inputs below, generate a detailed patient treatment report and return ONLY a JSON object with: patientName, patientAge, diagnosis, patientRiskFlags (array, factoring in age), procedures (array of objects each with name, description, pros, cons, complications, patientSpecificNotes referencing patient age, conflictsWithPatientProfile boolean), generalRecommendations, disclaimer ("AI-assisted. Must be reviewed by licensed physician before sharing with patient."). No extra text. Factor age into every procedure. Flag conflicts. Only include doctor-mentioned procedures.

Patient Name: {{NAME}}
Patient Age: {{AGE}}
Diagnosis Transcript: """{{TRANSCRIPT}}"""`;

module.exports = prompt;