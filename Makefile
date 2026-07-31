UUID        := system-monitor-caelestia@local
APPLET_DIR  := $(UUID)
INSTALL_DIR := $(HOME)/.local/share/cinnamon/applets
DEST        := $(INSTALL_DIR)/$(UUID)

JS_FILES := $(shell find $(APPLET_DIR) -name '*.js')

.PHONY: all install uninstall reload check lint

all: check

install: check
	@echo "==> Installing $(UUID) to $(DEST)"
	mkdir -p $(DEST)
	cp -r $(APPLET_DIR)/. $(DEST)/
	@echo "==> Done."
	@echo "    Add it to your panel: right-click the panel -> Applets (or run 'make reload')."

uninstall:
	@echo "==> Removing $(DEST)"
	rm -rf $(DEST)

reload:
	@echo "==> Reloading Cinnamon (like pressing Alt+F2 then r)"
	@which xdotool >/dev/null 2>&1 && xdotool key alt+F2 && sleep 0.3 && xdotool key r && sleep 0.3 && xdotool key Return || echo "    xdotool not found; reload manually with Alt+F2 -> r"

check:
	@echo "==> Checking JavaScript syntax"
	@if command -v node >/dev/null 2>&1; then \
		for f in $(JS_FILES); do \
			node --check "$$f" && echo "    ok: $$f" || exit 1; \
		done; \
	elif command -v cjs >/dev/null 2>&1; then \
		for f in $(JS_FILES); do \
			echo "    (syntax check via cjs not supported; skipping $$f)"; \
		done; \
	else \
		echo "    no JS interpreter found; skipping"; \
	fi

lint: check
