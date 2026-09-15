"""
Validation.

Written by hand rather than with a schema library for one reason: the messages
are the product. A rejected contribution should say exactly what to fix, which
generic schema errors do not.
"""
from __future__ import annotations

VERIFICATIONS = {"verified", "in_review", "unverified", "not_reported"}
ORIGINS = {"source-reported", "demo"}


def validate_observation(body: dict, dataset: dict) -> list[str]:
    errors: list[str] = []
    if not isinstance(body, dict):
        return ["Body must be a JSON object"]

    indicators = {i["code"]: i for i in dataset["indicators"]["items"]}
    source_ids = {s["id"] for s in dataset["sources"]["items"]}

    code = body.get("indicator")
    indicator = indicators.get(code)
    if not code:
        errors.append("indicator is required")
    elif indicator is None:
        errors.append(f'Unknown indicator "{code}". Add the definition to data/indicators.json first.')

    year = body.get("year")
    if not isinstance(year, int) or not (2000 <= year <= 2100):
        errors.append("year must be a four-digit number")

    value = body.get("value")
    if value is None:
        if body.get("verification") != "not_reported":
            errors.append('A null value is only valid with verification "not_reported" — '
                          "that records a stated absence rather than a missing row")
    elif not isinstance(value, (int, float)) or isinstance(value, bool):
        errors.append("value must be a number, or null with verification not_reported")
    elif indicator and indicator["normalisation"] == "binary" and value not in (0, 1):
        errors.append(f"{code} is a binary indicator: value must be 0 or 1")
    elif indicator and indicator["normalisation"] == "ordinal" and value not in (0, 50, 100):
        errors.append(f"{code} is ordinal: value must be 0 (not in place), 50 (drafted) or 100 (in force)")

    source_id = body.get("sourceId")
    if not source_id:
        errors.append("sourceId is required — every observation must be attributable")
    elif source_id not in source_ids:
        errors.append(f'Unknown sourceId "{source_id}". Register it in data/sources.json first.')

    if body.get("verification") not in VERIFICATIONS:
        errors.append("verification must be one of: " + ", ".join(sorted(VERIFICATIONS)))

    if body.get("origin") and body["origin"] not in ORIGINS:
        errors.append("origin must be one of: " + ", ".join(sorted(ORIGINS)))

    return errors


def validate_dataset(dataset: dict) -> list[str]:
    """Whole-dataset checks. Used by scripts/validate-data and by CI."""
    errors: list[str] = []
    source_ids = {s["id"] for s in dataset["sources"]["items"]}
    output_ids = {o["id"] for o in dataset["framework"]["outputs"]}
    dim_ids = {d["id"] for d in dataset["framework"]["dimensions"]}
    codes: set[str] = set()

    for i in dataset["indicators"]["items"]:
        if i["code"] in codes:
            errors.append(f"Duplicate indicator code: {i['code']}")
        codes.add(i["code"])
        if i["sourceId"] not in source_ids:
            errors.append(f"{i['code']}: unregistered sourceId \"{i['sourceId']}\"")
        if i["output"] not in output_ids:
            errors.append(f"{i['code']}: unknown output \"{i['output']}\"")
        if i["dimension"] not in dim_ids:
            errors.append(f"{i['code']}: unknown dimension \"{i['dimension']}\"")
        if i["baseline"] == i["target"]:
            errors.append(f"{i['code']}: baseline equals target, so the score can never move")
        if i["normalisation"] == "rank" and not i.get("universe"):
            errors.append(f"{i['code']}: rank normalisation requires a universe")
        if not i.get("definition"):
            errors.append(f"{i['code']}: missing definition — an indicator nobody can explain "
                          "does not belong in the platform")

    for o in dataset["observations"]["items"]:
        ref = f"{o['indicator']}/{o['year']}"
        if o["indicator"] not in codes:
            errors.append(f'Observation references unknown indicator "{o["indicator"]}"')
        if o["sourceId"] not in source_ids:
            errors.append(f"Observation {ref}: unregistered sourceId")
        if o["verification"] not in VERIFICATIONS:
            errors.append(f"Observation {ref}: invalid verification")
        if o.get("origin") not in ORIGINS:
            errors.append(f"Observation {ref}: origin must be source-reported or demo, "
                          "so the dashboard can be candid about which is which")
        if o.get("value") is None and o["verification"] != "not_reported":
            errors.append(f"Observation {ref}: null value without a not_reported flag")

    for gate in (g for lvl in dataset["framework"]["maturityLadder"] for g in lvl["gates"]):
        if gate["indicator"] not in codes:
            errors.append(f'Maturity gate references unknown indicator "{gate["indicator"]}"')

    for s in dataset["sources"]["items"]:
        if not s.get("provenanceClass"):
            errors.append(f"Source {s['id']}: missing provenanceClass")

    return errors
