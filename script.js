// Configuration - Production webhook URL
const WEBHOOK_URL =
  "https://agents.eadirectory.com/webhook/chatbot-analytics-ead";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Rest of your existing script.js code remains the same...
// DOM Elements
const fileInput = document.getElementById("fileInput");
const fileUploadButton = document.getElementById("fileUploadButton");
const fileInfo = document.getElementById("fileInfo");
const previewSection = document.getElementById("previewSection");
const previewContent = document.getElementById("previewContent");
const dataInsights = document.getElementById("dataInsights");
const submitBtn = document.getElementById("submitBtn");
const buttonText = document.getElementById("buttonText");
const statusMessage = document.getElementById("statusMessage");
const form = document.getElementById("submissionForm");
const companySelect = document.getElementById("company");
const companyInfo = document.getElementById("companyInfo");
const fileError = document.getElementById("fileError");
const apiKeyError = document.getElementById("apiKeyError");

let selectedFile = null;
let jsonData = null;
let detectedCompany = null;

// Company data
const companies = {
  "maisha-bora": {
    name: "Maisha Bora Sacco",
    pickaxe_id: "Maisha_Bora_Sacco_Virtual_Assistant_8VSQ2",
    contact: "analytics@maishabora.co.ke",
  },
};

// Event listeners
fileInput.addEventListener("change", handleFileSelect);
fileUploadButton.addEventListener("dragover", handleDragOver);
fileUploadButton.addEventListener("drop", handleDrop);
companySelect.addEventListener("change", handleCompanyChange);
form.addEventListener("submit", handleSubmit);

function handleDragOver(e) {
  e.preventDefault();
  fileUploadButton.style.borderColor = "var(--secondary-color)";
}

function handleDrop(e) {
  e.preventDefault();
  fileUploadButton.style.borderColor = "var(--primary-color)";

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    handleFileSelect({ target: { files } });
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Clear previous errors
  clearErrors();

  // Validate file type
  if (
    file.type !== "application/json" &&
    !file.name.toLowerCase().endsWith(".json")
  ) {
    showFileError("Please select a valid JSON file");
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    showFileError("File size exceeds 10MB limit");
    return;
  }

  selectedFile = file;
  fileUploadButton.classList.add("has-file");
  fileInfo.classList.add("show");
  fileInfo.innerHTML = `
                <strong>Selected file:</strong> ${file.name}<br>
                <strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
                <strong>Last modified:</strong> ${new Date(
                  file.lastModified
                ).toLocaleString()}
            `;

  // Read and validate file
  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      jsonData = JSON.parse(event.target.result);
      validateAndPreviewData(jsonData);
    } catch (error) {
      showFileError("Invalid JSON file format: " + error.message);
      selectedFile = null;
      jsonData = null;
    }
  };
  reader.readAsText(file);
}

function validateAndPreviewData(data) {
  // Validate data structure
  if (!data.activity || !Array.isArray(data.activity)) {
    showFileError('Invalid data format: Missing or invalid "activity" array');
    return;
  }

  if (data.activity.length === 0) {
    showFileError("No activity data found in the file");
    return;
  }

  // Validate first activity item
  const firstActivity = data.activity[0];
  if (!firstActivity.pickaxe || !firstActivity.pickaxe.id) {
    showFileError("Invalid data format: Missing pickaxe information");
    return;
  }

  // Auto-detect company
  detectCompany(firstActivity.pickaxe);

  // Generate preview
  generateDataPreview(data);
  previewSection.classList.add("show");
}

function detectCompany(pickaxe) {
  const pickaxeId = pickaxe.id;
  const pickaxeTitle = pickaxe.title;

  // Try to match with existing companies
  for (const [key, company] of Object.entries(companies)) {
    if (
      company.pickaxe_id === pickaxeId ||
      pickaxeTitle
        .toLowerCase()
        .includes(company.name.toLowerCase().replace(" ", ""))
    ) {
      detectedCompany = key;
      companySelect.value = key;
      showCompanyInfo(company, "auto-detected");
      return;
    }
  }

  // If no match found
  showCompanyInfo(
    {
      name: pickaxeTitle,
      pickaxe_id: pickaxeId,
      detected: true,
    },
    "new-detected"
  );
}

function generateDataPreview(data) {
  const activities = data.activity;

  // Calculate quick insights
  const insights = {
    totalConversations: activities.length,
    uniqueUsers: new Set(activities.map((a) => a.userId)).size,
    totalMessages: activities.reduce(
      (sum, a) => sum + (a.messages?.length || 0),
      0
    ),
    avgConversationLength:
      activities.length > 0
        ? (
            activities.reduce((sum, a) => sum + (a.messages?.length || 0), 0) /
            activities.length
          ).toFixed(1)
        : 0,
  };

  // Display insights
  dataInsights.innerHTML = `
                <div class="insight-card">
                    <div class="insight-value">${insights.totalConversations.toLocaleString()}</div>
                    <div class="insight-label">Total Conversations</div>
                </div>
                <div class="insight-card">
                    <div class="insight-value">${insights.uniqueUsers.toLocaleString()}</div>
                    <div class="insight-label">Unique Users</div>
                </div>
                <div class="insight-card">
                    <div class="insight-value">${insights.totalMessages.toLocaleString()}</div>
                    <div class="insight-label">Total Messages</div>
                </div>
                <div class="insight-card">
                    <div class="insight-value">${
                      insights.avgConversationLength
                    }</div>
                    <div class="insight-label">Avg Messages/Conversation</div>
                </div>
            `;

  // Display raw data preview
  previewContent.textContent =
    JSON.stringify(data, null, 2).substring(0, 1000) + "...";
}

function showCompanyInfo(company, type) {
  let infoHtml = "";

  if (type === "auto-detected") {
    infoHtml = `
                    <strong style="color: var(--success-color);">✓ Auto-detected:</strong> ${company.name}<br>
                    <strong>Pickaxe ID:</strong> ${company.pickaxe_id}
                `;
  } else if (type === "new-detected") {
    infoHtml = `
                    <strong style="color: var(--warning-color);">⚠ New Company Detected:</strong> ${company.name}<br>
                    <strong>Pickaxe ID:</strong> ${company.pickaxe_id}<br>
                    <em>This company will be added to the system</em>
                `;
  }

  if (infoHtml) {
    companyInfo.innerHTML = infoHtml;
    companyInfo.classList.add("show");
  }
}

function handleCompanyChange(e) {
  if (e.target.value === "new-company") {
    // Handle new company addition
    const companyName = prompt("Enter the new company name:");
    if (companyName) {
      // You could add this to the companies object or handle it server-side
      showStatus("New company will be created during processing", "warning");
    }
  } else if (e.target.value && companies[e.target.value]) {
    showCompanyInfo(companies[e.target.value], "selected");
  } else {
    companyInfo.classList.remove("show");
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  // Clear previous errors
  clearErrors();

  // Validate form
  if (!jsonData) {
    showFileError("Please select a JSON file");
    return;
  }

  const company = companySelect.value;
  const apiKey = document.getElementById("apiKey").value.trim();

  if (!company) {
    showStatus("Please select a company", "error");
    return;
  }

  if (!apiKey) {
    showError("apiKeyError", "API key is required");
    return;
  }

  // Validate API key format (basic validation)
  if (apiKey.length < 10) {
    showError("apiKeyError", "API key appears to be too short");
    return;
  }

  // Disable submit button
  submitBtn.disabled = true;
  buttonText.innerHTML = '<span class="spinner"></span>Processing...';

  try {
    const requestPayload = {
      ...jsonData,
      metadata: {
        submittedAt: new Date().toISOString(),
        fileSize: selectedFile.size,
        fileName: selectedFile.name,
        detectedCompany: detectedCompany,
      },
    };

    console.log("Submitting to:", WEBHOOK_URL);
    console.log("Payload size:", JSON.stringify(requestPayload).length);

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Company-Hint": company,
        // Add these additional headers for debugging
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(requestPayload),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    const result = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));

    if (response.ok) {
      showStatus(
        "✅ Data submitted successfully! Processing analytics...",
        "success"
      );
      // Reset form after successful submission
      setTimeout(() => {
        resetForm();
      }, 3000);
    } else {
      const errorMessage =
        result.message ||
        result.error ||
        `HTTP ${response.status}: ${response.statusText}`;
      showStatus(`❌ Error: ${errorMessage}`, "error");
    }
  } catch (error) {
    console.error("Submission error:", error);
    showStatus(`🌐 Network error: ${error.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    buttonText.textContent = "Submit Analytics Data";
  }
}

function resetForm() {
  selectedFile = null;
  jsonData = null;
  detectedCompany = null;
  form.reset();
  fileUploadButton.classList.remove("has-file");
  fileInfo.classList.remove("show");
  previewSection.classList.remove("show");
  companyInfo.classList.remove("show");
  statusMessage.classList.remove("show");
  clearErrors();
}

function showFileError(message) {
  fileError.textContent = message;
  fileUploadButton.classList.add("error");
  selectedFile = null;
  jsonData = null;
}

function showError(elementId, message) {
  document.getElementById(elementId).textContent = message;
}

function clearErrors() {
  fileError.textContent = "";
  apiKeyError.textContent = "";
  fileUploadButton.classList.remove("error");
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type} show`;

  if (type === "success") {
    setTimeout(() => {
      statusMessage.classList.remove("show");
    }, 5000);
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("Chatbot Analytics Portal initialized");
  console.log("Webhook URL:", WEBHOOK_URL);
});
