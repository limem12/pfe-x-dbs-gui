SHELL := powershell.exe
.SHELLFLAGS := -NoProfile -Command

CC := gcc
TARGET := build/xdbs_test.exe
SOURCES := src/x_dbs_api.c src/main.c
INCLUDES := -Iinclude
CFLAGS := -std=c11 -Wall -Wextra -Wpedantic -g $(INCLUDES)
LDLIBS := -lcurl -ljson-c

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(SOURCES) include/x_dbs_api.h
	if (-not (Test-Path build)) { New-Item -ItemType Directory -Path build | Out-Null }
	$(CC) $(CFLAGS) $(SOURCES) -o $(TARGET) $(LDLIBS)

clean:
	if (Test-Path $(TARGET)) { Remove-Item $(TARGET) }

run: $(TARGET)
	.\$(TARGET)
