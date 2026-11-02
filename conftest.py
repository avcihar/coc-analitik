# conftest.py — ensures the workspace root is on sys.path for all test modules.
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
