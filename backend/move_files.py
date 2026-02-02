import os
import shutil

source_dir = "."
target_dir = "backend"
exclude = {"backend", "venv", ".git", ".idea", "__pycache__", "chroma_db", "logs"}

for item in os.listdir(source_dir):
    if item in exclude:
        continue
    
    src_path = os.path.join(source_dir, item)
    dst_path = os.path.join(target_dir, item)
    
    try:
        if os.path.isdir(src_path):
            shutil.move(src_path, dst_path)
            print(f"Moved dir: {item}")
        else:
            shutil.move(src_path, dst_path)
            print(f"Moved file: {item}")
    except Exception as e:
        print(f"Skipped {item}: {e}")
