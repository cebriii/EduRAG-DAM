@echo off
title EduRAG — Deteniendo servicios
chcp 65001 >nul

echo.
echo  Deteniendo EduRAG...

taskkill /FI "WINDOWTITLE eq EduRAG-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq EduRAG-Frontend*" /F >nul 2>&1

echo  Servicios detenidos.
echo.
timeout /t 2 /nobreak >nul
