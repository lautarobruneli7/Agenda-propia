@echo off
title Tareas
cd /d "%~dp0"
node --disable-warning=ExperimentalWarning server\server.js --open
pause
