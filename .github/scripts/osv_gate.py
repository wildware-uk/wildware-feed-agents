#!/usr/bin/env python3
"""Reads OSV-Scanner's JSON report and decides whether the build fails.

It fails when a dependency has a known HIGH or CRITICAL advisory that a newer release fixes:
those are the ones we can and should act on now. Everything else (lower severity, or no fix
yet) is listed but does not fail the build.

Usage: osv_gate.py REPORT.json
Writes a markdown table to $GITHUB_STEP_SUMMARY when that is set.
"""
import json
import os
import sys

SERIOUS = {"HIGH", "CRITICAL"}


def severity(vuln, group):
    """The advisory's own label when it has one (GitHub's), else one from the CVSS score."""
    label = (vuln.get("database_specific") or {}).get("severity")
    if isinstance(label, str) and label.upper() in {"LOW", "MODERATE", "MEDIUM", "HIGH", "CRITICAL"}:
        return "MEDIUM" if label.upper() == "MODERATE" else label.upper()
    try:
        score = float(group.get("max_severity") or "")
    except ValueError:
        return "UNKNOWN"
    if score >= 9.0:
        return "CRITICAL"
    if score >= 7.0:
        return "HIGH"
    if score >= 4.0:
        return "MEDIUM"
    return "LOW" if score > 0 else "UNKNOWN"


def fixed_in(vuln, name):
    """The versions that fix this advisory for this package, if any."""
    fixes = []
    for affected in vuln.get("affected", []):
        if (affected.get("package") or {}).get("name") != name:
            continue
        for r in affected.get("ranges", []):
            fixes += [e["fixed"] for e in r.get("events", []) if "fixed" in e]
    return fixes


def rows(report):
    for result in report.get("results", []):
        source = result.get("source", {}).get("path", "?")
        for pkg in result.get("packages", []):
            info = pkg["package"]
            vulns = {v["id"]: v for v in pkg.get("vulnerabilities", [])}
            for group in pkg.get("groups", []):
                # A group is one problem under several ids; report it once, by its first id.
                ids = group.get("ids") or []
                vuln = next((vulns[i] for i in ids if i in vulns), None)
                if vuln is None:
                    continue
                fixes = fixed_in(vuln, info["name"])
                yield {
                    "id": ids[0],
                    "severity": severity(vuln, group),
                    "package": f'{info["ecosystem"]} {info["name"]} {info["version"]}',
                    "fix": ", ".join(sorted(set(fixes))) or "none yet",
                    "fixable": bool(fixes),
                    "source": os.path.relpath(source) if os.path.isabs(source) else source,
                    "summary": (vuln.get("summary") or "").replace("|", "/")[:100],
                }


def main():
    with open(sys.argv[1]) as f:
        report = json.load(f)
    found = sorted(rows(report), key=lambda r: (r["severity"] not in SERIOUS, r["source"], r["package"]))
    blocking = [r for r in found if r["severity"] in SERIOUS and r["fixable"]]

    lines = [f"### Dependency advisories: {len(found)} found, {len(blocking)} must be fixed", ""]
    if found:
        lines += ["| Blocks | Severity | Advisory | Package | Fixed in | Lockfile | Summary |",
                  "|---|---|---|---|---|---|---|"]
        for r in found:
            block = "yes" if r in blocking else ""
            lines.append(f'| {block} | {r["severity"]} | [{r["id"]}](https://osv.dev/{r["id"]}) | '
                         f'{r["package"]} | {r["fix"]} | {r["source"]} | {r["summary"]} |')
    text = "\n".join(lines) + "\n"
    print(text)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write(text)

    if blocking:
        print(f"::error::{len(blocking)} HIGH or CRITICAL advisories have a fix: upgrade those packages.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
