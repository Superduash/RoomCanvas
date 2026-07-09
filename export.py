import os
import fnmatch

def should_ignore(path):
    ignores = [
        "node_modules",
        "venv",
        ".venv",
        "__pycache__",
        "dist",
        "build",
        ".git",
        "storage",
        "*.pyc",
        "*.pyo",
        "*.pyd",
        ".DS_Store",
        ".env",
        "Backend.txt",
        "Frontend.txt",
        "export.py",
        "code_export.txt",
        "archive"
    ]
    for ignore in ignores:
        if fnmatch.fnmatch(path, ignore) or ignore in path.split(os.sep):
            return True
    return False

def is_important_backend(file_path):
    parts = file_path.split(os.sep)
    # Ignore files in test directories or storage
    if "tests" in parts or "storage" in parts:
        return False
    
    # Check for important backend file patterns
    filename = os.path.basename(file_path)
    if file_path.startswith(f".{os.sep}backend"):
        if filename.endswith('.py') and not filename.startswith('test_'):
            return True
        if filename in ('requirements.txt', '.env.example'):
            return True
    
    # Root level configuration files
    if filename in ('.gitignore', 'finish_backend.md'):
        return True
        
    return False

def is_important_frontend(file_path):
    # Check for important frontend file patterns
    filename = os.path.basename(file_path)
    if file_path.startswith(f".{os.sep}frontend"):
        if filename.endswith(('.js', '.jsx', '.css', '.html')):
            return True
        if filename in ('package.json', '.env.example'):
            return True
    return False

def write_files(output_file, filter_fn):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if not should_ignore(os.path.join(root, d))]
            
            for file in files:
                file_path = os.path.join(root, file)
                if should_ignore(file_path):
                    continue
                
                if filter_fn(file_path):
                    outfile.write(f"\n\n{'='*80}\n")
                    outfile.write(f"FILE: {file_path}\n")
                    outfile.write(f"{'='*80}\n\n")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                    except Exception as e:
                        outfile.write(f"Could not read file: {e}\n")

def main():
    write_files("Backend.txt", is_important_backend)
    print("Exported important backend files to Backend.txt")
    write_files("Frontend.txt", is_important_frontend)
    print("Exported important frontend files to Frontend.txt")

if __name__ == "__main__":
    main()
