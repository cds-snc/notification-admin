#!/bin/sh

# Retrieve .env from parameter store and remove currently set environement variables
. /sync_lambda_envs.sh 
exec python -m awslambdaric "$1"
