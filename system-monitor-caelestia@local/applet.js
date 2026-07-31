const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const St = imports.gi.St;
const GLib = imports.gi.GLib;

const UUID = 'system-monitor-caelestia@local';

const Draw = require('./lib/draw');
const Providers = require('./lib/providers');
const Dashboard = require('./lib/popup').Dashboard;

class CaelestiaSysMon extends Applet.Applet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this.setAllowedLayout(Applet.AllowedLayout.BOTH);
        this.panelHeight = panelHeight;

        this._onSettingsChanged = this._onSettingsChanged.bind(this);

        this.settings = new Settings.AppletSettings(this, UUID, instanceId);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'refresh-interval', 'refreshInterval', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'popup-width', 'popupWidth', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'popup-height', 'popupHeight', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'font-size', 'fontSize', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'show-cpu', 'showCpu', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'show-memory', 'showMemory', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'show-network', 'showNetwork', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'show-disk', 'showDisk', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'show-temps', 'showTemps', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'panel-show-cpu', 'panelShowCpu', this._onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, 'panel-show-memory', 'panelShowMemory', this._onSettingsChanged, null);

        this.providers = {
            cpu: new Providers.CPUProvider(),
            mem: new Providers.MemProvider(),
            net: new Providers.NetProvider(),
            disk: new Providers.DiskProvider(),
            temp: new Providers.TempProvider()
        };

        this._panelArea = new St.DrawingArea();
        this._panelArea.connect('repaint', () => this._paintPanel(this._panelArea));
        this.actor.add_actor(this._panelArea);

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menu.setCustomStyleClass('caelestia-popup');
        this.menuManager.addMenu(this.menu);

        this._contentSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._contentSection);

        this.dashboard = new Dashboard(this);
        this._contentSection.actor.add_actor(this.dashboard.actor);
        this.menu.connect('open-state-changed', (menu, open) => {
            if (open)
                this.dashboard.queueRepaint();
        });

        this.set_applet_tooltip('Caelestia System Monitor');

        this._layoutPanel();
        this._timeout = null;
        this._startLoop();
        this._tick();
    }

    _startLoop() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
        let rate = Math.max(250, this.refreshInterval || 2000);
        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, rate, () => {
            this._tick();
            return true;
        });
    }

    _tick() {
        this.providers.cpu.tick();
        this.providers.mem.tick();
        this.providers.net.tick();
        this.providers.disk.tick();
        this._setTooltip();
        if (this._panelArea)
            this._panelArea.queue_repaint();
        if (this.dashboard)
            this.dashboard.queueRepaint();
    }

    _setTooltip() {
        let parts = [];
        parts.push('CPU ' + Math.round(this.providers.cpu.lastTotal) + '%');
        let mem = this.providers.mem.data;
        if (mem && mem.total)
            parts.push('RAM ' + Math.round(mem.usedPct) + '%');
        let net = this.providers.net.last;
        parts.push('▼ ' + Draw.formatBytes(net.down, true) +
                   '  ▲ ' + Draw.formatBytes(net.up, true));
        let temps = [];
        for (let s of this.providers.temp.cpus.concat(this.providers.temp.gpus))
            temps.push(s.label + ' ' + s.temp + '°C');
        if (temps.length)
            parts.push(temps.join(' · '));
        this.set_applet_tooltip(parts.join('   ·   '));
    }

    _onSettingsChanged() {
        this._layoutPanel();
        if (this.dashboard)
            this.dashboard._relayout();
        this._startLoop();
        this._tick();
    }

    _layoutPanel() {
        let vertical = this._orientation === St.Side.LEFT || this._orientation === St.Side.RIGHT;
        let th = Math.max(10, this.panelHeight - 6);
        let capLen = Math.max(26, Math.round(th * 1.6));
        let gap = 6, pad = 3;
        let shown = (this.panelShowCpu ? 1 : 0) + (this.panelShowMemory ? 1 : 0);
        let logicalW, logicalH;
        if (shown === 0) {
            logicalW = 10;
            logicalH = th;
        } else if (!vertical) {
            logicalW = shown * capLen + (shown - 1) * gap + pad * 2;
            logicalH = th + pad;
        } else {
            logicalH = shown * capLen + (shown - 1) * gap + pad * 2;
            logicalW = th + pad;
        }
        this._panelArea.width = Math.max(1, Math.round(logicalW * global.ui_scale));
        this._panelArea.height = Math.max(1, Math.round(logicalH * global.ui_scale));
    }

    _paintPanel(area) {
        let ctx = area.get_context();
        let s = global.ui_scale;
        ctx.save();
        ctx.scale(s, s);

        let W = area.get_width() / s;
        let H = area.get_height() / s;
        let vertical = this._orientation === St.Side.LEFT || this._orientation === St.Side.RIGHT;

        let cpu = this.providers.cpu.lastTotal / 100;
        let memData = this.providers.mem.data;
        let mem = memData ? memData.usedPct / 100 : 0;

        let th = Math.max(10, this.panelHeight - 6);
        let capLen = Math.max(26, Math.round(th * 1.6));
        let gap = 6, pad = 3;
        let track = Draw.PALETTE.surfaceContainerHigh;
        let shown = (this.panelShowCpu ? 1 : 0) + (this.panelShowMemory ? 1 : 0);

        if (shown === 0) {
            Draw.setSourceHex(ctx, Draw.PALETTE.onSurfaceVariant, 0.5);
            ctx.newPath();
            ctx.arc(W / 2, H / 2, 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
            return;
        }

        if (!vertical) {
            let y = Math.max(0, Math.round((H - th) / 2));
            let x2 = pad;
            if (this.panelShowCpu) {
                this._drawCapsule(ctx, x2, y, capLen, th, cpu, Draw.PALETTE.primary, track, false);
                let lbl = Math.round(cpu * 100) + '%';
                Draw.drawText(area, ctx, 'C', x2 + 5, y + Math.round((th - 9) / 2),
                    Draw.PALETTE.primary, { size: 7, weight: 'bold', font: 'Sans' });
                Draw.drawText(area, ctx, lbl, x2 + capLen - 4, y + Math.round((th - 9) / 2),
                    Draw.PALETTE.onSurface, { size: 7, align: 'right', font: 'Sans' });
                x2 += capLen + gap;
            }
            if (this.panelShowMemory) {
                this._drawCapsule(ctx, x2, y, capLen, th, mem, Draw.PALETTE.cyan, track, false);
                let lbl = Math.round(mem * 100) + '%';
                Draw.drawText(area, ctx, 'M', x2 + 5, y + Math.round((th - 9) / 2),
                    Draw.PALETTE.cyan, { size: 7, weight: 'bold', font: 'Sans' });
                Draw.drawText(area, ctx, lbl, x2 + capLen - 4, y + Math.round((th - 9) / 2),
                    Draw.PALETTE.onSurface, { size: 7, align: 'right', font: 'Sans' });
            }
        } else {
            let x = Math.max(0, Math.round((W - th) / 2));
            let y2 = pad;
            if (this.panelShowCpu) {
                this._drawCapsule(ctx, x, y2, th, capLen, cpu, Draw.PALETTE.primary, track, true);
                let lbl = Math.round(cpu * 100) + '%';
                Draw.drawText(area, ctx, 'C', x + Math.round((th - 7) / 2), y2 + 5,
                    Draw.PALETTE.primary, { size: 7, weight: 'bold', font: 'Sans' });
                Draw.drawText(area, ctx, lbl, x + Math.round((th - 7) / 2), y2 + capLen - 4,
                    Draw.PALETTE.onSurface, { size: 7, font: 'Sans' });
                y2 += capLen + gap;
            }
            if (this.panelShowMemory) {
                this._drawCapsule(ctx, x, y2, th, capLen, mem, Draw.PALETTE.cyan, track, true);
                let lbl = Math.round(mem * 100) + '%';
                Draw.drawText(area, ctx, 'M', x + Math.round((th - 7) / 2), y2 + 5,
                    Draw.PALETTE.cyan, { size: 7, weight: 'bold', font: 'Sans' });
                Draw.drawText(area, ctx, lbl, x + Math.round((th - 7) / 2), y2 + capLen - 4,
                    Draw.PALETTE.onSurface, { size: 7, font: 'Sans' });
            }
        }
        ctx.restore();
    }

    _drawCapsule(ctx, x, y, w, h, fraction, color, track, vertical) {
        Draw.fillRoundRect(ctx, x, y, w, h, h / 2, track, 1);
        if (fraction <= 0.001) return;
        if (!vertical) {
            let len = Math.max(1.5, fraction * (w - 3));
            let r = Math.min((h - 3) / 2, len / 2);
            Draw.fillRoundRect(ctx, x + 1.5, y + 1.5, len, h - 3, r, color, 0.92);
        } else {
            let len = Math.max(1.5, fraction * (h - 3));
            let r = Math.min((w - 3) / 2, len / 2);
            Draw.fillRoundRect(ctx, x + 1.5, y + 1.5, w - 3, len, r, color, 0.92);
        }
    }

    on_applet_clicked(event) {
        this.menu.toggle();
    }

    on_panel_height_changed() {
        if (this.panel && this.panel.height > 0)
            this.panelHeight = this.panel.height;
        this._layoutPanel();
        if (this._panelArea)
            this._panelArea.queue_repaint();
    }

    on_orientation_changed(newOrientation) {
        this._orientation = newOrientation;
        this._layoutPanel();
        if (this._panelArea)
            this._panelArea.queue_repaint();
    }

    on_applet_removed_from_panel() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new CaelestiaSysMon(metadata, orientation, panelHeight, instanceId);
}
