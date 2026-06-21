#!/bin/bash

echo "Enter the user name you wanna add: "
read username
sudo useradd -m "$username"
echo "$username is added"
sudo userdel -r "$username"
echo "$username is deleted"
cat /etc/passwd
