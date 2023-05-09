#!/bin/bash
PID=$(ps aux | grep yarn | grep -v grep | awk '{ print $2 }')
kill -9 $PID
PID=$(ps aux | grep next | grep -v grep | awk '{ print $2 }')
kill -9 $PID
PID=$(ps aux | grep node | grep -v grep | awk '{ print $2 }')
kill -9 $PID
