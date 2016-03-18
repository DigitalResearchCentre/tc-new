#!/bin/bash

node public/index.js --env prod
pm2 start ./bin/www 

