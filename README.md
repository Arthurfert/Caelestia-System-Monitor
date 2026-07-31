# Caelestia System Monitor

A custom Cinnamon applet: a system monitor (CPU, memory, network, disk I/O, temperatures) with Caelestia styling.

## Install

```bash
make install
```

Add it to your panel: right-click the panel → **Applets** → **Caelestia System Monitor**.

## Uninstall

```bash
make uninstall
```

## Reload / syntax check

```bash
make reload   # equivalent to Alt+F2 then r
make check    # JS syntax check
```

## Layout

```
system-monitor-caelestia@local/
├── metadata.json
├── applet.js              # panel indicator + update loop
├── stylesheet.css         # Caelestia popup theming
├── settings-schema.json   # configurable via right-click → Settings
└── lib/
    ├── draw.js            # Cairo helpers + Caelestia palette
    ├── providers.js       # /proc data (CPU, mem, net, disk, temps)
    └── popup.js           # dashboard popup rendering
```
