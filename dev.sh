#!/bin/bash

$(npm bin)/nodemon ./bin/www &
cd public
node index.js &

trap "kill -TERM -$$" SIGINT
wait




# install dependencies:
# $ cd tc && npm install

# run the app:
# $ DEBUG=tc:* npm start
