const BACKEND_URL = "https://doctors-ai-assistant-production.up.railway.app";

const recordBtn = document.getElementById("recordBtn");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");
const liveTranscript = document.getElementById("liveTranscript");
const editableTranscript = document.getElementById("editableTranscript");
const patientName = document.getElementById("patientName");
const patientAge = document.getElementById("patientAge");
const reviewSection = document.getElementById("reviewSection");

let recognition;
let finalTranscript = "";
let isRecording = false;

// Setup Web Speech API
function setupRecognition() {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + " ";
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    liveTranscript.textContent = finalTranscript + interim;
  };

  recognition.onend = () => {
    if (isRecording) recognition.start();
  };
}

// Record button
recordBtn.addEventListener("click", () => {
  if (!isRecording) {
    setupRecognition();
    recognition.start();
    isRecording = true;
    recordBtn.textContent = "Stop Recording";
    recordBtn.classList.add("recording");
    generateBtn.disabled = true;
  } else {
    recognition.stop();
    isRecording = false;
    recordBtn.textContent = "Start Recording";
    recordBtn.classList.remove("recording");
    editableTranscript.value = finalTranscript.trim();
    generateBtn.disabled = false;
  }
});

// Clear button
clearBtn.addEventListener("click", () => {
  finalTranscript = "";
  liveTranscript.textContent = "Transcript will appear here...";
  editableTranscript.value = "";
  generateBtn.disabled = true;
  reviewSection.style.display = "none";
});

// Generate button
generateBtn.addEventListener("click", async () => {
  const name = patientName.value.trim();
  const age = patientAge.value.trim();
  const transcript = editableTranscript.value.trim();

  if (!name || !age || !transcript) {
    alert("Please fill in patient name, age and record a transcript first.");
    return;
  }

  generateBtn.textContent = "Generating...";
  generateBtn.disabled = true;

  try {
    const response = await fetch(`${BACKEND_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, age, transcript }),
    });

    const data = await response.json();
    populateReview(data);
  } catch (err) {
    alert("Something went wrong. Please try again.");
    console.error(err);
  } finally {
    generateBtn.textContent = "Generate Report";
    generateBtn.disabled = false;
  }
});

// Populate review section
function populateReview(data) {
  document.getElementById("rName").value = data.patientName;
  document.getElementById("rAge").value = data.patientAge;
  document.getElementById("rDiagnosis").value = data.diagnosis;
  document.getElementById("rRiskFlags").value = data.patientRiskFlags.join("\n");
  document.getElementById("rRecommendations").value = data.generalRecommendations;
  document.getElementById("rDisclaimer").value = data.disclaimer;

  const proceduresDiv = document.getElementById("rProcedures");
  proceduresDiv.innerHTML = "";

  data.procedures.forEach((proc, i) => {
    proceduresDiv.innerHTML += `
      <div class="procedure-block">
        <h3>Procedure ${i + 1}</h3>
        ${proc.conflictsWithPatientProfile ? '<div class="conflict-warning">⚠ Conflict with patient profile</div>' : ""}
        <label>Name</label>
        <textarea class="proc-name">${proc.name}</textarea>
        <label>Description</label>
        <textarea class="proc-desc">${proc.description}</textarea>
        <label>Pros (one per line)</label>
        <textarea class="proc-pros">${proc.pros.join("\n")}</textarea>
        <label>Cons (one per line)</label>
        <textarea class="proc-cons">${proc.cons.join("\n")}</textarea>
        <label>Complications (one per line)</label>
        <textarea class="proc-comp">${proc.complications.join("\n")}</textarea>
        <label>Patient Specific Notes</label>
        <textarea class="proc-notes">${proc.patientSpecificNotes}</textarea>
      </div>
    `;
  });

  reviewSection.style.display = "block";
  reviewSection.scrollIntoView({ behavior: "smooth" });
}

// Download PDF
downloadBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  function addText(text, size, bold, color) {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...(color || [0, 0, 0]));
    const lines = doc.splitTextToSize(String(text), maxWidth);
    if (y + lines.length * size * 0.5 > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, margin, y);
    y += lines.length * size * 0.5 + 4;
  }

  function addDivider() {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  const name = document.getElementById("rName").value;
  const age = document.getElementById("rAge").value;
  const diagnosis = document.getElementById("rDiagnosis").value;
  const riskFlags = document.getElementById("rRiskFlags").value.split("\n").filter(Boolean);
  const recommendations = document.getElementById("rRecommendations").value;
  const disclaimer = document.getElementById("rDisclaimer").value;

  const procBlocks = document.querySelectorAll(".procedure-block");
  const procedures = Array.from(procBlocks).map(block => ({
    name: block.querySelector(".proc-name").value,
    description: block.querySelector(".proc-desc").value,
    pros: block.querySelector(".proc-pros").value.split("\n").filter(Boolean),
    cons: block.querySelector(".proc-cons").value.split("\n").filter(Boolean),
    complications: block.querySelector(".proc-comp").value.split("\n").filter(Boolean),
    patientSpecificNotes: block.querySelector(".proc-notes").value,
    hasConflict: block.querySelector(".conflict-warning") !== null,
  }));

  // Title
  addText("Patient Treatment Report", 22, true, [26, 115, 232]);
  addDivider();

  // Patient Info
  addText(`Patient Name: ${name}`, 12, true);
  addText(`Patient Age: ${age}`, 12, false);
  y += 4;
  addDivider();

  // Diagnosis
  addText("Diagnosis", 16, true, [26, 115, 232]);
  addText(diagnosis, 11, false);
  y += 4;

  // Risk Flags
  if (riskFlags.length > 0) {
    addText("Risk Flags", 14, true, [217, 48, 37]);
    riskFlags.forEach(flag => addText(`• ${flag}`, 11, false));
    y += 4;
  }

  addDivider();

  // Procedures
  addText("Procedures & Treatments", 16, true, [26, 115, 232]);
  y += 4;

  procedures.forEach((proc, i) => {
    addText(`${i + 1}. ${proc.name}`, 13, true);
    if (proc.hasConflict) {
      addText("⚠ Conflict with patient profile", 11, true, [217, 48, 37]);
    }
    addText(proc.description, 11, false);
    y += 2;
    addText("Pros:", 11, true, [52, 168, 83]);
    proc.pros.forEach(p => addText(`• ${p}`, 11, false));
    addText("Cons:", 11, true, [217, 48, 37]);
    proc.cons.forEach(c => addText(`• ${c}`, 11, false));
    addText("Complications:", 11, true, [180, 90, 0]);
    proc.complications.forEach(c => addText(`• ${c}`, 11, false));
    addText("Patient Specific Notes:", 11, true);
    addText(proc.patientSpecificNotes, 11, false);
    y += 6;
    addDivider();
  });

  // Recommendations
  addText("General Recommendations", 14, true, [26, 115, 232]);
  addText(recommendations, 11, false);
  y += 4;
  addDivider();

  // Disclaimer
  addText(disclaimer, 10, false, [150, 150, 150]);

  doc.save(`${name}_report.pdf`);
});