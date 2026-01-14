#!/bin/bash

# Doc
# ./scripts/deploy.sh dev - Deploy to development server
# ./scripts/deploy.sh prod - Deploy to production server

# t3.micro
# dev_server_address=ec2-18-163-124-78.ap-east-1.compute.amazonaws.com

# t3.small
dev_server_address=ec2-16-163-105-49.ap-east-1.compute.amazonaws.com
dev_private_key_path=./scripts/.ssh/aws-hk-t3-medium.pem

# t3.medium
prod_server_address=ec2-18-162-152-97.ap-east-1.compute.amazonaws.com
prod_private_key_path=./scripts/.ssh/aws-hk-t3-medium.pem

# ali ecs 
ali_server_address=8.134.79.99
ali_private_key_path=./scripts/.ssh/ecs.u1-c1m2.large.pem

dist_path=dist
server_user=ubuntu

backup_path=/home/$server_user/wehomebot-client
nginx_web_path=/etc/nginx/www/app
filename="client.$(date +%Y%m%d%H%M%S).tar.gz"

# Check environment
if [ "$1" == "dev" ]; then
  server_address=$dev_server_address
  private_key_path=$dev_private_key_path
elif [ "$1" == "prod" ]; then
  server_address=$prod_server_address
  private_key_path=$prod_private_key_path
elif [ "$1" == "ali" ]; then
  server_address=$ali_server_address
  private_key_path=$ali_private_key_path
else
  echo "Invalid environment"
  exit 1
fi

# Logs
echo
echo "Environment: $1"
echo "Server User: $server_user"
echo "Deploying to $server_address"
echo "Filename: $filename"
echo "Backup Path: $backup_path"
echo "Nginx Web Path: $nginx_web_path"
echo

# Build
echo "Build Stage"
pnpm i
pnpm run build -m production -l silent
echo

# Backup
echo "Backup to $1 Server"
tar -zcf $filename $dist_path
scp  -o "StrictHostKeyChecking no" -i $private_key_path $filename $server_user@$server_address:$backup_path
rm $filename
echo

# Deploy
echo "Deploy to $1"
rsync -avz -e "ssh -i $private_key_path" $dist_path/ $server_user@$server_address:$nginx_web_path