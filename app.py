from pathlib import Path

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Template
from excel_service import (
    load_participants,
    load_scores,
    get_participant_count,
    get_team_count,
    calculate_leaderboard,
)
import time
from datetime import datetime
from datetime import datetime, timedelta
import io
import os
import boto3
from zoneinfo import ZoneInfo

ORGANIZER_CODE = "AROHAN2026"
ORGANIZER_CODE = "AROHAN2026"

TEAM_PINS = {
    "Team 1: "XXXX"
}

challenge_status = "not_started"
challenge_start_time = None
challenge_remaining_seconds = 7200
app = FastAPI(title="Arohan")

# ---------------------------------------------------------
# AWS S3 Configuration
# ---------------------------------------------------------

S3_BUCKET = os.getenv(
    "S3_BUCKET",
    "arohan-2026-submissions-hj"
)

AWS_REGION = os.getenv(
    "AWS_REGION",
    "ap-south-1"
)

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION
)

PARTICIPANTS_S3_KEY = "data/participants.xlsx"
SCORES_S3_KEY = "data/scores.xlsx"

# ---------------------------------------------------------
# Competition Timer
# ---------------------------------------------------------

CHALLENGE_DURATION = 2 * 60 * 60  # 2 hours

timer_state = {
    "started": False,
    "start_time": None,
    "end_time": None
}

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"


# ---------------------------------------------------------
# Static files
# ---------------------------------------------------------

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)


# ---------------------------------------------------------
# Excel helpers
# ---------------------------------------------------------

def load_participants():

    response = s3.get_object(
        Bucket=S3_BUCKET,
        Key=PARTICIPANTS_S3_KEY
    )

    file_bytes = response["Body"].read()

    df = pd.read_excel(
        io.BytesIO(file_bytes)
    )

    df = df.dropna(how="all")

    df.columns = [
        str(column).strip()
        for column in df.columns
    ]

    return df


def load_scores():

    response = s3.get_object(
        Bucket=S3_BUCKET,
        Key=SCORES_S3_KEY
    )

    file_bytes = response["Body"].read()

    df = pd.read_excel(
        io.BytesIO(file_bytes)
    )

    df = df.dropna(how="all")

    df.columns = [
        str(column).strip()
        for column in df.columns
    ]

    df = df.where(
        pd.notna(df),
        None
    )

    return df


# ---------------------------------------------------------
# Home page
# ---------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def home():

    participants = load_participants()

    template_file = TEMPLATES_DIR / "index.html"

    template_text = template_file.read_text(
        encoding="utf-8"
    )

    template = Template(template_text)

    html = template.render(
        participant_count=len(participants),
        team_count=participants["Team"].nunique(),
        participants_table=participants.to_html(index=False),
    )

    return HTMLResponse(content=html)


# ---------------------------------------------------------
# Scores API
# ---------------------------------------------------------

@app.get("/scores")
def scores():

    df = load_scores()

    records = df.to_dict(orient="records")

    for record in records:

        for key, value in record.items():

            if pd.isna(value):
                record[key] = None

    return records

@app.get("/leaderboard")
def leaderboard():

    return calculate_leaderboard()

@app.get("/scoreboard")
def scoreboard():

    df = load_scores()

    records = df.to_dict(orient="records")

    for record in records:

        for key, value in record.items():

            if pd.isna(value):
                record[key] = None

    return records

@app.post("/timer/start")
def start_timer():

    # Don't restart an already running challenge
    if timer_state["started"]:
        return {
            "status": "already_started",
            "start_time": timer_state["start_time"],
            "end_time": timer_state["end_time"]
        }

    start_time = time.time()

    end_time = start_time + CHALLENGE_DURATION

    timer_state["started"] = True
    timer_state["start_time"] = start_time
    timer_state["end_time"] = end_time

    return {
        "status": "started",
        "start_time": start_time,
        "end_time": end_time
    }

@app.get("/timer")
def timer():

    global challenge_status
    global challenge_start_time
    global challenge_remaining_seconds

    if challenge_status == "not_started":

        return {
            "status": "not_started",
            "remaining_seconds": 7200
        }

    if challenge_status == "paused":

        return {
            "status": "paused",
            "remaining_seconds": challenge_remaining_seconds
        }

    if challenge_status == "completed":

        return {
            "status": "completed",
            "remaining_seconds": 0
        }

    # RUNNING

    elapsed_seconds = int(
        (datetime.now() - challenge_start_time).total_seconds()
    )

    remaining = max(
        0,
        challenge_remaining_seconds - elapsed_seconds
    )

    if remaining == 0:
        challenge_status = "completed"

        return {
            "status": "completed",
            "remaining_seconds": 0
        }

    return {
        "status": "running",
        "remaining_seconds": remaining
    }

# ---------------------------------------------------------
# S3 Submission Tracker
# ---------------------------------------------------------

ARTIFACT_TYPES = {
    "code",
    "documentation",
    "demo",
}

IST = ZoneInfo("Asia/Kolkata")


def get_valid_teams():

    participants = load_participants()

    return (
        participants["Team"]
        .dropna()
        .astype(str)
        .str.strip()
        .drop_duplicates()
        .tolist()
    )


def get_artifact_prefix(team: str, artifact: str):

    return f"submissions/{team}/{artifact}/"


def get_team_s3_objects(team: str):

    response = s3.list_objects_v2(
        Bucket=S3_BUCKET,
        Prefix=f"submissions/{team}/"
    )

    return {
        item["Key"]: item
        for item in response.get("Contents", [])
    }


def is_challenge_running():

    global challenge_status
    global challenge_start_time
    global challenge_remaining_seconds

    if challenge_status != "running":
        return False

    elapsed_seconds = int(
        (datetime.now() - challenge_start_time).total_seconds()
    )

    remaining = max(
        0,
        challenge_remaining_seconds - elapsed_seconds
    )

    if remaining == 0:
        challenge_status = "completed"
        challenge_start_time = None
        challenge_remaining_seconds = 0
        return False

    return True

def validate_team_pin(team: str, team_pin: str):

    expected_pin = TEAM_PINS.get(team)

    if not expected_pin:
        raise HTTPException(
            status_code=400,
            detail="No submission PIN configured for this team."
        )

    if team_pin != expected_pin:
        raise HTTPException(
            status_code=403,
            detail="Invalid team submission PIN."
        )
    
# ---------------------------------------------------------
# Submission status
# ---------------------------------------------------------

@app.get("/submissions")
def get_submissions():

    results = []

    for team in get_valid_teams():

        objects = get_team_s3_objects(team)

        submission = {
            "team": team
        }

        for artifact in ARTIFACT_TYPES:

            prefix = get_artifact_prefix(
                team,
                artifact
            )

            artifact_objects = [
                obj
                for key, obj in objects.items()
                if key.startswith(prefix)
                and not key.endswith("/")
            ]

            if artifact_objects:

                obj = artifact_objects[0]

                submission[artifact] = True

                uploaded_at = (
                    obj["LastModified"]
                    .astimezone(IST)
                    .strftime("%I:%M %p")
                )

                submission[
                    f"{artifact}_uploaded_at"
                ] = uploaded_at

            else:

                submission[artifact] = False

                submission[
                    f"{artifact}_uploaded_at"
                ] = None

        results.append(submission)

    return results


# ---------------------------------------------------------
# Uploaded filenames
# ---------------------------------------------------------

@app.get("/uploads")
def get_uploads():

    results = []

    for team in get_valid_teams():

        objects = get_team_s3_objects(team)

        team_files = {
            "team": team,
            "code_file": None,
            "documentation_file": None,
            "demo_file": None
        }

        for artifact in ARTIFACT_TYPES:

            prefix = get_artifact_prefix(
                team,
                artifact
            )

            matching_keys = [
                key
                for key in objects.keys()
                if key.startswith(prefix)
                and not key.endswith("/")
            ]

            if matching_keys:

                key = matching_keys[0]

                actual_filename = key.rsplit(
                    "/",
                    1
                )[-1]

                team_files[
                    f"{artifact}_file"
                ] = actual_filename

        results.append(team_files)

    return results


# ---------------------------------------------------------
# Upload artifact to S3
# ---------------------------------------------------------

@app.post("/upload/{team}/{artifact}")
async def upload_artifact(
    team: str,
    artifact: str,
    file: UploadFile = File(...),
    x_team_pin: str = Header(...)
):
    if not is_challenge_running():
        raise HTTPException(
            status_code=403,
            detail="Submissions are allowed only while the challenge is running."
    )

    if artifact not in ARTIFACT_TYPES:

        raise HTTPException(
            status_code=400,
            detail="Invalid artifact type"
        )

    valid_teams = get_valid_teams()

    if team not in valid_teams:

        raise HTTPException(
            status_code=400,
            detail="Invalid team"
        )

    validate_team_pin(
        team,
        x_team_pin
    )
    uploaded_filename = (
        file.filename or ""
    ).replace("\\", "/").split("/")[-1].strip()

    if not uploaded_filename:

        raise HTTPException(
            status_code=400,
            detail="Invalid filename"
        )

    if not uploaded_filename.lower().endswith(".zip"):

        raise HTTPException(
            status_code=400,
            detail="Only ZIP files are allowed"
        )

    prefix = get_artifact_prefix(
        team,
        artifact
    )

    # Remove any previous file for this artifact.
    # This makes Replace behave correctly even if
    # the new ZIP has a different filename.
    existing = s3.list_objects_v2(
        Bucket=S3_BUCKET,
        Prefix=prefix
    )

    for obj in existing.get("Contents", []):

        s3.delete_object(
            Bucket=S3_BUCKET,
            Key=obj["Key"]
        )

    key = (
        f"{prefix}"
        f"{uploaded_filename}"
    )

    s3.upload_fileobj(
        file.file,
        S3_BUCKET,
        key,
        ExtraArgs={
            "ContentType": "application/zip"
        }
    )

    return {
        "status": "uploaded",
        "filename": uploaded_filename
    }


# ---------------------------------------------------------
# Delete artifact from S3
# ---------------------------------------------------------

@app.delete("/upload/{team}/{artifact}")
def delete_artifact(
    team: str,
    artifact: str,
    x_team_pin: str = Header(...)
):
    if not is_challenge_running():
        raise HTTPException(
            status_code=403,
            detail="Submissions are allowed only while the challenge is running."
    )

    if artifact not in ARTIFACT_TYPES:

        raise HTTPException(
            status_code=400,
            detail="Invalid artifact type"
        )

    if team not in get_valid_teams():

        raise HTTPException(
            status_code=400,
            detail="Invalid team"
        )

    validate_team_pin(
        team,
        x_team_pin
    )

    prefix = get_artifact_prefix(
        team,
        artifact
    )

    existing = s3.list_objects_v2(
        Bucket=S3_BUCKET,
        Prefix=prefix
    )

    for obj in existing.get("Contents", []):

        s3.delete_object(
            Bucket=S3_BUCKET,
            Key=obj["Key"]
        )

    return {
        "status": "deleted"
    }


@app.post("/start-challenge")
def start_challenge(payload: dict):

    global challenge_status
    global challenge_start_time
    global challenge_remaining_seconds

    if payload.get("code") != ORGANIZER_CODE:
        raise HTTPException(
            status_code=401,
            detail="Invalid launch code"
        )

    if challenge_status == "running":
        return {
            "status": "already_started"
        }

    challenge_status = "running"
    challenge_remaining_seconds = 7200
    challenge_start_time = datetime.now()

    return {
        "status": "started",
        "remaining_seconds": challenge_remaining_seconds
    }

@app.post("/pause-challenge")
def pause_challenge(payload: dict):

    global challenge_status
    global challenge_start_time
    global challenge_remaining_seconds

    if payload.get("code") != ORGANIZER_CODE:
        raise HTTPException(
            status_code=401,
            detail="Invalid launch code"
        )

    if challenge_status != "running":
        return {
            "status": challenge_status
        }

    elapsed_seconds = int(
        (datetime.now() - challenge_start_time).total_seconds()
    )

    challenge_remaining_seconds = max(
        0,
        challenge_remaining_seconds - elapsed_seconds
    )

    challenge_status = "paused"
    challenge_start_time = None

    return {
        "status": "paused",
        "remaining_seconds": challenge_remaining_seconds
    }

@app.post("/resume-challenge")
def resume_challenge(payload: dict):

    global challenge_status
    global challenge_start_time
    global challenge_remaining_seconds

    if payload.get("code") != ORGANIZER_CODE:
        raise HTTPException(
            status_code=401,
            detail="Invalid launch code"
        )

    if challenge_status != "paused":
        return {
            "status": challenge_status
        }

    challenge_status = "running"
    challenge_start_time = datetime.now()

    return {
        "status": "running",
        "remaining_seconds": challenge_remaining_seconds
    }

@app.post("/end-challenge")
def end_challenge(payload: dict):

    global challenge_status
    global challenge_start_time
    global challenge_remaining_seconds

    if payload.get("code") != ORGANIZER_CODE:
        raise HTTPException(
            status_code=401,
            detail="Invalid launch code"
        )

    challenge_status = "completed"
    challenge_start_time = None
    challenge_remaining_seconds = 0

    return {
        "status": "completed",
        "remaining_seconds": 0
    }