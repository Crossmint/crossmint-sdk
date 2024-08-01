import os

def remove_md_extension(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if '.md' in content:
                new_content = content.replace('.md', '')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file_path}")

if __name__ == "__main__":
    directory = input("Enter the directory path: ")
    remove_md_extension(directory)