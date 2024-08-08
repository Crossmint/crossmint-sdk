import os
import shutil

print('sd')

def copy_and_rename_md_files(src, dest):
    if not os.path.exists(dest):
        os.makedirs(dest)
    
    for root, dirs, files in os.walk(src):
        # Construct destination directory path
        dest_dir = os.path.join(dest, os.path.relpath(root, src))
        
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir)
        
        for file in files:
            src_file = os.path.join(root, file)
            if file.endswith('.md'):
                dest_file = os.path.join(dest_dir, file[:-3] + '.mdx')
            else:
                dest_file = os.path.join(dest_dir, file)
            
            shutil.copy2(src_file, dest_file)
            print(f'Copied {src_file} to {dest_file}')

# Example usage:
source_folder = '/Users/filipposlymperopoulos/Documents/Crossmint/crossmint-sdk/packages/client/verifiable-credentials/docs/.'
destination_folder = '/Users/filipposlymperopoulos/crossmint-main/apps/crossmint-mintlify-docs/src/sdk-reference/verifiable-credentials/client-sdk/'
copy_and_rename_md_files(source_folder, destination_folder)