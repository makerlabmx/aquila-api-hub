#! /usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

# Create aquila-server config dir if not exists
mkdir -p ~/.aquila-server/data/db
# Start MongoDB
echo Starting Database...
mongod --dbpath ~/.aquila-server/data/db --logpath ~/.aquila-server/data/mongodb.log &
sleep 1
# Start aquila-server
echo Starting Aquila Server...
node aquila-server.js
# Close MongoDB at end
killall mongod