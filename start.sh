#!/bin/sh
PID=$(ps aux | grep yarn | grep -v grep | awk '{ print $2 }')
kill -9 $PID
PID=$(ps aux | grep next | grep -v grep | awk '{ print $2 }')
kill -9 $PID

nohup yarn start -p 7236 2>1 >>run_dev.out &
