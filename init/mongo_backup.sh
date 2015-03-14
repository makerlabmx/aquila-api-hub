#!/bin/bash
MONGO_DATABASE="aquila-server"
TIMESTAMP=`date +%F`
MONGODUMP_PATH="/usr/bin/mongodump"
BACKUPS_DIR="/home/odroid/.aquila-server/backup/"

mkdir -p $BACKUPS_DIR

$MONGODUMP_PATH -d $MONGO_DATABASE -o $BACKUPS_DIR
