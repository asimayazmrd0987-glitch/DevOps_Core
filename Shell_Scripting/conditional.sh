#!/bin/bash

read -p "Enter the kernel you use :" kernel

if [[ "$kernel" -ge "7" ]];
then 
	echo "You are Legend "
else
	echo "You are classical "
fi
