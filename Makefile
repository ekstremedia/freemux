SHELL := /usr/bin/env bash
UNAME_S := $(shell uname -s)

ifeq ($(UNAME_S),Linux)
DEV_ENV := WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1
else
DEV_ENV :=
endif

.PHONY: help bootstrap install dev test build tauri-build check ffmpeg-check clean

help:
	@echo "FreeMux developer commands"
	@echo ""
	@echo "  make bootstrap     Install Debian system prerequisites"
	@echo "  make install       Install npm dependencies"
	@echo "  make dev           Run the Tauri desktop app in dev mode"
	@echo "  make test          Run TypeScript tests"
	@echo "  make build         Build the frontend"
	@echo "  make tauri-build   Build desktop bundles"
	@echo "  make check         Run local environment checks"
	@echo "  make ffmpeg-check  Verify ffmpeg and ffprobe are available"
	@echo "  make clean         Remove generated frontend output"

bootstrap:
	./scripts/bootstrap-debian.sh

install:
	npm install

dev:
	$(DEV_ENV) npm run tauri dev

test:
	npm run test

build:
	npm run build

tauri-build:
	npm run tauri build

check:
	./scripts/dev-check.sh

ffmpeg-check:
	./scripts/ffmpeg-check.sh

clean:
	rm -rf dist
