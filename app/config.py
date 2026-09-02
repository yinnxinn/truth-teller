"""D:\\wechat 的集中配置。所有新入口只从这里读取路径和运行参数。"""
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy"
SKILL_DIR = ROOT / "skill"
WORKSPACE = ROOT / "runs"
CONTENT_DIR = ROOT / "content"
ASSETS_DIR = ROOT / "assets"

CDP_HTTP = "http://127.0.0.1:9222"
WECHAT_HOME = "https://mp.weixin.qq.com/"

REQUIRED_DIRS = (
    ROOT / "app",
    ROOT / "content" / "sources",
    ROOT / "content" / "drafts",
    ROOT / "content" / "published",
    ROOT / "assets" / "images",
    ROOT / "assets" / "covers",
    ROOT / "runs",
    ROOT / "logs",
)


def ensure_layout() -> None:
    """创建运行时目录；不会删除或覆盖已有内容。"""
    for path in REQUIRED_DIRS:
        path.mkdir(parents=True, exist_ok=True)
