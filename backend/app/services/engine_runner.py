import json
import re
import subprocess
from pathlib import Path
from typing import Any

from ..core.config import ENGINE_PATH


def parse_engine_output(stdout_text: str) -> dict[str, Any]:
    patterns = {
        "total_packets": r"Total Packets:\s+(\d+)",
        "forwarded_packets": r"Forwarded:\s+(\d+)",
        "dropped_packets": r"Dropped:\s+(\d+)",
        "tcp_packets": r"TCP Packets:\s+(\d+)",
        "udp_packets": r"UDP Packets:\s+(\d+)",
    }
    summary: dict[str, Any] = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, stdout_text)
        summary[key] = int(match.group(1)) if match else None

    domains: list[dict[str, str]] = []
    capture = False
    for line in stdout_text.splitlines():
        stripped = line.strip()
        if stripped == "[Detected Domains/SNIs]":
            capture = True
            continue
        if capture:
            if not stripped:
                continue
            if stripped.startswith("- "):
                body = stripped[2:]
                if "->" in body:
                    domain, app = [part.strip() for part in body.split("->", 1)]
                    domains.append({"domain": domain, "app": app})
            elif stripped.startswith("["):
                break

    return {
        "summary": summary,
        "domains": domains,
        "rawStdout": stdout_text,
    }


def build_command(
    input_path: Path,
    output_path: Path,
    block_apps: list[str],
    block_domains: list[str],
    block_ips: list[str],
    load_balancers: int,
    fps_per_lb: int,
) -> list[str]:
    command = [
        str(ENGINE_PATH),
        str(input_path),
        str(output_path),
        "--lbs",
        str(load_balancers),
        "--fps",
        str(fps_per_lb),
    ]

    for app in block_apps:
        command.extend(["--block-app", app])
    for domain in block_domains:
        command.extend(["--block-domain", domain])
    for ip in block_ips:
        command.extend(["--block-ip", ip])

    return command


def run_engine(command: list[str], log_path: Path) -> dict[str, Any]:
    if not ENGINE_PATH.exists():
        return {
            "exit_code": 127,
            "stdout": "",
            "stderr": f"Engine executable not found at {ENGINE_PATH}",
            "report": {"summary": {}, "domains": [], "rawStdout": ""},
        }

    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        cwd=ENGINE_PATH.parent,
        shell=False,
    )
    log_path.write_text(
        "\n".join(
            [
                "COMMAND:",
                " ".join(command),
                "",
                "STDOUT:",
                completed.stdout,
                "",
                "STDERR:",
                completed.stderr,
            ]
        ),
        encoding="utf-8",
    )

    return {
        "exit_code": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
        "report": parse_engine_output(completed.stdout),
    }


def save_report(report_path: Path, payload: dict[str, Any]) -> None:
    report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
