#!/bin/bash

read -p "Enter the kernel you use :" kernel

if [[ "$kernel" == "7" || "$kernel" =~ ^7./[0-9]+$ ]];
then 
	echo "You are Legend "
else
	echo "You are classical "
fi
