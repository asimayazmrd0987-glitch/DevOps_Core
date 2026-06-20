#!/bin/bash

# 1. Get the folder name from the first argument
PROJECT_DIR=$1

# 2. Check if the user provided an argument
if [ -z "$PROJECT_DIR" ]; then
    echo "Error: No project name provided."
    echo "Usage: ./setup_project.sh <project_name>"
    exit 1 # Exit with an error code
fi

# 3. Check if the directory already exists
if [ -d "$PROJECT_DIR" ]; then
    echo "Warning: Directory '$PROJECT_DIR' already exists."
else
    # Create the directory
    mkdir "$PROJECT_DIR"
    echo "Successfully created directory: $PROJECT_DIR"
fi

# 4. Create a log file inside the directory
LOG_FILE="$PROJECT_DIR/setup.log"
echo "Project setup initiated on $(date)" > "$LOG_FILE"
echo "Directory created: $PROJECT_DIR" >> "$LOG_FILE" # >> appends to the file

echo "Setup complete! Check $LOG_FILE for details."
