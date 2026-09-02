"""D:\\wechat 的迁移后管理入口。

本阶段只负责检查工作区和列出历史可复用产物；公众号动作仍由后续显式命令触发。
"""
import argparse
import json
import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from config import ROOT, SKILL_DIR, ensure_layout  # noqa: E402
from paths import LATEST_RUN, validate_legacy_snapshot  # noqa: E402


def list_outputs() -> list[dict[str, object]]:
    result = []
    for path in sorted(LATEST_RUN.glob("富格式/rich_*_body.html")):
        result.append({"name": path.name, "size": path.stat().st_size})
    return result


def check() -> int:
    ensure_layout()
    missing = validate_legacy_snapshot()
    required = [SKILL_DIR / "SKILL.md", LATEST_RUN / "富格式/manifest.json"]
    missing.extend(str(p) for p in required if not p.exists())
    if missing:
        print("CHECK FAILED")
        print("\n".join(missing))
        return 1
    outputs = list_outputs()
    print(f"ROOT: {ROOT}")
    print(f"SKILL: {SKILL_DIR}")
    print(f"LEGACY RUN: {LATEST_RUN}")
    print(f"RICH BODY FILES: {len(outputs)}")
    print("CHECK OK")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="微信公众号工作区管理入口")
    parser.add_argument("--check", action="store_true", help="检查迁移目录和关键产物")
    parser.add_argument("--list", action="store_true", help="列出历史富格式正文")
    args = parser.parse_args()
    if args.list:
        ensure_layout()
        print(json.dumps(list_outputs(), ensure_ascii=False, indent=2))
        return 0
    return check()


if __name__ == "__main__":
    raise SystemExit(main())
