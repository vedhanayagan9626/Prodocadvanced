#this file is only for testing

from pathlib import Path
import sys

site_packages = Path(sys.executable).parent.parent / "Lib" / "site-packages"
dll_path = site_packages / "pythonnet" / "runtime" / "Python.Runtime.dll"
print(dll_path.exists())  # should print True
if not dll_path.exists():
    print(f"Error: {dll_path} does not exist. Ensure pythonnet is installed correctly.")