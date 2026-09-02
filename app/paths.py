"""统一的项目路径和历史成果定位。"""
try:
    from .config import LEGACY, ROOT, SKILL_DIR
except ImportError:  # 允许直接执行 app\run_pipeline.py
    from config import LEGACY, ROOT, SKILL_DIR


LEGACY_WORKBUDDY = LEGACY / "WorkBuddy"
LATEST_RUN = LEGACY_WORKBUDDY / "2026-08-13-23-36-20"
LEGACY_SKILL = LEGACY / "toxic-corporate-truth-teller"


def legacy_script(name: str):
    return LATEST_RUN / name


def skill_asset(name: str):
    return SKILL_DIR / "assets" / name


def validate_legacy_snapshot() -> list[str]:
    missing = []
    for label, path in {
        "legacy WorkBuddy": LEGACY_WORKBUDDY,
        "latest run": LATEST_RUN,
        "legacy skill": LEGACY_SKILL,
    }.items():
        if not path.exists():
            missing.append(f"{label}: {path}")
    return missing
