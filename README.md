# AROHAN

AROHAN is an initiative by Heema Jetty: a hackathon dashboard designed to help organizers conduct challenges and showcase a leaderboard. It brings participants, scores, challenge timing, and project submissions together in one place.

## Features

- Challenge dashboard with event details, rules, team count, and a two-hour countdown.
- Organizer controls to start, pause, resume, and end the challenge.
- Participant list and team counts loaded from an Excel spreadsheet.
- Leaderboard based on two evaluators' scores, with final scores and game points.
- Scoreboard showing evaluation metrics and a comparison of evaluator totals.
- Team submissions for code, documentation, and demo ZIP files, with submission status and upload times.
- Team PIN checks for uploading, replacing, or deleting submissions while the challenge is running.

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn
- **Frontend:** HTML, CSS, JavaScript, Jinja2
- **Data:** Excel, pandas, openpyxl
- **Storage:** Amazon S3, boto3

## Getting Started

### Prerequisites

- Python 3.12
- An Amazon S3 bucket and AWS credentials with access to read the spreadsheets and manage submission objects.
- The following Excel files in the bucket:
  - `data/participants.xlsx`, with a `Team` column.
  - `data/scores.xlsx`, with `Team`, `Metrics`, `Max`, `Evaluator A`, and `Evaluator B` columns.

### Run Locally

1. Create and activate a virtual environment:

	```powershell
	python -m venv venv
	.\venv\Scripts\Activate.ps1
	```

2. Install dependencies:

	```powershell
	pip install -r requirements.txt
	```

3. Configure AWS credentials using the standard AWS credential provider chain, and set your bucket and region:

	```powershell
	$env:S3_BUCKET = "your-bucket-name"
	$env:AWS_REGION = "your-aws-region"
	```

4. Start the app:

	```powershell
	uvicorn app:app --reload
	```

	Open `http://127.0.0.1:8000` in your browser.

## Current Limitations

- The organizer launch code and team PINs are currently hardcoded in the application. Replace this approach before using the app for a public event.
- Challenge timer state is held in memory and resets when the server restarts; it is not shared across multiple server processes.

## Author

Heema Jetty
