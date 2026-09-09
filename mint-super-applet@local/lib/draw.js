const Pango = imports.gi.Pango;
const PangoCairo = imports.gi.PangoCairo;

var PALETTE = {
    background:           '#131317',
    onBackground:         '#e5e1e7',
    surfaceContainerLow:  '#1c1b1f',
    surfaceContainer:     '#201f23',
    surfaceContainerHigh: '#2a292e',
    surfaceContainerHst:  '#353438',
    onSurface:            '#e5e1e7',
    onSurfaceVariant:     '#c8c5d1',
    outline:              '#918f9a',
    outlineVariant:       '#47464f',
    primary:              '#c2c1ff',
    onPrimary:            '#2a2a60',
    primaryContainer:     '#7171ac',
    secondary:            '#c6c4e0',
    secondaryContainer:   '#45455c',
    tertiary:             '#f5cdb2',
    tertiaryContainer:    '#bba27d',
    error:                '#ff6c5c',
    cyan:                 '#44def5',
    purple:               '#7573ff',
    success:              '#B5CCBA',
};

function hexToRgba(hex, alpha) {
    if (alpha === undefined) alpha = 1;
    let h = hex.replace('#', '');
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [
        parseInt(h.substring(0, 2), 16) / 255,
        parseInt(h.substring(2, 4), 16) / 255,
        parseInt(h.substring(4, 6), 16) / 255,
        alpha
    ];
}

function normalizeHex(color) {
    if (typeof color !== 'string') return null;
    color = color.trim();
    let m;
    if ((m = color.match(/^#([0-9a-f]{3})$/i)))
        return '#' + m[1].split('').map(c => c + c).join('');
    if ((m = color.match(/^#([0-9a-f]{6})$/i)))
        return '#' + m[1];
    if ((m = color.match(/^#([0-9a-f]{8})$/i)))
        return '#' + m[1].substring(2);
    if ((m = color.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i))) {
        let c = [m[1], m[2], m[3]].map(v => {
            let n = parseFloat(v);
            n = Math.round(n > 1 ? n : n * 255);
            n = Math.max(0, Math.min(255, n));
            return ('0' + n.toString(16)).slice(-2);
        });
        return '#' + c.join('');
    }
    return null;
}

function setSourceHex(ctx, hex, alpha) {
    ctx.setSourceRGBA.apply(ctx, hexToRgba(hex, alpha));
}

function rgba(hex, alpha) {
    let c = hexToRgba(hex, alpha === undefined ? 1 : alpha);
    return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' +
           Math.round(c[2] * 255) + ',' + c[3] + ')';
}

function roundedRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    if (r < 0) r = 0;
    ctx.newPath();
    ctx.moveTo(x + r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
    ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, hex, alpha) {
    roundedRect(ctx, x, y, w, h, r);
    setSourceHex(ctx, hex, alpha === undefined ? 1 : alpha);
    ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r, hex, alpha, lineWidth) {
    roundedRect(ctx, x, y, w, h, r);
    setSourceHex(ctx, hex, alpha === undefined ? 1 : alpha);
    ctx.setLineWidth(lineWidth || 1);
    ctx.stroke();
}

function drawSparkline(ctx, values, x, y, w, h, hex, opts) {
    opts = opts || {};
    if (!values || values.length < 2 || w < 4 || h < 4) return;
    let lineWidth = opts.lineWidth || 1.6;
    let fillAlpha = opts.fillAlpha !== undefined ? opts.fillAlpha : 0.18;
    let max = opts.max;
    if (max === undefined) {
        max = 1;
        for (let i = 0; i < values.length; i++)
            if (values[i] > max) max = values[i];
    }
    if (max <= 0) max = 1;
    let step = w / (values.length - 1);
    let pts = [];
    for (let i = 0; i < values.length; i++) {
        let v = values[i] / max;
        if (v < 0) v = 0;
        if (v > 1) v = 1;
        pts.push([x + i * step, y + h - v * h]);
    }
    ctx.save();
    roundedRect(ctx, x, y, w, h, opts.clipRadius || 3);
    ctx.clip();

    if (fillAlpha > 0) {
        ctx.newPath();
        ctx.moveTo(pts[0][0], y + h);
        for (let i = 0; i < pts.length; i++)
            ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[pts.length - 1][0], y + h);
        ctx.closePath();
        let grad = null;
        try {
            grad = ctx.createLinearGradient(x, y, x, y + h);
            let c = hexToRgba(hex, fillAlpha);
            grad.addColorStop(0, c);
            grad.addColorStop(1, [c[0], c[1], c[2], 0]);
        } catch (e) {
            grad = null;
        }
        if (grad) ctx.setSource(grad);
        else setSourceHex(ctx, hex, fillAlpha);
        ctx.fill();
    }

    ctx.newPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++)
        ctx.lineTo(pts[i][0], pts[i][1]);
    setSourceHex(ctx, hex, 1);
    ctx.setLineWidth(lineWidth);
    ctx.setLineJoin(1);
    ctx.setLineCap(1);
    ctx.stroke();
    ctx.restore();
}

function drawRing(ctx, cx, cy, outerR, thickness, fraction, hex, trackHex) {
    let f = Math.max(0, Math.min(1, fraction));
    let innerR = Math.max(0, outerR - thickness);
    let midR = innerR + thickness / 2;
    ctx.setLineCap(1);
    ctx.setLineWidth(thickness);
    ctx.newPath();
    setSourceHex(ctx, trackHex, 1);
    ctx.arc(cx, cy, midR, 0, 2 * Math.PI);
    ctx.stroke();
    if (f > 0.0005) {
        ctx.newPath();
        setSourceHex(ctx, hex, 1);
        ctx.arc(cx, cy, midR, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * f);
        ctx.stroke();
    }
}

function drawText(area, ctx, text, x, y, hex, opts) {
    opts = opts || {};
    let layout = area.create_pango_layout(text);
    let family = opts.font || 'monospace';
    let weight = opts.weight || 'normal';
    let size = opts.size || 10;
    let desc = Pango.font_description_from_string(family + ' ' + weight + ' ' + size + 'px');
    layout.set_font_description(desc);
    if (opts.width)
        layout.set_width(opts.width * 1024);
    if (opts.ellipsize)
        layout.set_ellipsize(Pango.EllipsizeMode.END);
    let [pw, ph] = layout.get_pixel_size();
    let dw = opts.width || pw;
    let dx = x;
    if (opts.align === 'center') dx = x - dw / 2;
    else if (opts.align === 'right') dx = x - dw;
    setSourceHex(ctx, hex, opts.alpha === undefined ? 1 : opts.alpha);
    PangoCairo.update_layout(ctx, layout);
    ctx.moveTo(Math.round(dx), Math.round(y));
    PangoCairo.show_layout(ctx, layout);
    return { width: pw, height: ph };
}

function formatBytes(bytes, rate) {
    let b = bytes;
    if (!isFinite(b) || b < 0) b = 0;
    let unit = rate ? ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s']
                    : ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let val = b;
    while (val >= 1024 && i < unit.length - 1) {
        val /= 1024;
        i++;
    }
    let out = val >= 100 ? String(Math.round(val)) : val.toFixed(1);
    return out + ' ' + unit[i];
}

function formatBytesShort(bytes) {
    let b = bytes;
    if (!isFinite(b) || b < 0) b = 0;
    let units = ['B', 'K', 'M', 'G', 'T'];
    let i = 0;
    while (b >= 1024 && i < units.length - 1) {
        b /= 1024;
        i++;
    }
    return (b >= 100 ? String(Math.round(b)) : b.toFixed(1)) + units[i];
}

function formatUptime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '';
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
}
