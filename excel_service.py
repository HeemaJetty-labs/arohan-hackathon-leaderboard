import io
import os
import boto3
import pandas as pd


S3_BUCKET = os.getenv(
    "S3_BUCKET",
    "arohan-2026-submissions-hj"
)

AWS_REGION = os.getenv(
    "AWS_REGION",
    "ap-south-1"
)

PARTICIPANTS_S3_KEY = "data/participants.xlsx"
SCORES_S3_KEY = "data/scores.xlsx"

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION
)


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

    return df


def get_participant_count():

    return len(load_participants())


def get_team_count():

    return load_participants()["Team"].nunique()


def calculate_leaderboard():

    df = load_scores()

    teams = df["Team"].dropna().unique()

    leaderboard = []

    for team in teams:

        team_scores = df[
            df["Team"] == team
        ]

        judge_a_total = (
            pd.to_numeric(
                team_scores["Evaluator A"],
                errors="coerce"
            )
            .fillna(0)
            .sum()
        )

        judge_b_total = (
            pd.to_numeric(
                team_scores["Evaluator B"],
                errors="coerce"
            )
            .fillna(0)
            .sum()
        )

        final_score = (
            judge_a_total + judge_b_total
        ) / 2

        game_points = final_score * 10

        leaderboard.append(
            {
                "team": str(team),
                "judge_a": float(judge_a_total),
                "judge_b": float(judge_b_total),
                "final_score": float(final_score),
                "game_points": float(game_points),
            }
        )


    # Sort highest game points first

    leaderboard.sort(
        key=lambda item: item["game_points"],
        reverse=True
    )


    # Determine whether any scores have been entered

    has_scores = any(
        item["judge_a"] > 0
        or item["judge_b"] > 0
        for item in leaderboard
    )


   # Only teams with scores participate in ranking

    if has_scores:

        scored_teams = [
            item for item in leaderboard
            if item["judge_a"] > 0 or item["judge_b"] > 0
        ]

        unscored_teams = [
            item for item in leaderboard
            if item["judge_a"] == 0 and item["judge_b"] == 0
        ]

        # Rank scored teams
        for index, item in enumerate(
            scored_teams,
            start=1
        ):
            item["rank"] = index

        # Do not rank unscored teams
        for item in unscored_teams:
            item["rank"] = None

    else:

        for item in leaderboard:
            item["rank"] = None


    return leaderboard