import json
from pathlib import Path

class JSONHandler:
    def __init__(self, filename):
        self.filename = Path(filename)

    def write(self, data):
        with self.filename.open('w') as json_file:
            json.dump(data, json_file, indent=4)

    def read(self):
        try:
            with self.filename.open('r') as json_file:
                return json.load(json_file)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}