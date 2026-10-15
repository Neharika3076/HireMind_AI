
const API_URL = "http://127.0.0.1:8000";

// HTML elements
const jobDescription = document.getElementById("jobDescription");
const jobStatus = document.getElementById("jobStatus");

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const chooseButton = document.getElementById("chooseButton");
const fileList = document.getElementById("fileList");
const clearFilesButton = document.getElementById("clearFilesButton");
const analyzeButton = document.getElementById("analyzeButton");

const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const progressText = document.getElementById("progressText");

const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("resultSection");
const resultSummary = document.getElementById("resultSummary");
const resultsOverview = document.getElementById("resultsOverview");
const candidateTableBody = document.getElementById("candidateTableBody");

const candidateDetail = document.getElementById("candidateDetail");
const detailCandidateName = document.getElementById("detailCandidateName");
const detailCandidateFile = document.getElementById("detailCandidateFile");
const candidateDetailContent = document.getElementById(
    "candidateDetailContent"
);
const closeDetailButton = document.getElementById("closeDetailButton");

const exportButton = document.getElementById("exportButton");

const extractionSection = document.getElementById("extractionSection");
const resultFileName = document.getElementById("resultFileName");
const wordCount = document.getElementById("wordCount");
const characterCount = document.getElementById("characterCount");
const resumeText = document.getElementById("resumeText");
const copyButton = document.getElementById("copyButton");

// State
let selectedResumes = [];
let candidateResults = [];
let lastExtractedText = "";


// ------------------------------
// FILE SELECTION
// ------------------------------

chooseButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = "";
});

dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", (event) => {
    if (!dropZone.contains(event.relatedTarget)) {
        dropZone.classList.remove("dragover");
    }
});

dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    addFiles(Array.from(event.dataTransfer.files));
});

function addFiles(files) {
    hideError();

    const allowedExtensions = ["pdf", "docx"];
    const rejectedFiles = [];
    const existingKeys = new Set(
        selectedResumes.map(file => `${file.name}:${file.size}:${file.lastModified}`)
    );

    for (const file of files) {
        const extension = file.name.split(".").pop().toLowerCase();
        const key = `${file.name}:${file.size}:${file.lastModified}`;

        if (!allowedExtensions.includes(extension)) {
            rejectedFiles.push(file.name);
            continue;
        }

        if (existingKeys.has(key)) {
            continue;
        }

        selectedResumes.push(file);
        existingKeys.add(key);
    }

    renderFileList();
    updateAnalyzeButton();

    if (rejectedFiles.length > 0) {
        showError(
            `Unsupported file(s): ${rejectedFiles.join(", ")}. Only PDF and DOCX are supported.`
        );
    }
}

function renderFileList() {
    fileList.replaceChildren();

    if (selectedResumes.length === 0) {
        fileList.classList.add("hidden");
        return;
    }

    fileList.classList.remove("hidden");

    selectedResumes.forEach((file, index) => {
        const row = document.createElement("div");
        row.className = "selected-file";

        const info = document.createElement("div");

        const name = document.createElement("span");
        name.textContent = file.name;

        const size = document.createElement("small");
        size.textContent = ` (${formatFileSize(file.size)})`;

        info.append(name, size);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "×";
        removeButton.setAttribute("aria-label", `Remove ${file.name}`);

        removeButton.addEventListener("click", () => {
            if (isAnalyzing()) return;

            selectedResumes.splice(index, 1);
            renderFileList();
            updateAnalyzeButton();
        });

        row.append(info, removeButton);
        fileList.appendChild(row);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

clearFilesButton.addEventListener("click", () => {
    if (isAnalyzing()) return;

    selectedResumes = [];
    candidateResults = [];

    renderFileList();
    updateAnalyzeButton();

    resultSection.classList.add("hidden");
    extractionSection.classList.add("hidden");
    candidateDetail.classList.add("hidden");

    hideError();
});

function updateAnalyzeButton() {
    analyzeButton.disabled =
        isAnalyzing() ||
        selectedResumes.length === 0 ||
        !jobDescription.value.trim();
}

jobDescription.addEventListener("input", updateAnalyzeButton);

function isAnalyzing() {
    return analyzeButton.dataset.busy === "true";
}


// ------------------------------
// API HELPER
// ------------------------------

async function postJSON(endpoint, body) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    return parseResponse(response);
}

async function parseResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            typeof data.detail === "string"
                ? data.detail
                : `Request failed with HTTP ${response.status}`
        );
    }

    if (data.success === false) {
        throw new Error(data.message || "The server could not complete the request.");
    }

    return data;
}


// ------------------------------
// MAIN ANALYSIS WORKFLOW
// ------------------------------


analyzeButton.addEventListener("click", analyzeCandidates);

function getCandidateDetails(profile, filename = "") {
    const candidate = profile?.candidate;

    const person =
        candidate && typeof candidate === "object"
            ? candidate
            : {};

    const getValue = (...values) => {
        const value = values.find(
            v => typeof v === "string" && v.trim()
        );
        return value || "Not provided";
    };

    return {
        name: getValue(
            person.name,
            person.full_name,
            typeof candidate === "string" ? candidate : null,
            profile?.name,
            profile?.full_name
        ),
        email: getValue(person.email, profile?.email),
        phone: getValue(
            person.phone,
            person.contact,
            person.contact_number,
            person.phone_number,
            profile?.phone,
            profile?.contact,
            profile?.contact_number,
            profile?.phone_number
        ),
        location: getValue(
            person.location,
            person.address,
            profile?.location,
            profile?.address
        )
    };
}

async function analyzeCandidates() {
    const description = jobDescription.value.trim();

    if (!description) {
        showError("Enter a job description first.");
        jobDescription.focus();
        return;
    }

    if (selectedResumes.length === 0) {
        showError("Upload at least one PDF or DOCX resume.");
        return;
    }

    const filesToAnalyze = [...selectedResumes];

    candidateResults = [];
    resultSection.classList.add("hidden");
    extractionSection.classList.add("hidden");
    candidateDetail.classList.add("hidden");

    hideError();
    setBusy(true);

    try {
        // Analyze the job once for the whole batch.
        loadingText.textContent = "Analyzing job description...";
        progressText.textContent = "Preparing candidate matching";

        jobStatus.textContent = "Analyzing job description...";
        jobStatus.classList.remove("hidden");

        const jobResponse = await postJSON("/api/job/analyze", {
            job_description: description
        });

        const jobProfile = jobResponse.profile;

        if (!jobProfile) {
            throw new Error("The job analyzer returned no structured job profile.");
        }

        jobStatus.textContent = "Job analyzed successfully.";

        // Process resumes one by one to avoid flooding the API.
        for (let index = 0; index < filesToAnalyze.length; index++) {
            const file = filesToAnalyze[index];

            loadingText.textContent = `Analyzing ${file.name}`;
            progressText.textContent =
                `${index} of ${filesToAnalyze.length} candidates processed`;

            try {
                const formData = new FormData();
                formData.append("file", file);

                const resumeResponse = await fetch(
                    `${API_URL}/api/resume/extract`,
                    {
                        method: "POST",
                        body: formData
                    }
                );

                const resumeData = await parseResponse(resumeResponse);

                if (!resumeData.profile) {
                    throw new Error("No structured candidate profile was returned.");
                }

                // Keep the extracted text available for verification.
                lastExtractedText = resumeData.text || "";

                const matchResponse = await postJSON("/api/ats/match", {
                    resume: resumeData.profile,
                    job: jobProfile
                });

                if (!matchResponse.result) {
                    throw new Error("The ATS matcher returned no matching result.");
                }

                const profile = resumeData.profile;
                const details = getCandidateDetails(profile, file.name);

                candidateResults.push({
                    filename: file.name,
                    candidateName: details.name,
                    contactDetails: details,
                    profile,
                    result: matchResponse.result,
                    extractedText: resumeData.text || "",
                    words: resumeData.words ?? 0,
                    chars: resumeData.chars ?? 0,
                    error: null
                });
            } catch (error) {
                // A failed candidate should not stop the remaining batch.
                candidateResults.push({
                    filename: file.name,
                    candidateName: file.name,
                    profile: null,
                    result: null,
                    extractedText: "",
                    words: 0,
                    chars: 0,
                    error: error.message || "Candidate analysis failed."
                });
            }

            progressText.textContent =
                `${index + 1} of ${filesToAnalyze.length} candidates processed`;
        }

        renderResults();

        const successCount = candidateResults.filter(
            candidate => candidate.result
        ).length;

        const failureCount = candidateResults.length - successCount;

        resultSummary.textContent =
            `${successCount} candidate(s) analyzed successfully` +
            (failureCount ? ` · ${failureCount} failed` : "");

        resultSection.classList.remove("hidden");

        if (successCount === 0) {
            showError(
                "No candidates were successfully analyzed. Check the candidate errors below and your backend logs."
            );
        }
    } catch (error) {
        showError(error.message || "Analysis failed. Check that the backend is running.");
    } finally {
        setBusy(false);
        jobStatus.classList.add("hidden");
    }
}

function setBusy(busy) {
    analyzeButton.dataset.busy = String(busy);
    loading.classList.toggle("hidden", !busy);

    chooseButton.disabled = busy;
    clearFilesButton.disabled = busy;
    jobDescription.disabled = busy;

    updateAnalyzeButton();
}


// ------------------------------
// RENDER COMPARISON RESULTS
// ------------------------------

function renderResults() {
    const successful = candidateResults
        .filter(candidate => candidate.result)
        .sort((a, b) => getScore(b.result) - getScore(a.result));

    const failed = candidateResults.filter(candidate => !candidate.result);

    candidateResults = [...successful, ...failed];

    candidateTableBody.replaceChildren();
    resultsOverview.replaceChildren();

    const highestScore = successful.length
        ? getScore(successful[0].result)
        : null;

    addOverviewCard("Resumes submitted", candidateResults.length);
    addOverviewCard("Successfully analyzed", successful.length);
    addOverviewCard(
        "Highest ATS score",
        highestScore === null ? "—" : `${highestScore}%`
    );

    candidateResults.forEach((candidate, index) => {
        const row = document.createElement("tr");

        const rankCell = document.createElement("td");
        rankCell.textContent = candidate.result ? String(index + 1) : "—";

        const nameCell = document.createElement("td");
        nameCell.textContent = candidate.candidateName;

        const details = candidate.contactDetails ||
            getCandidateDetails(candidate.profile || {});

        const emailCell = document.createElement("td");
        emailCell.textContent = details.email;

        const phoneCell = document.createElement("td");
        phoneCell.textContent = details.phone;

        const locationCell = document.createElement("td");
        locationCell.textContent = details.location;

        const scoreCell = document.createElement("td");
        scoreCell.textContent = candidate.result
            ? `${getScore(candidate.result)}%`
            : "—";

        const skillsCell = document.createElement("td");
        skillsCell.textContent = candidate.result
            ? getRequiredSkillSummary(candidate.result)
            : "—";

        const experienceCell = document.createElement("td");
        experienceCell.textContent = candidate.result
            ? getExperienceSummary(candidate.result)
            : "—";

        const statusCell = document.createElement("td");
        statusCell.textContent = candidate.result ? "Analyzed" : "Failed";
        statusCell.className = candidate.result ? "status-success" : "status-error";

        if (candidate.error) {
            statusCell.title = candidate.error;
        }

        const detailsCell = document.createElement("td");
        const detailsButton = document.createElement("button");

        detailsButton.type = "button";
        detailsButton.textContent = candidate.result ? "View details" : "View error";
        detailsButton.className = "secondary-button";

        detailsButton.addEventListener("click", () => {
            if (candidate.result) {
                showCandidateDetails(candidate);
            } else {
                showCandidateError(candidate);
            }
        });

        detailsCell.appendChild(detailsButton);

        row.append(
            rankCell,
            nameCell,
            emailCell,
            phoneCell,
            locationCell,
            scoreCell,
            skillsCell,
            experienceCell,
            statusCell,
            detailsCell
        );

        candidateTableBody.appendChild(row);
    });
}

function addOverviewCard(label, value) {
    const card = document.createElement("div");
    card.className = "overview-card";

    const number = document.createElement("strong");
    number.textContent = String(value);

    const caption = document.createElement("span");
    caption.textContent = label;

    card.append(number, caption);
    resultsOverview.appendChild(card);
}

function getScore(result) {
    const value = Number(result.overall_score);
    return Number.isFinite(value) ? value : 0;
}

function getRequiredSkillSummary(result) {
    const analysis = result.skill_analysis || {};
    const matched = analysis.matched_required || [];
    const related = analysis.related_required || [];
    const missing = analysis.missing_required || [];

    if (!matched.length && !related.length && !missing.length) {
        return "See details";
    }

    const supported = matched.length + related.length;
    const relatedLabel = related.length ? ` · ${related.length} related` : "";
    return `${supported} supported${relatedLabel} · ${missing.length} missing`;
}

function getExperienceSummary(result) {
    const analysis = result.experience_analysis || {};

    const actual = analysis.candidate_years;
    const required = analysis.required_years;

    if (actual == null && required == null) {
        return "See details";
    }

    return `${actual ?? "?"} / ${required ?? "?"} years`;
}


// ------------------------------
// CANDIDATE DETAIL VIEW
// ------------------------------

function showCandidateDetails(candidate) {
    const result = candidate.result;

    detailCandidateName.textContent = candidate.candidateName;
    const contact = candidate.contactDetails ||
        getCandidateDetails(candidate.profile || {});

    addDetailSection("Candidate contact details", [
        `Name: ${contact.name}`,
        `Email: ${contact.email}`,
        `Phone: ${contact.phone}`,
        `Location: ${contact.location}`
    ]);
    detailCandidateFile.textContent = candidate.filename;
    candidateDetailContent.replaceChildren();

    addDetailSection("Overall ATS score", [
        `${getScore(result)}%`
    ]);

    if (result.score_note) {
        addDetailSection("How to interpret this score", [result.score_note]);
    }
    if (result.role_alignment && !result.role_alignment.aligned) {
        addDetailSection("Role alignment warning", [result.role_alignment.reason]);
    }

    const breakdown = result.score_breakdown;

    if (breakdown && typeof breakdown === "object") {
        const lines = Object.entries(breakdown).map(
            ([key, value]) => `${formatLabel(key)}: ${formatValue(value)}`
        );
        addDetailSection("Score breakdown", lines);
    }

    const skills = result.skill_analysis || {};
    const semanticStatus = skills.semantic_matching || {};
    if (semanticStatus.status === "unavailable") {
        addDetailSection(
            "Semantic skill analysis",
            [semanticStatus.message || "LLM-based skill analysis was unavailable; only direct skill matches were scored."]
        );
    } else if (semanticStatus.status === "complete") {
        addDetailSection(
            "Semantic skill analysis",
            [`Related skills were reviewed by ${semanticStatus.model || "the configured AI model"}. Related evidence receives partial credit and is not treated as proof of proficiency.`]
        );
    }

    addDetailSection(
        "Matched required skills",
        toDisplayList(skills.matched_required),
        "No matched required skills were reported."
    );

    addDetailSection(
        "Related required skills (partial evidence)",
        toDisplayList(skills.related_required),
        "No related required skills were inferred from the resume."
    );

    addDetailSection(
        "Missing required skills",
        toDisplayList(skills.missing_required),
        "No missing required skills were reported."
    );

    addDetailSection(
        "Matched preferred skills",
        toDisplayList(skills.matched_preferred),
        "No matched preferred skills were reported."
    );

    addDetailSection(
        "Related preferred skills (partial evidence)",
        toDisplayList(skills.related_preferred),
        "No related preferred skills were inferred from the resume."
    );

    addDetailSection(
        "Missing preferred skills",
        toDisplayList(skills.missing_preferred),
        "No missing preferred skills were reported."
    );

    addAnalysisSection("Experience analysis", result.experience_analysis);
    addAnalysisSection("Education analysis", result.education_analysis);

    addDetailSection(
        "Strengths",
        toDisplayList(result.strengths),
        "No strengths were returned."
    );

    addDetailSection(
        "Gaps to review",
        toDisplayList(result.gaps),
        "No gaps were returned."
    );

    addDetailSection(
        "Critical gaps",
        toDisplayList(result.critical_gaps),
        "No critical gaps were reported."
    );

    // Keep the original extraction-verification feature.
    resultFileName.textContent = candidate.filename;
    wordCount.textContent = String(candidate.words);
    characterCount.textContent = String(candidate.chars);
    resumeText.textContent = candidate.extractedText;
    extractionSection.classList.remove("hidden");

    candidateDetail.classList.remove("hidden");
    candidateDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addAnalysisSection(title, analysis) {
    if (!analysis || typeof analysis !== "object") {
        addDetailSection(title, [], "No analysis was returned.");
        return;
    }

    const lines = Object.entries(analysis).map(
        ([key, value]) => `${formatLabel(key)}: ${formatValue(value)}`
    );

    addDetailSection(title, lines, "No analysis was returned.");
}

function addDetailSection(title, lines, emptyMessage = "No data returned.") {
    const section = document.createElement("section");
    section.className = "detail-section";

    const heading = document.createElement("h4");
    heading.textContent = title;

    const list = document.createElement("ul");

    const values = lines && lines.length ? lines : [emptyMessage];

    values.forEach(value => {
        const item = document.createElement("li");
        item.textContent = value;
        list.appendChild(item);
    });

    section.append(heading, list);
    candidateDetailContent.appendChild(section);
}

function toDisplayList(items) {
    if (!Array.isArray(items)) return [];

    return items.map(item => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
            const name = item.name || item.skill || item.title || "";
            const evidence = item.evidence || item.reason || "";

            if (item.match_type === "related") {
                const credit = Math.round(Number(item.score_credit || 0) * 100);
                const sourceEvidence = item.resume_evidence
                    ? `Resume evidence: ${item.resume_evidence}`
                    : "";
                const support = item.support ? `${item.support} relationship` : "related evidence";
                return [`Related (partial, ${support}, ${credit}% credit): ${name}`, `Based on ${item.resume_skill}`, evidence, sourceEvidence]
                    .filter(Boolean)
                    .join(" — ");
            }

            return [name, evidence].filter(Boolean).join(" — ") ||
                JSON.stringify(item);
        }

        return String(item);
    });
}

function formatLabel(key) {
    return key
        .replaceAll("_", " ")
        .replace(/\b\w/g, character => character.toUpperCase());
}

function formatValue(value) {
    if (value === null || value === undefined || value === "") {
        return "Not available";
    }

    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === "object" && item !== null) {
                return JSON.stringify(item);
            }
            return String(item);
        }).join(", ") || "None";
    }

    if (typeof value === "object") {
        return Object.entries(value)
            .map(([key, item]) => `${formatLabel(key)}: ${formatValue(item)}`)
            .join("; ");
    }

    return String(value);
}

function showCandidateError(candidate) {
    candidateDetailContent.replaceChildren();

    detailCandidateName.textContent = candidate.filename;
    detailCandidateFile.textContent = "Analysis failed";

    addDetailSection(
        "Error",
        [candidate.error || "Unknown error"]
    );

    candidateDetail.classList.remove("hidden");
    candidateDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

closeDetailButton.addEventListener("click", () => {
    candidateDetail.classList.add("hidden");
});


// ------------------------------
// CSV EXPORT
// ------------------------------

exportButton.addEventListener("click", exportResultsCSV);

function exportResultsCSV() {
    if (candidateResults.length === 0) {
        showError("There are no results to export.");
        return;
    }

    const headers = [
        "Rank",
        "Candidate",
        "Email",
        "Phone",
        "Location",
        "Filename",
        "ATS Score",
        "Matched Required Skills",
        "Missing Required Skills",
        "Matched Preferred Skills",
        "Missing Preferred Skills",
        "Experience Analysis",
        "Education Analysis",
        "Status",
        "Error"
    ];

    const rows = candidateResults.map((candidate, index) => {
        const result = candidate.result || {};
        const skills = result.skill_analysis || {};
        const contact = candidate.contactDetails ||
            getCandidateDetails(candidate.profile || {});
        return [
            candidate.result ? index + 1 : "",
            candidate.candidateName,
            contact.email,
            contact.phone,
            contact.location,
            candidate.filename,
            candidate.result ? getScore(result) : "",
            toDisplayList(skills.matched_required).join("; "),
            toDisplayList(skills.missing_required).join("; "),
            toDisplayList(skills.matched_preferred).join("; "),
            toDisplayList(skills.missing_preferred).join("; "),
            formatValue(result.experience_analysis),
            formatValue(result.education_analysis),
            candidate.result ? "Analyzed" : "Failed",
            candidate.error || ""
        ];
    });

    const csv = [headers, ...rows]
        .map(row => row.map(escapeCSV).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "hiremind_candidate_results.csv";
    link.click();

    URL.revokeObjectURL(url);
}

function escapeCSV(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
}


// ------------------------------
// COPY EXTRACTED TEXT
// ------------------------------

copyButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(resumeText.textContent);
        copyButton.textContent = "Copied!";
        setTimeout(() => {
            copyButton.textContent = "Copy";
        }, 1500);
    } catch {
        showError("Could not copy the text. Check browser clipboard permissions.");
    }
});


// ------------------------------
// ERROR HANDLING
// ------------------------------

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
}

function hideError() {
    errorMessage.classList.add("hidden");
}


// Initial state
renderFileList();
updateAnalyzeButton();
