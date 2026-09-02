from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def test_open_source_project_layout_is_complete():
    required = [
        "skill/agents/openai.yaml",
        "skill/examples/README.md",
        "skill/tests/test_repository.py",
        "skill/tests/test_generators.py",
        "LICENSE",
        "CONTRIBUTING.md",
        ".github/workflows/validate-skill.yml",
    ]
    missing = [path for path in required if not (ROOT / path).is_file()]
    assert missing == []


def test_readme_explains_the_product_and_safe_installation():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for required_text in (
        "# Workplace Truth Teller",
        "毒舌职场真相官",
        "稳定核心",
        "实验自动化",
        "skill/",
        ".codex/skills/toxic-corporate-truth-teller",
        "scripts/gen_wechat_safe.py",
        "不自动发布",
        "github.com/yinnxinn/workplace-truth-teller",
    ):
        assert required_text in readme
    assert "微信公众号内容自动化工作区" not in readme


def test_license_and_contributing_guide_are_public_ready():
    license_text = (ROOT / "LICENSE").read_text(encoding="utf-8")
    contributing = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
    assert "MIT License" in license_text
    assert "Copyright (c) 2026 yinnxinn" in license_text
    for command in ("python -m pytest skill/tests -v", "quick_validate.py", "git diff --check"):
        assert command in contributing


def test_skill_workflow_has_required_runtime_contract():
    workflow = yaml.safe_load(
        (ROOT / ".github/workflows/validate-skill.yml").read_text(encoding="utf-8")
    )
    triggers = workflow.get("on", workflow.get(True))
    assert {"push", "pull_request"}.issubset(triggers)
    job = workflow["jobs"]["test"]
    assert job["runs-on"] == "ubuntu-latest"
    serialized = repr(job["steps"])
    for required in (
        "actions/checkout@v4",
        "actions/setup-python@v5",
        "3.12",
        "actions/setup-node@v4",
        "22",
        "python -m pip install pytest pyyaml",
        "python -m pytest skill/tests -v",
    ):
        assert required in serialized


def test_existing_application_sources_are_preserved():
    for path in (
        "app/run_pipeline.py",
        "app/validate_wechat_html.py",
        "content/sources/置身钉内.md",
        "docs/skill-maintenance.md",
    ):
        assert (ROOT / path).is_file()


def test_maintenance_guide_matches_the_public_repository():
    guide = (ROOT / "docs/skill-maintenance.md").read_text(encoding="utf-8")
    assert "workplace-truth-teller" in guide
    assert "GitHub 私有" not in guide
    assert "D:\\wechat" not in guide
    assert "不存在的 agent-browser" not in guide
