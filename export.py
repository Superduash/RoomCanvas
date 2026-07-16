import os
from pathlib import Path

SKIP_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", 
    ".mp4", ".mp3", ".wav", ".zip", ".7z", ".rar", ".pdf", 
    ".exe", ".dll", ".so", ".db", ".sqlite", ".sqlite3", 
    ".pyc", ".pyo", ".woff", ".woff2", ".ttf", ".otf", ".eot"
}

IGNORE_DIRS = {
    "node_modules", "venv", ".git", "dist", "build", "coverage", 
    "__pycache__", ".next", ".cache", ".gemini", ".agents"
}

IGNORE_FILES = {
    "Backend.txt", "Frontend.txt", "export_output.txt", 
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".DS_Store"
}

def get_project_files():
    """Returns a sorted list of all project files using recursive os.walk."""
    files = []
    project_root = Path(__file__).parent.resolve()
    
    for root, dirs, filenames in os.walk(project_root):
        # Modify dirs in-place to prune unwanted directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for name in filenames:
            if name in IGNORE_FILES:
                continue
                
            file_path = Path(root) / name
            
            # Additional safety check for ignored dirs in the full path (in case of symlinks or weird nested structures)
            if any(part in IGNORE_DIRS for part in file_path.parts):
                continue
                
            try:
                # Store relative path for cleaner output
                rel_path = str(file_path.relative_to(project_root)).replace("\\", "/")
                files.append(rel_path)
            except ValueError:
                pass
                
    return sorted(files)

def is_backend(file_path):
    parts = Path(file_path).parts
    if "backend" in parts:
        return True
    if Path(file_path).name in ('.gitignore', 'README.md', 'start-all.bat', 'LICENSE', '.env.example', 'export.py', 'render.yaml'):
        return True
    return False

def is_frontend(file_path):
    parts = Path(file_path).parts
    if "frontend" in parts:
        return True
    if Path(file_path).name in ('.gitignore', 'README.md', 'start-all.bat', 'LICENSE', '.env.example', 'export.py', 'render.yaml'):
        return True
    return False

def build_tree(files):
    tree = {}
    for f in files:
        parts = Path(f).parts
        current = tree
        for part in parts[:-1]:
            current = current.setdefault(part, {})
        current[parts[-1]] = None
    return tree

def print_tree(tree, indent=""):
    output = ""
    items = sorted(tree.items(), key=lambda x: (x[1] is None, x[0]))
    for k, v in items:
        if v is None:
            output += f"{indent}{k}\n"
        else:
            output += f"{indent}{k}/\n"
            output += print_tree(v, indent + "    ")
    return output

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"

def write_files(output_file, filter_fn, all_files):
    relevant_files = [f for f in all_files if filter_fn(f)]
    if not relevant_files:
        return

    project_root = Path(__file__).parent.resolve()
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("="*80 + "\n")
        outfile.write(f"DIRECTORY TREE ({output_file})\n")
        outfile.write("="*80 + "\n\n")
        
        tree = build_tree(relevant_files)
        outfile.write(print_tree(tree))
        outfile.write("\n\n")
        
        outfile.write("="*80 + "\n")
        outfile.write("FILE CONTENTS\n")
        outfile.write("="*80 + "\n\n")

        for rel_path in relevant_files:
            file_path = project_root / rel_path
            
            try:
                size = file_path.stat().st_size
                size_str = format_size(size)
            except OSError:
                size = 0
                size_str = "Unknown"

            outfile.write(f"\n\n{'='*80}\n")
            outfile.write(f"FILE: {rel_path}\n")
            outfile.write(f"SIZE: {size_str}\n")
            outfile.write(f"{'='*80}\n\n")
            
            if size > 2_000_000:
                outfile.write(f"[Skipped: File larger than 2 MB]\n")
                continue
                
            if file_path.suffix.lower() in SKIP_EXTENSIONS:
                outfile.write(f"[Skipped: Binary or excluded extension]\n")
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
            except UnicodeDecodeError:
                outfile.write(f"[Skipped: Binary or non-UTF-8 file]\n")
            except Exception as e:
                outfile.write(f"[Could not read file: {e}]\n")

def main():
    files = get_project_files()
    if not files:
        print("No files found.")
        return
        
    write_files("Backend.txt", is_backend, files)
    print("Exported backend files to Backend.txt")
    write_files("Frontend.txt", is_frontend, files)
    print("Exported frontend files to Frontend.txt")

if __name__ == "__main__":
    main()
