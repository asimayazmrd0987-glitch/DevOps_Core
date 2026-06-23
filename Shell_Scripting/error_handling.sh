#!/bin/bash

error() {
	mkdir koot
}
if ! error; then
	echo "The directory exsist so exit it"
	exit 1
fi
echo "Hi"

