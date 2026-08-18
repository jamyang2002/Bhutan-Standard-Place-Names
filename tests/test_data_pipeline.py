import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"


class DataPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(["python3", "scripts/import_data.py"], cwd=ROOT, check=True, stdout=subprocess.PIPE, text=True)
        cls.places = json.loads((DATA / "places.json").read_text(encoding="utf-8"))
        cls.report = json.loads((DATA / "data-validation-report.json").read_text(encoding="utf-8"))

    def test_expected_counts(self):
        self.assertEqual(self.report["summary"]["usablePlaceNameRecords"], 4093)
        self.assertEqual(self.report["summary"]["dzongkhags"], 20)
        self.assertGreaterEqual(self.report["summary"]["searchableAliases"], 40000)

    def test_private_fields_are_not_exposed(self):
        serialized = json.dumps(self.places, ensure_ascii=False).casefold()
        self.assertNotIn("name of tshogpa", serialized)
        self.assertNotIn("cid", serialized)
        self.assertNotIn("mobile", serialized)

    def test_old_spelling_alias_is_searchable(self):
        mebisa = [p for p in self.places if p["existingName"] == "Mepisa" and p["standardizedName"] == "Mebisa"]
        self.assertTrue(mebisa)
        self.assertIn("Mepisa", mebisa[0]["searchAliases"])
        self.assertIn("Mebisa", mebisa[0]["searchAliases"])

    def test_dzongkha_and_romanized_are_preserved_when_available(self):
        chhoekhor = [p for p in self.places if p["gewog"] == "Chhoekhor" and p["villageCode"] == "101002"]
        self.assertTrue(chhoekhor)
        self.assertEqual(chhoekhor[0]["gewogDz"], "ཆོས་འཁོར།")
        self.assertTrue(chhoekhor[0]["gewogRomanized"])

    def test_validation_report_documents_missing_values(self):
        self.assertIn("missingValues", self.report)
        self.assertIn("standardizedName", self.report["missingValues"])


if __name__ == "__main__":
    unittest.main()
