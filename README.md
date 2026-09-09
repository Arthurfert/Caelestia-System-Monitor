# Mint SuperApplet

A custom Cinnamon applet: a system monitor (CPU, memory, network, disk I/O, temperatures) with modern styling.

## Next features

- Battery popup window with percentage, time remaining and battery life
- Weather forecast
- Media player

## Install

```bash
make all
```

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
mint-super-applet@local/
├── metadata.json
├── applet.js              # panel indicator + update loop
├── stylesheet.css         # Applet popup theming
├── settings-schema.json   # configurable via right-click → Settings
└── lib/
    ├── draw.js            # Cairo helpers + palette
    ├── providers.js       # /proc data (CPU, mem, net, disk, temps)
    └── popup.js           # dashboard popup rendering
```
