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
        "code_export.txt",
        "export.py"
    ]
    for ignore in ignores:
        if fnmatch.fnmatch(path, ignore) or ignore in path.split(os.sep):
            return True
    return False

def export_code():
    output_file = "code_export.txt"
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk('.'):
            # Modifying dirs in-place to skip ignored directories
            dirs[:] = [d for d in dirs if not should_ignore(os.path.join(root, d))]
            
            for file in files:
                file_path = os.path.join(root, file)
                if should_ignore(file_path):
                    continue
                
                # Only include text/code files
                if file.endswith(('.py', '.jsx', '.js', '.css', '.html', '.md', '.json', '.txt', '.env.example')) or file == '.gitignore':
                    outfile.write(f"\n\n{'='*80}\n")
                    outfile.write(f"FILE: {file_path}\n")
                    outfile.write(f"{'='*80}\n\n")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                    except Exception as e:
                        outfile.write(f"Could not read file: {e}\n")

    print(f"Exported necessary code files to {output_file}")

if __name__ == "__main__":
    export_code()
