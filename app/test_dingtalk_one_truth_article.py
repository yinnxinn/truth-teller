"""Regression checks for the DingTalk ONE WeChat article payload."""

import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("generate_dingtalk_one_truth_article.py")


def load_article():
    spec = importlib.util.spec_from_file_location("dingtalk_one_article", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.ARTICLE


class DingTalkOneArticleTests(unittest.TestCase):
    def test_quotes_are_content_only_and_article_has_six_evidence_sections(self):
        article = load_article()

        self.assertEqual(len(article["sections"]), 6)
        self.assertTrue(all("原文说" not in section["quote"] for section in article["sections"]))
        self.assertTrue(all("8月25日" not in section["quote"] for section in article["sections"]))


if __name__ == "__main__":
    unittest.main()
