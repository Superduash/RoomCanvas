import os
import subprocess
from pathlib import Path

def get_project_files():
    """
    Returns a sorted list of all project files, respecting .gitignore.
    Uses git to determine tracked and untracked (but not ignored) files.
    """
    try:
        # Get all tracked files and untracked (but not ignored) files
        result = subprocess.run(
            ['git', 'ls-files', '--cached', '--others', '--exclude-standard'],
            capture_output=True,
            text=True,
            check=True
        )
        # Filter out empty strings and sort
        files = sorted([f for f in result.stdout.split('\n') if f])
        
        # Additional manual filters just in case
        filtered_files = []
        ignores = [
            "node_modules", "venv", ".venv", "__pycache__", "dist", "build", 
            ".git", "storage", "logs", "credentials", "export_output.txt", 
            "export.py", "Frontend.txt", "Backend.txt", "code_export.txt"
        ]
        
        for file_path in files:
            path_obj = Path(file_path)
            # Skip if matches hardcoded ignores or is a binary/image file
            if any(part in ignores for part in path_obj.parts) or file_path in ignores:
                continue
            if path_obj.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.sqlite3', '.db', '.pyc']:
                continue
                
            filtered_files.append(file_path)
            
        return filtered_files
    except subprocess.CalledProcessError:
        print("Error: Must be run inside a git repository.")
        return []

def is_backend(file_path):
    parts = file_path.split(os.sep) if os.sep in file_path else file_path.split('/')
    filename = Path(file_path).name
    if "backend" in parts:
        return True
    # Root level configuration files relevant to backend
    if filename in ('.gitignore', 'README.md', 'start-all.bat', 'LICENSE', '.env.example'):
        return True
    return False

def is_frontend(file_path):
    parts = file_path.split(os.sep) if os.sep in file_path else file_path.split('/')
    filename = Path(file_path).name
    if "frontend" in parts:
        return True
    # Root level configuration files relevant to frontend
    if filename in ('.gitignore', 'README.md', 'start-all.bat', 'LICENSE', '.env.example'):
        return True
    return False

def build_tree(files):
    """Builds a nested dictionary representing the directory tree."""
    tree = {}
    for f in files:
        parts = Path(f).parts
        current = tree
        for part in parts[:-1]:
            current = current.setdefault(part, {})
        current[parts[-1]] = None
    return tree

def print_tree(tree, indent=""):
    """Recursively formats the directory tree into a string."""
    output = ""
    items = sorted(tree.items(), key=lambda x: (x[1] is None, x[0]))
    for k, v in items:
        if v is None:
            output += f"{indent}{k}\n"
        else:
            output += f"{indent}{k}/\n"
            output += print_tree(v, indent + "    ")
    return output

def write_files(output_file, filter_fn, all_files):
    relevant_files = [f for f in all_files if filter_fn(f)]
    if not relevant_files:
        return

    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Generate directory tree
        outfile.write("="*80 + "\n")
        outfile.write(f"DIRECTORY TREE ({output_file})\n")
        outfile.write("="*80 + "\n\n")
        
        tree = build_tree(relevant_files)
        outfile.write(print_tree(tree))
        outfile.write("\n\n")
        
        # Generate file contents
        outfile.write("="*80 + "\n")
        outfile.write("FILE CONTENTS\n")
        outfile.write("="*80 + "\n\n")

        for file_path in relevant_files:
            outfile.write(f"\n\n{'='*80}\n")
            outfile.write(f"FILE: {file_path}\n")
            outfile.write(f"{'='*80}\n\n")
            try:
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
            except UnicodeDecodeError:
                outfile.write(f"[Binary or non-UTF-8 file skipped]\n")
            except Exception as e:
                outfile.write(f"[Could not read file: {e}]\n")

def main():
    files = get_project_files()
    if not files:
        return
        
    write_files("Backend.txt", is_backend, files)
    print("Exported backend files to Backend.txt")
    write_files("Frontend.txt", is_frontend, files)
    print("Exported frontend files to Frontend.txt")

if __name__ == "__main__":
    main()
