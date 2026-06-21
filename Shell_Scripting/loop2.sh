#!/bin/bash

for (( i=$2; i<=$3; i++ ))
do 
	mkdir "$1$i"
done
