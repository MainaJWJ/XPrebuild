import os

# Directory to collect .js files from
dir_path = './engine'  # Change this to your directory path
# Output file
output_path = './merged.js'

# Function to collect and merge all JS files
def merge_js_files(directory, output):
    try:
        files = os.listdir(directory)
        merged_content = ''

        for file in files:
            file_path = os.path.join(directory, file)
            if os.path.isfile(file_path) and file.endswith('.js'):
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
                    merged_content += f"// File: {file}\n"
                    merged_content += f"{file_content}\n\n"

        with open(output, 'w', encoding='utf-8') as f:
            f.write(merged_content)
        print(f"All JS files have been merged into {output}")
    except Exception as e:
        print(f"Error while merging JS files: {e}")

# Run the function
merge_js_files(dir_path, output_path)