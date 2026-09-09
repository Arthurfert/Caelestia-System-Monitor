UUID        := mint-super-applet@local
APPLET_DIR  := $(UUID)
INSTALL_DIR := $(HOME)/.local/share/cinnamon/applets
DEST        := $(INSTALL_DIR)/$(UUID)

JS_FILES := $(shell find $(APPLET_DIR) -name '*.js')

.PHONY: all help install uninstall check

all: check install

help:
	@echo "=========== Makefile commands ============="
	@echo "make all             - checks, then installs it"
	@echo "make install         - checks then copy to your applets directory"
	@echo "make uninstall       - uninstalls the applet from your system"
	@echo "make check           - checks the javascript syntax"
	@echo "==========================================="

install: check
	@echo "==> Installing $(UUID) to $(DEST)"
	mkdir -p $(DEST)
	cp -r $(APPLET_DIR)/. $(DEST)/
	@echo "==> Done."
	@echo "    Add it to your panel: right-click the panel -> Applets (if needed, reload cinnamon manually with Alt+F2 -> r)."

uninstall:
	@echo "==> Removing $(DEST)"
	rm -rf $(DEST)

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
