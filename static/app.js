function showTab(tabName) {
    console.log("SHOW TAB:", tabName);
    // Hide all tab content
    const sections = document.querySelectorAll(".tab-content");

    sections.forEach(section => {
        section.classList.remove("active");
    });


    // Remove active state from buttons
    const buttons = document.querySelectorAll(".tab");

    buttons.forEach(button => {
        button.classList.remove("active");
    });


    // Show selected section
    const selectedSection = document.getElementById(tabName);

    if (selectedSection) {
        selectedSection.classList.add("active");
    }


    // Highlight selected button
    buttons.forEach(button => {

        if (button.getAttribute("onclick") === `showTab('${tabName}')`) {
            button.classList.add("active");
        }

    });


    // Load leaderboard whenever the tab is opened
    if (tabName === "leaderboard") {
        loadLeaderboard();
    }
    if (tabName === "scores") {
        loadScoreBoard();
    }
    if (tabName === "submissions") {
        console.log("SUBMISSIONS TAB CLICKED");
        loadSubmissions();
    }
}


// ---------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------

async function loadLeaderboard() {

    const container = document.getElementById("leaderboard-data");

    if (!container) {
        return;
    }

    container.innerHTML = "<p>Loading leaderboard...</p>";

    try {

        const response = await fetch("/leaderboard");

        if (!response.ok) {
            throw new Error("Unable to load leaderboard");
        }

        const teams = await response.json();

        renderLeaderboard(teams);

    } catch (error) {

        console.error("Leaderboard error:", error);

        container.innerHTML =
            "<p>Unable to load leaderboard.</p>";
    }
}


// ---------------------------------------------------------
// Render Leaderboard
// ---------------------------------------------------------

function renderLeaderboard(teams) {

    const container = document.getElementById("leaderboard-data");

    if (!teams || teams.length === 0) {

        container.innerHTML =
            "<p>No leaderboard data available.</p>";

        return;
    }


    let html = `
        <div class="leaderboard-table">

            <table>

                <thead>

                    <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>Evaluator A</th>
                        <th>Evaluator B</th>
                        <th>Final Score</th>
                        <th>🎮 Game Points</th>
                    </tr>

                </thead>

                <tbody>
    `;


    teams.forEach(team => {

        let rankDisplay = "—";

        if (team.rank === 1) {
            rankDisplay = "🥇";
        }
        else if (team.rank === 2) {
            rankDisplay = "🥈";
        }
        else if (team.rank === 3) {
            rankDisplay = "🥉";
        }


        html += `
            <tr>

                <td class="rank">
                    ${rankDisplay}
                </td>

                <td>
                    <strong>${team.team}</strong>
                </td>

                <td>
                    ${team.judge_a}
                </td>

                <td>
                    ${team.judge_b}
                </td>

                <td>
                    <strong>${team.final_score}</strong>
                </td>

                <td class="game-points">
                    <strong>${team.game_points}</strong>
                </td>

            </tr>
        `;

    });


    html += `
                </tbody>

            </table>

        </div>
    `;


    container.innerHTML = html;
}

// ---------------------------------------------------------
// Score Board
// ---------------------------------------------------------

async function loadScoreBoard() {

    const container = document.getElementById("scoreboard-data");

    if (!container) {
        return;
    }

    container.innerHTML = "<p>Loading scores...</p>";

    try {

        const response = await fetch("/scoreboard");

        if (!response.ok) {
            throw new Error("Unable to load scores");
        }

        const scores = await response.json();

        renderScoreBoard(scores);

    } catch (error) {

        console.error("Score Board error:", error);

        container.innerHTML =
            "<p>Unable to load scores.</p>";
    }
}


// ---------------------------------------------------------
// Render Score Board
// ---------------------------------------------------------

function renderScoreBoard(scores) {

    const container =
        document.getElementById("scoreboard-data");

    if (!scores || scores.length === 0) {

        container.innerHTML =
            "<p>No scores available.</p>";

        return;
    }


    // Get unique teams
    const teams = [
        ...new Set(
            scores.map(item => item.Team)
        )
    ];


    let html = "";


    teams.forEach(team => {

        const teamScores =
            scores.filter(
                item => item.Team === team
            );


        let judgeATotal = 0;
        let judgeBTotal = 0;


        teamScores.forEach(item => {

            judgeATotal +=
                Number(item["Evaluator A"] || 0);

            judgeBTotal +=
                Number(item["Evaluator B"] || 0);

        });


        const finalScore =
            (judgeATotal + judgeBTotal) / 2;

        const gamePoints =
            finalScore * 10;


        html += `

            <div class="score-team">

                <h3>${team}</h3>


                <div class="judge-grid">

                    <!-- Evaluator A -->

                    <div class="judge-card">

                        <h3>👨‍⚖️ Evaluator A</h3>

                        ${renderJudgeMetrics(
                            teamScores,
                            "Evaluator A"
                        )}

                        <div class="judge-total">

                            TOTAL

                            <strong>
                                ${judgeATotal} / 120
                            </strong>

                        </div>

                    </div>


                    <!-- Evaluator B -->

                    <div class="judge-card">

                        <h3>👩‍⚖️ Evaluator B</h3>

                        ${renderJudgeMetrics(
                            teamScores,
                            "Evaluator B"
                        )}

                        <div class="judge-total">

                            TOTAL

                            <strong>
                                ${judgeBTotal} / 120
                            </strong>

                        </div>

                    </div>

                </div>


                <!-- Comparison -->

                <div class="comparison-card">

                    <h3>⚖️ Evaluator Comparison</h3>

                    <div class="comparison-values">

                        <div>
                            <span>Evaluator A</span>
                            <strong>
                                ${judgeATotal}
                            </strong>
                        </div>

                        <div>
                            <span>Evaluator B</span>
                            <strong>
                                ${judgeBTotal}
                            </strong>
                        </div>

                        <div>
                            <span>Final Score</span>
                            <strong>
                                ${finalScore}
                            </strong>
                        </div>

                        <div>
                            <span>🎮 Game Points</span>
                            <strong>
                                ${gamePoints}
                            </strong>
                        </div>

                    </div>

                </div>

            </div>

        `;

    });


    container.innerHTML = html;
}


// ---------------------------------------------------------
// Judge Metrics
// ---------------------------------------------------------

function renderJudgeMetrics(
    teamScores,
    judge
) {

    let html = `
        <div class="metric-list">
    `;


    teamScores.forEach(item => {

        const score =
            item[judge];

        const max =
            item["Max"];


        const displayScore =
            score === null
                ? "—"
                : score;


        html += `

            <div class="metric-row">

                <span>
                    ${item["Metrics"]}
                </span>

                <strong>
                    ${displayScore} / ${max}
                </strong>

            </div>

        `;

    });


    html += `
        </div>
    `;


    return html;
}

// ---------------------------------------------------------
// Competition Timer
// ---------------------------------------------------------

let timerInterval = null;
let challengeIsRunning = false;
let organizerCode = "";

function setSubmissionControlsEnabled(enabled) {

    document
        .querySelectorAll("#submission-data input[type='file']")
        .forEach(input => {
            input.disabled = !enabled;
        });

    document
        .querySelectorAll(
            "#submission-data .upload-btn, #submission-data .replace-btn"
        )
        .forEach(label => {
            label.style.pointerEvents = enabled ? "auto" : "none";
            label.style.opacity = enabled ? "1" : "0.45";
        });

    document
        .querySelectorAll("#submission-data .delete-btn")
        .forEach(button => {
            button.disabled = !enabled;
            button.style.opacity = enabled ? "1" : "0.45";
        });
}

async function startChallenge() {

    const code = document.getElementById("launch-code").value;

    if (!code) {
        alert("Please enter Organizer Launch Code.");
        return;
    }

    const response = await fetch("/start-challenge", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ code })
    });

    const result = await response.json();

    if (response.ok && result.status === "started") {

        organizerCode = code;

        closeOrganizerPanel();
        startTimerPolling();

    }
    else if (response.ok && result.status === "already_started") {

        alert("⚠️ Challenge is already running.");
        closeOrganizerPanel();
        startTimerPolling();

    }
    else if (response.status === 401) {

        alert("❌ Invalid Launch Code");

    }
    else {

        alert("Unable to start challenge.");

    }
}

async function pauseChallenge() {

    const input = document.getElementById("launch-code");
    const code = organizerCode || input.value.trim();

    if (!code) {
        alert("Please enter Organizer Launch Code.");
        return;
    }

    try {

        const response = await fetch("/pause-challenge", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (response.ok && result.status === "paused") {

            alert("⏸ Challenge Paused");

            closeOrganizerPanel();

            updateTimer();

        }
        else if (response.status === 401) {

            alert("❌ Invalid Launch Code");

        }
        else {

            alert("Unable to pause challenge.");

        }

    }
    catch (error) {

        console.error("Pause challenge error:", error);
        alert("Unable to pause challenge.");

    }
}

// ---------------------------------------------------------
// Poll server timer
// ---------------------------------------------------------

function startTimerPolling() {

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    updateTimer();

    timerInterval = setInterval(
        updateTimer,
        1000
    );
}


// ---------------------------------------------------------
// Get timer state
// ---------------------------------------------------------

async function updateTimer() {

    try {

        const response =
            await fetch("/timer");

        const data =
            await response.json();


        updateTimerDisplay(data);


    } catch (error) {

        console.error(
            "Unable to get timer:",
            error
        );

    }
}


// ---------------------------------------------------------
// Update timer UI
// ---------------------------------------------------------

function updateTimerDisplay(data) {

    const timer =
        document.getElementById("timer");

    const status =
        document.getElementById("timer-status");

    const button =
        document.getElementById("start-timer-button");

    const submissionBadge =
        document.getElementById("submission-status-badge");

    const heroStatus =
        document.getElementById("challenge-hero-status");

    if (!timer || !status) {
        return;
    }


    let seconds =
        Math.max(
            0,
            Math.floor(
                data.remaining_seconds
            )
        );


    const hours =
        Math.floor(seconds / 3600);

    seconds %= 3600;

    const minutes =
        Math.floor(seconds / 60);

    seconds %= 60;


    timer.innerText =
        String(hours).padStart(2, "0")
        + ":"
        + String(minutes).padStart(2, "0")
        + ":"
        + String(seconds).padStart(2, "0");

    challengeIsRunning = data.status === "running";

     setSubmissionControlsEnabled(
        challengeIsRunning
    );

    if (heroStatus) {

        heroStatus.classList.remove(
            "upcoming",
            "live",
            "paused",
            "closed"
        );

        if (data.status === "running") {
            heroStatus.innerText = "🟢 LIVE NOW";
            heroStatus.classList.add("live");
        }
        else if (data.status === "paused") {
            heroStatus.innerText = "🟡 PAUSED";
            heroStatus.classList.add("paused");
        }
        else if (data.status === "completed") {
            heroStatus.innerText = "🔴 CLOSED";
            heroStatus.classList.add("closed");
        }
        else {
            heroStatus.innerText = "⚪ UPCOMING";
            heroStatus.classList.add("upcoming");
        }
    }

    if (data.status === "not_started") {

        status.innerText =
            "⚪ NOT STARTED";

        if (button) {
            button.disabled = false;
            button.innerText =
                "▶ START CHALLENGE";
        }

    }
    else if (data.status === "running") {

        status.innerText =
            "🟢 LIVE";

        if (button) {
            button.disabled = true;
            button.innerText =
                "▶ CHALLENGE IN PROGRESS";
        }

    }
    else if (data.status === "paused") {

        status.innerText = "🟡 PAUSED";

        if (button) {
            button.disabled = true;
            button.innerText = "⏸ CHALLENGE PAUSED";
        }

    }
    else if (data.status === "completed") {

        status.innerText =
            "🔴 CHALLENGE CLOSED";

        timer.innerText =
            "00:00:00";

        if (button) {
            button.disabled = true;
            button.innerText =
                "🔴 CHALLENGE CLOSED";
        }

        if (timerInterval) {
            clearInterval(timerInterval);
        }
    }
    if (submissionBadge) {

    if (data.status === "running") {
        submissionBadge.innerText = "LIVE SUBMISSIONS";
    }
    else if (data.status === "paused") {
        submissionBadge.innerText = "SUBMISSIONS PAUSED";
    }
    else if (data.status === "completed") {
        submissionBadge.innerText = "SUBMISSIONS CLOSED";
    }
    else {
        submissionBadge.innerText = "SUBMISSIONS NOT OPEN";
    }
}
}

function applyParticipantTeamColors() {

    const table = document.querySelector("#participants table");

    if (!table) {
        return;
    }

    const headers = Array.from(
        table.querySelectorAll("thead th")
    );

    const teamColumnIndex = headers.findIndex(
        header => header.textContent.trim() === "Team"
    );

    if (teamColumnIndex === -1) {
        return;
    }

    const teamColors = new Map();
    let nextColor = 1;

    table.querySelectorAll("tbody tr").forEach(row => {

        const cells = row.querySelectorAll("td");

        const teamName =
            cells[teamColumnIndex]?.textContent.trim();

        if (!teamName) {
            return;
        }

        if (!teamColors.has(teamName)) {

            teamColors.set(teamName, nextColor);

            nextColor++;

            if (nextColor > 6) {
                nextColor = 1;
            }
        }

        row.classList.add(
            `participant-team-${teamColors.get(teamName)}`
        );
    });
}

// ---------------------------------------------------------
// Restore timer after page refresh
// ---------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateTimer();
        applyParticipantTeamColors();
        timerInterval = setInterval(
            updateTimer,
            1000
        );
        
    }
);

// =========================
// Submission Tracker V2
// =========================

async function loadSubmissions(){

    const submissionResponse = await fetch(`/submissions?_=${Date.now()}`);
    const submissions = await submissionResponse.json();

    const uploadResponse = await fetch(`/uploads?_=${Date.now()}`);
    const uploads = await uploadResponse.json();

    renderSubmissions(submissions, uploads);
}

function renderSubmissions(teams, uploads){

    const container =
        document.getElementById("submission-data");

    container.innerHTML = "";

    teams.forEach(team=>{

        const uploaded =
            [team.code, team.documentation, team.demo]
            .filter(Boolean).length;

        let status = "NOT SUBMITTED";
        let badge = "pending";

        if(uploaded===3){
            status="COMPLETE";
            badge="complete";
        }
        else if(uploaded>0){
            status="PARTIAL";
            badge="partial";
        }
        // Find uploaded files for this team
        const uploadInfo = uploads.find(u => u.team === team.team) || {};
        const codeTime = team.code_uploaded_at;
        const docTime = team.documentation_uploaded_at;
        const demoTime = team.demo_uploaded_at;
        
        const codeFile = uploadInfo.code_file;
        const docFile = uploadInfo.documentation_file;
        const demoFile = uploadInfo.demo_file;

        const codeClass = codeFile ? "uploaded-box" : "";
        const docClass = docFile ? "uploaded-box" : "";
        const demoClass = demoFile ? "uploaded-box" : "";

        container.innerHTML += `
        <div class="team-card">

            <div class="team-header">

                <h3>${team.team}</h3>

                <span class="status ${badge}">
                    ${status}
                </span>

            </div>

            <div class="upload-grid">

                <div class="upload-box ${codeClass}">

                    <h4>💻 Project Code</h4>

                   <p class="file-name">
                        ${codeFile ? "✅ " + codeFile : "No code uploaded"}
                    </p>

                    ${codeTime
                        ? `<p class="upload-time">🕒 Uploaded at ${codeTime} IST</p>`
                        : ""
                    }

                    <input
                        id="code-${team.team}"
                        type="file"
                        accept=".zip"
                        class="hidden-file-input"
                        onchange="uploadArtifact('${team.team}','code',this.files[0])"
                    >

                    ${codeFile
                        ? `
                            <label class="replace-btn" for="code-${team.team}">
                                🔄 Replace ZIP
                            </label>

                            <button class="delete-btn"
                                    onclick="deleteArtifact('${team.team}','code')">
                                🗑 Delete
                            </button>
                        `
                        : `
                            <label class="upload-btn" for="code-${team.team}">
                                ⬆️ Upload ZIP
                            </label>
                        `
                    }

                </div>

                <div class="upload-box ${docClass}">

                    <h4>📄 Documentation</h4>

                    <p class="file-name">
                        ${docFile ? "✅ " + docFile : "No documentation uploaded"}
                    </p>
                    ${docTime
                        ? `<p class="upload-time">🕒 Uploaded at ${docTime} IST</p>`
                        : ""
                    }
                    <input
                        id="doc-${team.team}"
                        type="file"
                        accept=".zip"
                        class="hidden-file-input"
                        onchange="uploadArtifact('${team.team}','documentation',this.files[0])"
                    >

                    ${docFile
                        ? `
                            <label class="replace-btn" for="doc-${team.team}">
                                🔄 Replace Docs
                            </label>

                            <button class="delete-btn"
                                    onclick="deleteArtifact('${team.team}','documentation')">
                                🗑 Delete
                            </button>
                        `
                        : `
                            <label class="upload-btn" for="doc-${team.team}">
                                ⬆️ Upload Docs
                            </label>
                        `
                    }

                </div>

                <div class="upload-box ${demoClass}">

                    <h4>🎥 Demo Recording</h4>

                    <p class="file-name">
                        ${demoFile ? "✅ " + demoFile : "No demo uploaded"}
                    </p>
                    ${demoTime
                        ? `<p class="upload-time">🕒 Uploaded at ${demoTime} IST</p>`
                        : ""
                    }
                    <input
                        id="demo-${team.team}"
                        type="file"
                        accept=".zip"
                        class="hidden-file-input"
                        onchange="uploadArtifact('${team.team}','demo',this.files[0])"
                    >

                    ${demoFile
                        ? `
                            <label class="replace-btn" for="demo-${team.team}">
                                🔄 Replace Demo
                            </label>

                            <button class="delete-btn"
                                    onclick="deleteArtifact('${team.team}','demo')">
                                🗑 Delete
                            </button>
                        `
                        : `
                            <label class="upload-btn" for="demo-${team.team}">
                                ⬆️ Upload Demo
                            </label>
                        `
                    }

                </div>

            </div>

        </div>
        `;

    });
    setSubmissionControlsEnabled(
        challengeIsRunning
    );

}

async function uploadArtifact(team, artifact, file) {

    if (!file) {
        return;
    }

    const teamPin = prompt(
        `Enter submission PIN for ${team}:`
    );

    if (!teamPin) {
        return;
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
        alert("Only ZIP files are allowed.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
        `/upload/${encodeURIComponent(team)}/${artifact}`,
        {
            method: "POST",
            headers: {
                "X-Team-Pin": teamPin
            },
            body: formData
        }
    );

    if (!response.ok) {
        const error = await response.json();
        alert(error.detail || "Upload failed.");
        return;
    }

    loadSubmissions();
}

async function deleteArtifact(team, artifact) {

    const confirmed = confirm(
        `Delete ${artifact} submission for ${team}?`
    );

    if (!confirmed) {
        return;
    }

    const teamPin = prompt(
        `Enter submission PIN for ${team}:`
    );

    if (!teamPin) {
        return;
    }

    const response = await fetch(
        `/upload/${encodeURIComponent(team)}/${artifact}`,
        {
            method: "DELETE",
            headers: {
                "X-Team-Pin": teamPin
            }
        }
    );

    if (!response.ok) {
        const error = await response.json();
        alert(
            error.detail ||
            "Delete failed."
        );
        return;
    }

    loadSubmissions();
}


// Hidden Organizer Shortcut
document.addEventListener("keydown", function(event){

    if(event.ctrlKey && event.shiftKey && event.key === "A"){
        document.getElementById("organizerModal").style.display = "flex";
    }

});

function closeOrganizerPanel(){
    document.getElementById("organizerModal").style.display = "none";
}

// =====================================
// Hidden Organizer Panel
// =====================================

const arohanLogo = document.getElementById("arohan-logo");

if (arohanLogo) {

    arohanLogo.addEventListener("dblclick", () => {

        document.getElementById("organizerModal").style.display = "flex";

        // Clear previous value every time panel opens
        document.getElementById("launch-code").value = "";

        // Put cursor inside password box
        document.getElementById("launch-code").focus();

    });

}

function togglePassword() {

    const input = document.getElementById("launch-code");

    input.type =
        input.type === "password"
            ? "text"
            : "password";
}

async function resumeChallenge() {

    const input = document.getElementById("launch-code");
    const code = organizerCode || input.value.trim();

    if (!code) {
        alert("Please enter Organizer Launch Code.");
        return;
    }

    try {

        const response = await fetch("/resume-challenge", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (response.ok && result.status === "running") {

            alert("▶ Challenge Resumed");

            closeOrganizerPanel();

            startTimerPolling();

        }
        else if (response.status === 401) {

            alert("❌ Invalid Launch Code");

        }
        else {

            alert("Unable to resume challenge.");

        }

    }
    catch (error) {

        console.error("Resume challenge error:", error);
        alert("Unable to resume challenge.");

    }
}

async function endChallenge() {

    const input = document.getElementById("launch-code");
    const code = organizerCode || input.value.trim();

    if (!code) {
        alert("Please enter Organizer Launch Code.");
        return;
    }

    try {

        const response = await fetch("/end-challenge", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (response.ok && result.status === "completed") {

            alert("⛔ Challenge Ended");

            closeOrganizerPanel();

            updateTimer();

        }
        else if (response.status === 401) {

            alert("❌ Invalid Launch Code");

        }
        else {

            alert("Unable to end challenge.");

        }

    }
    catch (error) {

        console.error("End challenge error:", error);
        alert("Unable to end challenge.");

    }
}

