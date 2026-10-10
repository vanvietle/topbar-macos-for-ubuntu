import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Shell from 'gi://Shell';
import AccountsService from 'gi://AccountsService';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// ---- icon painters (16-unit boxes, drawn with Cairo in the panel's text colour) ----

function sector(cr, cx, cy, ri, ro) {
    const a1 = -3 * Math.PI / 4;
    const a2 = -Math.PI / 4;
    if (ri === 0) {
        cr.moveTo(cx, cy);
        cr.arc(cx, cy, ro, a1, a2);
    } else {
        cr.arc(cx, cy, ro, a1, a2);
        cr.arcNegative(cx, cy, ri, a2, a1);
    }
    cr.closePath();
    cr.fill();
}

// "muted" mark for the speaker only: a 45-degree slash in the same faint colour as the dimmed icon,
// with a gap cut out of the icon around it so the two never overlap into a brighter patch
function offSlash(cr, fg, cx, cy, len) {
    const d = len / 2;
    cr.save();
    cr.setOperator(0); // CLEAR: a narrow gap in the icon either side of the line
    cr.setLineWidth(2.2);
    cr.setLineCap(1);
    cr.moveTo(cx - d, cy + d);
    cr.lineTo(cx + d, cy - d);
    cr.stroke();
    cr.restore();
    cr.setSourceRGBA(fg.r, fg.g, fg.b, fg.a * 0.4);
    cr.setLineWidth(0.6);
    cr.setLineCap(1);
    cr.moveTo(cx - d, cy + d);
    cr.lineTo(cx + d, cy - d);
    cr.stroke();
}

function paintWifi(cr, fg, level, off) {
    // macOS style: a small wedge and two thick round-capped arcs (three steps)
    const cx = 11;
    const cy = 14.6;
    const a1 = -Math.PI / 2 - 0.82;
    const a2 = -Math.PI / 2 + 0.82;
    const alpha = i => (off ? fg.a * 0.4 : (i < level ? fg.a : fg.a * 0.3));

    cr.setSourceRGBA(fg.r, fg.g, fg.b, alpha(0));
    cr.newPath();
    cr.moveTo(cx, cy);
    cr.arc(cx, cy, 3.4, a1, a2);
    cr.closePath();
    cr.fillPreserve();
    cr.setLineWidth(0.9);
    cr.setLineJoin(1);
    cr.stroke();

    cr.setLineWidth(1.7);
    cr.setLineCap(1);
    [[1, 8], [2, 12.3]].forEach(([i, r]) => {
        cr.setSourceRGBA(fg.r, fg.g, fg.b, alpha(i));
        cr.newPath();
        cr.arc(cx, cy, r, a1, a2);
        cr.stroke();
    });
    if (off)
        offSlash(cr, fg, 11, 8.2, 15);
}

function paintVolume(cr, fg, level, muted) {
    // macOS style: rounded box + flared cone, then three round-capped waves that grow outward
    cr.setSourceRGBA(fg.r, fg.g, fg.b, muted ? fg.a * 0.4 : fg.a);
    roundRect(cr, 1, 5.4, 3.6, 5.2, 0.9);
    cr.fill();
    cr.newPath();
    cr.moveTo(4, 5.4);
    cr.lineTo(8.2, 2.1);
    cr.lineTo(8.2, 13.9);
    cr.lineTo(4, 10.6);
    cr.closePath();
    cr.fill();

    // always draw the three waves; lit ones show the current level, the rest stay faint
    cr.setLineWidth(1.2);
    cr.setLineCap(1); // round
    for (let i = 0; i < 3; i++) {
        const lit = !muted && i < level;
        cr.setSourceRGBA(fg.r, fg.g, fg.b, lit ? fg.a : fg.a * 0.25);
        cr.newPath();
        cr.arc(8.4, 8, 3.2 + i * 2.5, -0.72, 0.72);
        cr.stroke();
    }
    if (muted)
        offSlash(cr, fg, 9, 8, 13);
}

function paintBluetooth(cr, fg, off) {
    cr.setSourceRGBA(fg.r, fg.g, fg.b, off ? fg.a * 0.4 : fg.a);
    cr.setLineWidth(1.0);
    cr.setLineCap(1);
    cr.setLineJoin(1);
    cr.moveTo(1.5, 4.5);
    cr.lineTo(10, 11.5);
    cr.lineTo(6, 15);
    cr.lineTo(6, 1);
    cr.lineTo(10, 4.5);
    cr.lineTo(1.5, 11.5);
    cr.stroke();
    if (off)
        offSlash(cr, fg, 6, 8, 13);
}

function paintAirplane(cr, fg, on) {
    cr.setSourceRGBA(fg.r, fg.g, fg.b, on ? fg.a : fg.a * 0.4);
    cr.moveTo(8, 0.8);
    cr.curveTo(8.8, 0.8, 9.3, 1.5, 9.3, 2.5);
    cr.lineTo(9.3, 6);
    cr.lineTo(15, 9.5);
    cr.lineTo(15, 11);
    cr.lineTo(9.3, 9.3);
    cr.lineTo(9.3, 12.3);
    cr.lineTo(11.3, 13.8);
    cr.lineTo(11.3, 15);
    cr.lineTo(8, 14.2);
    cr.lineTo(4.7, 15);
    cr.lineTo(4.7, 13.8);
    cr.lineTo(6.7, 12.3);
    cr.lineTo(6.7, 9.3);
    cr.lineTo(1, 11);
    cr.lineTo(1, 9.5);
    cr.lineTo(6.7, 6);
    cr.lineTo(6.7, 2.5);
    cr.curveTo(6.7, 1.5, 7.2, 0.8, 8, 0.8);
    cr.closePath();
    cr.fill();
}

function roundRect(cr, x, y, w, h, r) {
    cr.newPath();
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
    cr.closePath();
}

function paintBattery(cr, fg, pct, charging, full) {
    // thin rounded outline, a separate rounded fill inset inside it, and a small terminal with a gap
    cr.setSourceRGBA(fg.r, fg.g, fg.b, fg.a * 0.5);
    cr.setLineWidth(0.9);
    roundRect(cr, 1.2, 2.2, 21.6, 11, 3.4);
    cr.stroke();
    roundRect(cr, 24.3, 5.6, 1.4, 4.4, 0.7);
    cr.fill();

    if (charging || full)
        cr.setSourceRGBA(0.19, 0.82, 0.35, 1);
    else if (pct <= 20)
        cr.setSourceRGBA(1, 0.27, 0.23, 1);
    else
        cr.setSourceRGBA(fg.r, fg.g, fg.b, fg.a);
    const fillW = Math.max(1.8, 18.4 * Math.min(pct, 100) / 100);
    roundRect(cr, 2.9, 3.9, fillW, 7.6, 2);
    cr.fill();

    if (charging) {
        // lightning bolt, white with a dark edge so it reads on both fill and empty parts
        cr.newPath();
        cr.moveTo(13.2, 3);
        cr.lineTo(8.2, 8.3);
        cr.lineTo(11, 8.3);
        cr.lineTo(9.8, 12);
        cr.lineTo(15.4, 6.5);
        cr.lineTo(12.4, 6.5);
        cr.closePath();
        cr.setSourceRGBA(0, 0, 0, 0.5);
        cr.setLineWidth(1.2);
        cr.strokePreserve();
        cr.setSourceRGBA(1, 1, 1, 1);
        cr.fill();
    }
}

const HIDETOPBAR = 'hidetopbar@mathieu.bidon.ca';

function paintModeIcon(cr, fg) {
    // a screen outline with its top bar filled in: "top bar settings"
    cr.setSourceRGBA(fg.r, fg.g, fg.b, fg.a);
    cr.save();
    roundRect(cr, 1.3, 2.3, 13.4, 11.4, 2.6);
    cr.clip();
    cr.rectangle(0, 0, 16, 6.4);
    cr.fill();
    cr.restore();
    cr.setLineWidth(0.95);
    roundRect(cr, 1.3, 2.3, 13.4, 11.4, 2.6);
    cr.stroke();
}

function paintGear(cr, fg) {
    // outlined cog: eight teeth and a ring around a small hole, drawn with the same thin line as the other icons
    cr.setSourceRGBA(fg.r, fg.g, fg.b, fg.a);
    const cx = 8;
    const cy = 8;
    const teeth = 8;
    const ro = 7.1;
    const ri = 5.5;
    const step = 2 * Math.PI / teeth;
    cr.newPath();
    for (let i = 0; i < teeth; i++) {
        const a = i * step;
        const pts = [[ri, a - step * 0.30], [ro, a - step * 0.16], [ro, a + step * 0.16], [ri, a + step * 0.30]];
        pts.forEach(([r, ang], k) => {
            const x = cx + r * Math.cos(ang);
            const y = cy + r * Math.sin(ang);
            if (i === 0 && k === 0)
                cr.moveTo(x, y);
            else
                cr.lineTo(x, y);
        });
    }
    cr.closePath();
    cr.setLineWidth(1.0);
    cr.setLineJoin(1);
    cr.stroke();
    cr.newPath();
    cr.arc(cx, cy, 2.6, 0, 2 * Math.PI);
    cr.stroke();
}

function paintControlCenter(cr, fg) {
    cr.translate(0, -0.45);
    cr.setSourceRGBA(fg.r, fg.g, fg.b, fg.a);
    cr.setLineWidth(0.9);
    // top: outlined pill with a solid dot on the left
    roundRect(cr, 1.2, 1.5, 13.6, 5.2, 2.6);
    cr.stroke();
    cr.newPath();
    cr.arc(4.2, 4.1, 1.5, 0, 2 * Math.PI);
    cr.fill();
    // bottom: solid pill with a light knob (cut out) on the right
    roundRect(cr, 1, 8.3, 14, 5.6, 2.8);
    cr.fill();
    cr.save();
    cr.setOperator(0); // CLEAR
    cr.newPath();
    cr.arc(11.9, 11.1, 1.9, 0, 2 * Math.PI);
    cr.fill();
    cr.restore();
}

const SCALE = 1.7;

function paintVietnamFlag(cr) {
    // 3:2 flag, drawn centred in a 20 x 14 box, with a regular five-point star (slimmer points than before)
    roundRect(cr, 0.5, 0.65, 19, 12.7, 1.8);
    cr.clip();
    cr.setSourceRGBA(0.855, 0.145, 0.114, 1);
    cr.paint();
    cr.setSourceRGBA(1, 1, 0, 1);
    const cx = 10;
    const cy = 7.1;
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 4.6 : 1.76;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0)
            cr.moveTo(x, y);
        else
            cr.lineTo(x, y);
    }
    cr.closePath();
    cr.fill();
}

// every icon that can be clicked gets the same drawing width, so its hover pill is the same size as the others
const ICON_W = 56;

function makeArea(width, height, paint, scale = SCALE, minWidth = 0) {
    const areaW = Math.max(Math.round(width * scale), minWidth);
    const offX = (areaW - width * scale) / 2;
    const area = new St.DrawingArea({
        width: areaW,
        height: Math.round(height * scale),
        y_align: Clutter.ActorAlign.CENTER,
        y_expand: true,
    });
    area.connect('repaint', () => {
        const cr = area.get_context();
        const c = area.get_theme_node().get_foreground_color();
        const fg = {r: c.red / 255, g: c.green / 255, b: c.blue / 255, a: c.alpha / 255};
        cr.translate(offX, 0);
        cr.scale(scale, scale);
        paint(cr, fg);
        cr.$dispose();
    });
    return area;
}

export default class MacBar extends Extension {
    enable() {
        this._tries = 0;
        this._source = 0;
        this._pulseSrc = 0;
        this._attempt();
    }

    // quick settings builds its indicators asynchronously at login, so retry until ready
    _attempt() {
        const qs = Main.panel.statusArea.quickSettings;
        if (qs && qs._system && qs._network && qs._volumeOutput && qs._bluetooth &&
            qs._system.get_parent() === qs._indicators) {
            try {
                this._build(qs);
            } catch (e) {
                // never leave the bar half-built: log it and put everything back
                logError(e, 'macbar: failed to build, restoring the stock bar');
                this.disable();
            }
            return;
        }
        if (++this._tries > 40)
            return;
        this._source = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._source = 0;
            this._attempt();
            return GLib.SOURCE_REMOVE;
        });
    }

    _build(qs) {
        this._qs = qs;
        this._links = [];
        this._clockIds = [];
        this._clockIdle = 0;
        this._state = {wifi: 0, wifiOff: false, vol: 0, muted: false, btOff: false, airOn: false, pct: 0, charging: false, full: false, wifiPulse: 3, hasBat: false};

        // park the stock indicators out of sight; their state is read from here
        this._holder = new St.Widget({visible: false});
        Main.uiGroup.add_child(this._holder);
        this._parked = [];
        for (const ind of [qs._system, qs._network, qs._volumeOutput, qs._bluetooth, qs._rfkill].filter(Boolean)) {
            const parent = ind.get_parent();
            this._parked.push({ind, parent, index: parent.get_children().indexOf(ind)});
            parent.remove_child(ind);
            this._holder.add_child(ind);
        }

        // status items (no hover, no menu; click toggles the thing off)
        this._battArea = makeArea(26, 15, (cr, fg) => paintBattery(cr, fg, this._state.pct, this._state.charging, this._state.full), 2.34);
        this._battLabel = new St.Label({style_class: 'macbar-label', y_align: Clutter.ActorAlign.CENTER, y_expand: true});
        this._batt = this._makeItem([this._battLabel, this._battArea], null);
        this._batt.add_style_class_name('macbar-batt');

        this._airArea = makeArea(16, 16, (cr, fg) => paintAirplane(cr, fg, this._state.airOn), 2.0, ICON_W);
        this._air = this._makeItem([this._airArea], () => {
            const manager = qs._rfkill?._rfkillToggle?._manager;
            if (manager)
                manager.airplaneMode = !manager.airplaneMode;
        });

        this._btArea = makeArea(12, 16, (cr, fg) => paintBluetooth(cr, fg, this._state.btOff), 1.85, ICON_W);
        this._bt = this._makeItem([this._btArea], () => qs._bluetooth._client.toggleActive());

        this._volArea = makeArea(18, 16, (cr, fg) => paintVolume(cr, fg, this._state.vol, this._state.muted), 2.33, ICON_W);
        this._volItem = this._makeItem([this._volArea], () => {
            const control = qs._volumeOutput._control;
            const sink = control.get_default_sink();
            if (!sink)
                return;
            if (!this._state.muted) {
                sink.change_is_muted(true);
                return;
            }
            // unmuting: if there is no previous level to come back to, use 80%
            const max = control.get_vol_max_norm();
            if (sink.volume < max * 0.02) {
                sink.volume = Math.round(max * 0.8);
                sink.push_volume();
            }
            sink.change_is_muted(false);
        });

        this._wifiArea = makeArea(22, 16, (cr, fg) => paintWifi(cr, fg, this._state.wifiBusy ? this._state.wifiPulse : this._state.wifi, this._state.wifiOff), 2.04, ICON_W);
        this._wifi = this._makeItem([this._wifiArea], () => {
            const client = qs._network._wirelessToggle?._client;
            if (client)
                client.wireless_enabled = !client.wireless_enabled;
        });

        // quick way into the Settings app
        this._gearArea = makeArea(16, 16, (cr, fg) => paintGear(cr, fg), 2.1, ICON_W);
        this._gear = this._makeItem([this._gearArea], () => {
            const app = Shell.AppSystem.get_default().lookup_app('org.gnome.Settings.desktop');
            if (app)
                app.activate();
            else
                GLib.spawn_command_line_async('gnome-control-center');
        });

        // control-centre glyph inside the stock quick-settings button (keeps its menu)
        this._ccArea = makeArea(16, 14, (cr, fg) => paintControlCenter(cr, fg), 2.13, ICON_W);
        this._cc = new St.BoxLayout({style_class: 'macbar-cc'});
        this._cc.add_child(this._ccArea);
        qs._indicators.add_child(this._cc);

        const box = Main.panel._rightBox;
        for (const item of [this._batt, this._air, this._bt, this._volItem, this._wifi, this._gear])
            box.insert_child_at_index(item, box.get_children().indexOf(qs.container));

        // Vietnamese flag next to the input-source indicator (always shown)
        const kb = Main.panel.statusArea.keyboard;
        if (kb) {
            this._flagArea = makeArea(20, 14, cr => paintVietnamFlag(cr), 2.05);
            this._flag = this._makeItem([this._flagArea], null);
            this._flag.add_style_class_name('macbar-flag');
            box.insert_child_at_index(this._flag, box.get_children().indexOf(kb.container));
        }

        this._buildUserButton();
        this._fixClockFormat();

        // clock to the far right
        const clock = Main.panel.statusArea.dateMenu?.container;
        if (clock) {
            const parent = clock.get_parent();
            this._clock = {clock, parent, index: parent.get_children().indexOf(clock)};
            parent.remove_child(clock);
            box.add_child(clock);
            // Just Perfection (and anything else that lays out the bar) may move the clock later, e.g. when it
            // loads after us at login, so keep putting it back at the far right
            for (const sig of ['child-added', 'child-removed'])
                this._clockIds.push(box.connect(sig, () => this._queueClockLast()));
            this._queueClockLast(2000);
        }

        this._initTheme();

        const left = Main.panel._leftBox;
        this._leftIds = ['child-added', 'child-removed'].map(sig => left.connect(sig, () => this._queueBoldLeft()));
        this._boldTargets = [];
        this._boldIdle = 0;
        this._queueBoldLeft();

        // follow the stock indicators
        this._watch(qs._system._indicator, 'notify::icon-name', () => this._sync());
        this._watch(qs._system._indicator, 'notify::visible', () => this._sync());
        this._watch(qs._system._percentageLabel, 'notify::text', () => this._sync());
        const powerProxy = qs._system._systemItem?.powerToggle?._proxy;
        if (powerProxy)
            this._watch(powerProxy, 'g-properties-changed', () => this._sync());
        this._watch(qs._network._primaryIndicator, 'notify::icon-name', () => this._sync());
        this._watch(qs._network._primaryIndicator, 'notify::visible', () => this._sync());
        this._watch(qs._volumeOutput._indicator, 'notify::icon-name', () => this._sync());
        this._watch(qs._volumeOutput._indicator, 'notify::visible', () => this._sync());
        const wifiToggle = qs._network._wirelessToggle;
        if (wifiToggle) {
            this._watch(wifiToggle, 'notify::visible', () => this._sync());
            if (wifiToggle._client)
                this._watch(wifiToggle._client, 'notify::wireless-enabled', () => this._sync());
        }
        this._watch(qs._bluetooth._client, 'notify::active', () => this._sync());
        this._watch(qs._bluetooth._client, 'notify::available', () => this._sync());
        const airToggle = qs._rfkill?._rfkillToggle;
        if (airToggle) {
            this._watch(airToggle, 'notify::visible', () => this._sync());
            this._watch(airToggle, 'notify::checked', () => this._sync());
        }
        this._sync();
    }

    // ---- top-bar look: light / dark / transparent, picked from the mode button ----
    _initTheme() {
        this._settings = this.getSettings();
        this._hoverBg = 'rgba(242, 242, 242, 0.16)';
        this._themeCount = 0;
        this._themeFile = null;
        try {
            const dir = GLib.build_filenamev([GLib.path_get_dirname(this.path), 'blur-my-shell@aunetx', 'schemas']);
            const src = Gio.SettingsSchemaSource.new_from_directory(dir, Gio.SettingsSchemaSource.get_default(), false);
            const schema = src.lookup('org.gnome.shell.extensions.blur-my-shell.panel', true);
            this._bms = schema ? new Gio.Settings({settings_schema: schema}) : null;
        } catch (e) {
            this._bms = null;
        }
        this._buildModeButton();
        this._arrangeRight();
        // With a menu open, GNOME re-targets to any other bar button the pointer enters. Keep the open menu
        // until the user clicks elsewhere instead.
        const mm = Main.panel.menuManager;
        this._ownChangeMenu = Object.prototype.hasOwnProperty.call(mm, '_changeMenu') ? mm._changeMenu : null;
        mm._changeMenu = () => {};
        this._applyMode();
        this._applyHide(false);
        // applies whether the change came from the menu or from outside (dconf, another tool)
        this._settingsIds = [
            this._settings.connect('changed::mode', () => this._applyMode()),
            this._settings.connect('changed::text-color', () => this._applyColor()),
            this._settings.connect('changed::autohide', () => this._applyHide(true)),
        ];
    }

    _modeLook() {
        const mode = this._settings.get_string('mode');
        if (mode === 'light')
            return {pipeline: 'macbar_light', text: '#141416'};
        if (mode === 'transparent')
            return {pipeline: 'macbar_clear', text: this._settings.get_string('text-color')};
        return {pipeline: 'macbar_dark', text: '#f2f2f2'};
    }

    // look: pipeline (blur + tint) and text colour for the current mode
    _applyMode() {
        const {pipeline, text} = this._modeLook();
        // Blur my Shell's static blur takes its look from named pipelines (blur + optional tint)
        if (this._bms)
            this._bms.set_string('pipeline', pipeline);
        this._applyTextColor(text);

        const mode = this._settings.get_string('mode');
        for (const [id, item] of Object.entries(this._modeItems))
            item.setOrnament(id === mode ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
        this._swatchItem.setSensitive(mode === 'transparent');
        this._customItem.setSensitive(mode === 'transparent');
        this._refreshColorWidgets();
    }

    // only the text colour changed (swatch, hex box or slider)
    _applyColor() {
        if (this._settings.get_string('mode') === 'transparent')
            this._applyTextColor(this._settings.get_string('text-color'));
        this._refreshColorWidgets();
    }

    _refreshColorWidgets() {
        const color = this._settings.get_string('text-color').toLowerCase();
        for (const [hex, btn] of this._swatches)
            btn.set_style(this._swatchStyle(hex, hex === color));
        this._syncCustomColor(color);
    }

    // only the auto-hide choice changed; `restart` re-reads the Hide Top Bar options
    _applyHide(restart) {
        const hide = this._settings.get_string('autohide');
        for (const [id, item] of Object.entries(this._hideItems))
            item.setOrnament(id === hide ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
        this._applyAutohide(hide, restart);
    }

    // auto-hide is handled by the "Hide Top Bar" extension, switched on and off from here
    // Hide Top Bar remembers "where the bar lives" as wherever it is when it starts, and puts it back there when it
    // stops. If it starts while the bar is mid-slide that memory is wrong and the bar stays off-screen, so always put
    // the bar at its real place before starting it, and again after stopping it.
    _restoreBar() {
        const box = Main.layoutManager.panelBox;
        box.remove_all_transitions();
        box.show();
        box.y = Main.layoutManager.primaryMonitor.y;
    }

    _applyAutohide(hide, restart) {
        const mgr = Main.extensionManager;
        const ext = mgr.lookup(HIDETOPBAR);
        if (!ext)
            return;
        const enabled = ext.state === 1; // ExtensionState.ENABLED
        if (hide === 'off') {
            if (enabled)
                this._easeBarThenDisable();
            else
                this._restoreBar();
            return;
        }
        try {
            const dir = GLib.build_filenamev([GLib.path_get_dirname(this.path), HIDETOPBAR, 'schemas']);
            const src = Gio.SettingsSchemaSource.new_from_directory(dir, Gio.SettingsSchemaSource.get_default(), false);
            const cfg = new Gio.Settings({settings_schema: src.lookup('org.gnome.shell.extensions.hidetopbar', true)});
            cfg.set_boolean('mouse-sensitive', true);          // reveal when the pointer hits the top edge
            cfg.set_boolean('show-in-overview', true);
            cfg.set_boolean('enable-active-window', false);    // any window counts, not just the focused one
            cfg.set_int('pressure-threshold', 1);              // reveal on the first push at the edge, not after a hard slam
            cfg.set_boolean('enable-intellihide', hide === 'smart');
        } catch (e) {
            logError(e, 'macbar: could not configure Hide Top Bar');
        }
        // Hide Top Bar watches these options live, so smart <-> always needs no restart (a restart is what made it jump)
        if (!enabled) {
            this._restoreBar();
            mgr.enableExtension(HIDETOPBAR);
        }
    }

    // slide the bar back to its place first, then stop the extension, so turning auto-hide off does not make the bar jump
    _easeBarThenDisable() {
        const mgr = Main.extensionManager;
        const box = Main.layoutManager.panelBox;
        const y = Main.layoutManager.primaryMonitor.y;
        const finish = () => {
            // the choice may have changed again while the bar was sliding
            if (this._settings && this._settings.get_string('autohide') !== 'off')
                return;
            mgr.disableExtension(HIDETOPBAR);
            // once it has stopped, make sure the bar really is back in its place
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                if (this._settings && this._settings.get_string('autohide') === 'off')
                    this._restoreBar();
                return GLib.SOURCE_REMOVE;
            });
        };
        box.show();
        if (box.y === y) {
            finish();
            return;
        }
        box.ease({
            y,
            duration: 180,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: finish,
        });
    }

    // keep the hex box and the three sliders showing the current text colour
    _syncCustomColor(hex) {
        const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
        if (!m)
            return;
        this._syncing = true;
        const rgb = [m[1], m[2], m[3]].map(v => parseInt(v, 16));
        if (!this._dragging) {
            this._sliders.forEach((sl, i) => {
                sl.value = rgb[i] / 255;
            });
        }
        if (!this._hexEntry.clutter_text.has_key_focus())
            this._hexEntry.set_text(`#${m[1]}${m[2]}${m[3]}`.toLowerCase());
        this._preview.set_style(`width: 22px; height: 22px; border-radius: 999px; background-color: #${m[1]}${m[2]}${m[3]}; border: 2px solid rgba(128, 128, 128, 0.55);`);
        this._syncing = false;
    }

    _pushSliderColor() {
        const h = v => Math.round(v * 255).toString(16).padStart(2, '0');
        this._setTextColor(`#${h(this._sliders[0].value)}${h(this._sliders[1].value)}${h(this._sliders[2].value)}`);
    }

    _setTextColor(hex) {
        if (this._settings.get_string('mode') !== 'transparent')
            return;
        if (this._settings.get_string('text-color').toLowerCase() !== hex.toLowerCase())
            this._settings.set_string('text-color', hex.toLowerCase());
    }

    // text and icon colour for the whole bar, applied as a small stylesheet loaded on top of the shell theme
    _applyTextColor(hex) {
        const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
        if (!m)
            return;
        const [r, g, b] = [m[1], m[2], m[3]].map(v => parseInt(v, 16));
        const col = `rgb(${r}, ${g}, ${b})`;
        const hover = `rgba(${r}, ${g}, ${b}, 0.16)`;
        const active = `rgba(${r}, ${g}, ${b}, 0.26)`;
        this._hoverBg = hover;
        const css = `
#panel .panel-button,
#panel .panel-button.clock-display,
#panel .panel-button .clock,
#panel .panel-button StLabel,
#panel .system-status-icon,
#panel .macbar-item,
#panel .macbar-cc,
#panel .macbar-label { color: ${col}; }
#panel .panel-button:hover,
#panel .panel-button:focus { box-shadow: inset 0 0 0 100px ${hover}; }
#panel .panel-button:active,
#panel .panel-button:checked { box-shadow: inset 0 0 0 100px ${active}; }
#panel .panel-button.clock-display:hover .clock,
#panel .panel-button.clock-display:focus .clock { box-shadow: inset 0 0 0 100px ${hover}; }
#panel .panel-button.clock-display:active .clock,
#panel .panel-button.clock-display:checked .clock { box-shadow: inset 0 0 0 100px ${active}; }
`;
        const dir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'macbar']);
        GLib.mkdir_with_parents(dir, 0o755);
        const path = GLib.build_filenamev([dir, `theme-${++this._themeCount}.css`]);
        GLib.file_set_contents(path, css);
        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        const file = Gio.File.new_for_path(path);
        if (this._themeFile) {
            theme.unload_stylesheet(this._themeFile);
            try {
                this._themeFile.delete(null);
            } catch (e) { /* already gone */ }
        }
        theme.load_stylesheet(file);
        this._themeFile = file;
        // icons read their colour from the theme, so repaint once the new style has applied
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            for (const a of [this._battArea, this._airArea, this._btArea, this._volArea, this._wifiArea, this._ccArea, this._modeArea, this._gearArea])
                a?.queue_repaint();
            return GLib.SOURCE_REMOVE;
        });
    }

    _swatchStyle(hex, selected) {
        return `width: 22px; height: 22px; border-radius: 999px; background-color: ${hex}; ` +
            `margin: 0 3px; border: 2px solid ${selected ? '#ffffff' : 'rgba(128, 128, 128, 0.55)'};` +
            (selected ? ' box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);' : '');
    }

    _buildModeButton() {
        const qs = this._qs;
        this._modeArea = makeArea(16, 16, (cr, fg) => paintModeIcon(cr, fg), 2.18, ICON_W);
        this._modeBtn = new PanelMenu.Button(0.5, 'MacBar mode', false);
        this._modeBtn.add_style_class_name('macbar-modebtn');
        this._modeBtn.add_child(this._modeArea);

        const menu = this._modeBtn.menu;
        this._modeItems = {};
        for (const [id, label] of [['light', 'Light'], ['dark', 'Dark'], ['transparent', 'Transparent']]) {
            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => this._settings.set_string('mode', id));
            menu.addMenuItem(item);
            this._modeItems[id] = item;
        }

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Text & icon colour (Transparent mode)'));
        this._swatchItem = new PopupMenu.PopupBaseMenuItem({activate: false});
        const row = new St.BoxLayout({x_expand: true, x_align: Clutter.ActorAlign.CENTER});
        this._swatches = [];
        for (const hex of ['#ffffff', '#1c1c1e', '#ffd60a', '#ff9f0a', '#ff453a', '#30d158', '#64d2ff', '#bf5af2']) {
            const btn = new St.Button({reactive: true, can_focus: true});
            btn.connect('clicked', () => this._setTextColor(hex));
            row.add_child(btn);
            this._swatches.push([hex, btn]);
        }
        this._swatchItem.add_child(row);
        menu.addMenuItem(this._swatchItem);

        // custom colour: hex box + R / G / B sliders
        this._customItem = new PopupMenu.PopupBaseMenuItem({activate: false});
        const col = new St.BoxLayout({vertical: true, x_expand: true, style: 'spacing: 6px;'});
        const top = new St.BoxLayout({x_expand: true, style: 'spacing: 8px;'});
        top.add_child(new St.Label({text: 'Custom', y_align: Clutter.ActorAlign.CENTER}));
        this._hexEntry = new St.Entry({hint_text: '#rrggbb', can_focus: true, x_expand: true, style: 'min-width: 90px;'});
        this._hexEntry.clutter_text.connect('activate', () => {
            const t = this._hexEntry.get_text().trim();
            if (/^#?[0-9a-f]{6}$/i.test(t))
                this._setTextColor(t.startsWith('#') ? t : `#${t}`);
        });
        top.add_child(this._hexEntry);
        this._preview = new St.Widget({y_align: Clutter.ActorAlign.CENTER});
        top.add_child(this._preview);
        col.add_child(top);

        this._sliders = [];
        this._pendingColor = 0;
        ['R', 'G', 'B'].forEach((name, i) => {
            const line = new St.BoxLayout({x_expand: true, style: 'spacing: 8px;'});
            line.add_child(new St.Label({text: name, y_align: Clutter.ActorAlign.CENTER, style: 'min-width: 14px;'}));
            const sl = new Slider.Slider(0);
            sl.x_expand = true;
            sl.style = 'min-width: 150px;';
            sl.connect('drag-begin', () => {
                this._dragging = true;
            });
            sl.connect('drag-end', () => {
                this._dragging = false;
                this._pushSliderColor();
            });
            sl.connect('notify::value', () => {
                if (this._syncing)
                    return;
                // dragging fires a lot of changes: apply at a steady pace, and once more when the drag ends
                if (this._pendingColor)
                    return;
                this._pendingColor = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 160, () => {
                    this._pendingColor = 0;
                    this._pushSliderColor();
                    return GLib.SOURCE_REMOVE;
                });
            });
            line.add_child(sl);
            col.add_child(line);
            this._sliders.push(sl);
        });
        this._customItem.add_child(col);
        menu.addMenuItem(this._customItem);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Auto-hide top bar'));
        this._hideItems = {};
        for (const [id, label] of [['off', 'Off'], ['smart', 'Smart (when a window covers it)'], ['always', 'Always (show on hover at the top edge)']]) {
            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => this._settings.set_string('autohide', id));
            menu.addMenuItem(item);
            this._hideItems[id] = item;
        }

        const box = Main.panel._rightBox;
        Main.panel.addToStatusArea('macbar-mode', this._modeBtn, box.get_children().indexOf(qs.container), 'right');
    }

    // right-hand order: input source, airplane, bluetooth, volume, wifi, battery, control centre, top-bar settings, cog, clock
    // (only the battery moves: it takes the slot next to the control centre and pushes the icon row left)
    _arrangeRight() {
        const box = Main.panel._rightBox;
        const kb = Main.panel.statusArea.keyboard?.container;
        const chain = [this._air, this._bt, this._volItem, this._wifi, this._batt,
            this._qs.container, this._modeBtn.container, this._gear];
        let prev = kb && kb.get_parent() === box ? kb : null;
        for (const actor of chain) {
            if (prev)
                box.set_child_above_sibling(actor, prev);
            else
                box.set_child_below_sibling(actor, box.get_first_child());
            prev = actor;
        }
    }

    // ---- signed-in user: name on the bar, click for the account list and Log Out ----
    _buildUserButton() {
        const box = Main.panel._rightBox;
        const btn = new PanelMenu.Button(0.5, 'MacBar user', false);
        this._userLabel = new St.Label({text: GLib.get_user_name(), y_align: Clutter.ActorAlign.CENTER});
        btn.add_child(this._userLabel);
        btn.menu.box.set_style('min-width: 280px;');
        // refresh when it closes, so the next opening shows current data; never leave it empty,
        // because GNOME will not open a popup menu that has no items
        btn.menu.connect('open-state-changed', (_menu, open) => {
            if (!open)
                this._fillUserMenu();
        });
        this._userBtn = btn;

        const anchor = this._flag ?? Main.panel.statusArea.keyboard?.container ?? this._qs.container;
        Main.panel.addToStatusArea('macbar-user', btn, box.get_children().indexOf(anchor), 'right');

        this._userMgr = AccountsService.UserManager.get_default();
        this._userLoadedId = this._userMgr.connect('notify::is-loaded', () => {
            this._updateUserName();
            this._fillUserMenu();
        });
        this._userChangedIds = ['user-added', 'user-removed', 'user-changed']
            .map(sig => this._userMgr.connect(sig, () => {
                this._updateUserName();
                if (!this._userBtn.menu.isOpen)
                    this._fillUserMenu();
            }));
        this._updateUserName();
        this._fillUserMenu();
    }

    _updateUserName() {
        let name = '';
        try {
            if (this._userMgr.is_loaded)
                name = this._userMgr.get_user(GLib.get_user_name())?.get_real_name() ?? '';
        } catch (e) { /* fall back to the login name */ }
        this._userLabel.set_text(name && name !== 'Unknown' ? name : GLib.get_user_name());
    }

    _userAvatar(user, size) {
        const path = user?.get_icon_file();
        if (path && GLib.file_test(path, GLib.FileTest.EXISTS)) {
            return new St.Icon({
                gicon: new Gio.FileIcon({file: Gio.File.new_for_path(path)}),
                icon_size: size,
                style: 'border-radius: 999px;',
            });
        }
        return new St.Icon({icon_name: 'avatar-default-symbolic', icon_size: size});
    }

    _userRow(user, current) {
        const item = new PopupMenu.PopupBaseMenuItem({activate: false, reactive: false, can_focus: false});
        const row = new St.BoxLayout({x_expand: true, style: 'spacing: 12px;'});
        row.add_child(this._userAvatar(user, current ? 48 : 36));

        const col = new St.BoxLayout({vertical: true, y_align: Clutter.ActorAlign.CENTER, x_expand: true});
        const real = user.get_real_name();
        const title = real && real !== user.get_user_name() ? real : user.get_user_name();
        col.add_child(new St.Label({text: current ? `${title} (you)` : title, style: 'font-weight: bold;'}));
        const kind = user.get_account_type() === AccountsService.UserAccountType.ADMINISTRATOR ? 'Administrator' : 'Standard';
        col.add_child(new St.Label({text: `@${user.get_user_name()} · ${kind}`, style: 'font-size: 0.9em; opacity: 170;'}));
        let last = '';
        try {
            const t = user.get_login_time();
            if (t > 0)
                last = GLib.DateTime.new_from_unix_local(t).format('%a %d %b, %H:%M');
        } catch (e) { /* no login time */ }
        if (current)
            col.add_child(new St.Label({text: `${user.get_home_dir()}`, style: 'font-size: 0.9em; opacity: 170;'}));
        if (last)
            col.add_child(new St.Label({text: `Last login: ${last}`, style: 'font-size: 0.9em; opacity: 170;'}));
        row.add_child(col);
        item.add_child(row);
        return item;
    }

    _fillUserMenu() {
        if (this._filling)
            return;
        this._filling = true;
        try {
            this._fillUserMenuNow();
        } finally {
            this._filling = false;
        }
    }

    _fillUserMenuNow() {
        const menu = this._userBtn.menu;
        // clear every child directly, so nothing can survive from an earlier fill
        for (const child of menu.box.get_children())
            child.destroy();
        try {
            const me = GLib.get_user_name();
            const users = this._userMgr.list_users().filter(u => !u.is_system_account());
            users.sort((a, b) => (a.get_user_name() === me ? -1 : 0) - (b.get_user_name() === me ? -1 : 0) ||
                a.get_user_name().localeCompare(b.get_user_name()));
            const current = users.find(u => u.get_user_name() === me);
            if (current)
                menu.addMenuItem(this._userRow(current, true));
            else
                menu.addMenuItem(new PopupMenu.PopupMenuItem(this._userLabel.get_text(), {reactive: false}));  // account list not loaded yet
            const others = users.filter(u => u !== current);
            if (others.length) {
                menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Other users on this computer'));
                for (const u of others)
                    menu.addMenuItem(this._userRow(u, false));
            }
        } catch (e) {
            logError(e, 'macbar: could not read the user list');
            menu.addMenuItem(new PopupMenu.PopupMenuItem(GLib.get_user_name(), {reactive: false}));
        }
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const out = new PopupMenu.PopupMenuItem('Log Out…');
        out.insert_child_at_index(new St.Icon({icon_name: 'system-log-out-symbolic', style_class: 'popup-menu-icon'}), 0);
        out.connect('activate', () => this._confirmLogout());
        menu.addMenuItem(out);
    }

    // ask first: nothing happens until the user presses Log Out in this dialog
    _confirmLogout() {
        this._userBtn.menu.close();
        this._logoutDialog?.destroy();
        const name = this._userLabel.get_text();
        const dialog = new ModalDialog.ModalDialog({destroyOnClose: true});
        dialog.contentLayout.add_child(new Dialog.MessageDialogContent({
            title: 'Log Out',
            description: `Log out of ${name}? Any unsaved work in your open applications will be lost.`,
        }));
        dialog.addButton({label: 'Cancel', action: () => dialog.close(), key: Clutter.KEY_Escape});
        dialog.addButton({label: 'Log Out', action: () => {
            dialog.close();
            this._logout();
        }});
        dialog.connect('destroy', () => {
            if (this._logoutDialog === dialog)
                this._logoutDialog = null;
        });
        this._logoutDialog = dialog;
        dialog.open();
    }

    _logout() {
        // mode 1: log out without a second confirmation, because the dialog above already asked
        Gio.DBus.session.call('org.gnome.SessionManager', '/org/gnome/SessionManager', 'org.gnome.SessionManager',
            'Logout', new GLib.Variant('(u)', [1]), null, Gio.DBusCallFlags.NONE, -1, null, (conn, res) => {
                try {
                    conn.call_finish(res);
                } catch (e) {
                    logError(e, 'macbar: Logout over D-Bus failed, trying gnome-session-quit');
                    GLib.spawn_command_line_async('gnome-session-quit --logout');
                }
            });
    }

    // bold app name on the left: the global menu's first button and Window Title Is Back's app label
    _boldLeft() {
        const sa = Main.panel.statusArea;
        const targets = [];
        const gm = sa['globalmenu@ShiroOSL.github.io-0'];
        const gmLabel = gm?.get_children().find(a => a instanceof St.Label);
        if (gmLabel)
            targets.push(gmLabel);
        const wt = sa['focused-window-indicator']?._app;
        if (wt)
            targets.push(wt);
        for (const t of targets)
            t.add_style_class_name('macbar-bold');
        this._boldTargets = targets;
    }

    _queueBoldLeft() {
        if (this._boldIdle)
            return;
        this._boldIdle = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 120, () => {
            this._boldIdle = 0;
            this._boldLeft();
            return GLib.SOURCE_REMOVE;
        });
    }

    // clock text as "Sun 11 Oct  03:28" (weekday, day, month) like the macOS menu bar. GNOME builds the string from the
    // system locale (en_US gives "Sun Oct 11"), so reorder it here and the result does not depend on the locale.
    _fixClockFormat() {
        const label = Main.panel.statusArea.dateMenu?._clockDisplay;
        if (!label)
            return;
        const fix = () => {
            if (this._fixingClock)
                return;
            const m = /^(\S+)\s+(\S+)\s+(\d{1,2})(\s+\S.*)$/.exec(label.get_text());
            if (!m)
                return;
            this._fixingClock = true;
            label.set_text(`${m[1]} ${m[3]} ${m[2]}${m[4]}`);
            this._fixingClock = false;
        };
        this._clockLabel = label;
        this._clockTextId = label.connect('notify::text', fix);
        fix();
    }

    _queueClockLast(delay = 0) {
        if (this._clockIdle)
            return;
        this._clockIdle = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay + 50, () => {
            this._clockIdle = 0;
            this._clockLast();
            return GLib.SOURCE_REMOVE;
        });
    }

    _clockLast() {
        if (!this._clock)
            return;
        const box = Main.panel._rightBox;
        const clock = this._clock.clock;
        const parent = clock.get_parent();
        if (parent !== box) {
            parent?.remove_child(clock);
            box.add_child(clock);
        } else if (box.get_last_child() !== clock) {
            box.set_child_above_sibling(clock, null);
        }
    }

    _makeItem(children, onClick) {
        const item = new St.BoxLayout({
            style_class: 'macbar-item',
            reactive: true,
            track_hover: !!onClick,
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
        });
        if (onClick) {
            item.add_style_class_name('macbar-clickable');
            item.connect('notify::hover', () => {
                item.set_style(item.hover
                    ? `background-color: ${this._hoverBg}; border-radius: 999px;`
                    : null);
            });
        }
        for (const c of children) {
            // centre the icon inside the fixed-size hover pill
            if (onClick) {
                c.x_expand = true;
                c.x_align = Clutter.ActorAlign.CENTER;
            }
            item.add_child(c);
        }
        item.connect('button-press-event', () => {
            if (onClick)
                onClick();
            return Clutter.EVENT_STOP;
        });
        return item;
    }

    // while wifi is on but not connected yet, ripple the arcs so it clearly reads as "on, connecting"
    _setPulse(on) {
        if (on && !this._pulseSrc) {
            this._pulseSrc = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 350, () => {
                this._state.wifiPulse = (this._state.wifiPulse + 1) % 4;
                this._wifiArea?.queue_repaint();
                return GLib.SOURCE_CONTINUE;
            });
        } else if (!on && this._pulseSrc) {
            GLib.source_remove(this._pulseSrc);
            this._pulseSrc = 0;
        }
    }

    _watch(obj, signal, cb) {
        this._links.push([obj, obj.connect(signal, cb)]);
    }

    _sync() {
        const qs = this._qs;
        const s = this._state;

        const proxy = qs._system._systemItem?.powerToggle?._proxy;
        if (proxy && proxy.IsPresent !== null && proxy.IsPresent !== undefined) {
            // UPower device states: 1 charging, 4 fully charged, 5 pending charge
            s.hasBat = !!proxy.IsPresent;
            s.pct = Math.round(proxy.Percentage ?? 0);
            // plugged in = charging (1), fully charged (4) or pending charge (5); UPower walks through these
            // within seconds of connecting, so show the bolt for all of them instead of waiting for "charging"
            s.charging = proxy.State === 1 || proxy.State === 4 || proxy.State === 5;
            s.full = proxy.State === 4 || proxy.State === 5;
        } else {
            const bat = qs._system._indicator;
            s.hasBat = bat.visible;
            const m = /(\d+)\s*%/.exec(qs._system._percentageLabel.text ?? '');
            s.pct = m ? parseInt(m[1]) : 0;
            s.charging = /-charging/.test(bat.icon_name ?? '');
            s.full = /charged/.test(bat.icon_name ?? '');
        }
        this._batt.visible = s.hasBat;
        this._battLabel.text = s.hasBat ? `${s.pct}%` : '';
        this._battArea.queue_repaint();

        // wifi: always shown when the hardware exists; greyed out when off
        const wifiToggle = qs._network._wirelessToggle;
        const client = wifiToggle?._client;
        const nn = qs._network._primaryIndicator.icon_name ?? '';
        s.wifiOff = client ? !client.wireless_enabled : false;
        const levels = {excellent: 3, good: 2, ok: 1, weak: 1, none: 0};
        const lv = /signal-(\w+)-/.exec(nn);
        const connected = /network-wireless-(signal|connected)/.test(nn);
        s.wifi = lv ? (levels[lv[1]] ?? 3) : (connected ? 3 : 0);
        s.wifiBusy = !!client && client.wireless_enabled && !connected;
        this._setPulse(s.wifiBusy);
        this._wifi.visible = !!wifiToggle?.visible;
        this._wifiArea.queue_repaint();

        // volume: speaker with an x when muted (or at 0)
        const vi = qs._volumeOutput._indicator;
        const vn = vi.icon_name ?? '';
        s.muted = /muted/.test(vn);
        s.vol = /low/.test(vn) ? 1 : /medium/.test(vn) ? 2 : 3;
        this._volItem.visible = vi.visible;
        this._volArea.queue_repaint();

        // bluetooth: shown whenever an adapter exists
        const bt = qs._bluetooth._client;
        s.btOff = !bt.active;
        this._bt.visible = bt.available;
        this._btArea.queue_repaint();

        // airplane mode
        const air = qs._rfkill?._rfkillToggle;
        s.airOn = !!air?.checked;
        this._air.visible = !!air?.visible;
        this._airArea.queue_repaint();
    }

    disable() {
        if (this._source) {
            GLib.source_remove(this._source);
            this._source = 0;
        }
        if (!this._qs)
            return;

        this._setPulse(false);
        if (this._pendingColor) {
            GLib.source_remove(this._pendingColor);
            this._pendingColor = 0;
        }
        const mm = Main.panel.menuManager;
        if (this._ownChangeMenu)
            mm._changeMenu = this._ownChangeMenu;
        else
            delete mm._changeMenu;
        this._ownChangeMenu = null;
        if (this._userMgr) {
            if (this._userLoadedId)
                this._userMgr.disconnect(this._userLoadedId);
            for (const id of this._userChangedIds ?? [])
                this._userMgr.disconnect(id);
        }
        this._userLoadedId = 0;
        this._userChangedIds = [];
        this._userMgr = null;
        this._logoutDialog?.destroy();
        this._logoutDialog = null;
        this._userBtn?.destroy();
        this._userBtn = null;
        this._modeBtn?.destroy();
        this._modeBtn = null;
        if (this._themeFile) {
            St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(this._themeFile);
            try {
                this._themeFile.delete(null);
            } catch (e) { /* already gone */ }
            this._themeFile = null;
        }
        for (const id of this._settingsIds ?? [])
            this._settings?.disconnect(id);
        this._settingsIds = [];
        this._settings = null;
        this._bms = null;
        for (const [obj, id] of this._links)
            obj.disconnect(id);
        this._links = [];

        if (this._clockLabel && this._clockTextId)
            this._clockLabel.disconnect(this._clockTextId);
        this._clockTextId = 0;
        Main.panel.statusArea.dateMenu?._clock?.notify('clock');
        this._clockLabel = null;
        if (this._boldIdle) {
            GLib.source_remove(this._boldIdle);
            this._boldIdle = 0;
        }
        for (const id of this._leftIds ?? [])
            Main.panel._leftBox.disconnect(id);
        this._leftIds = [];
        for (const t of this._boldTargets ?? [])
            t.remove_style_class_name('macbar-bold');
        this._boldTargets = [];
        if (this._clockIdle) {
            GLib.source_remove(this._clockIdle);
            this._clockIdle = 0;
        }
        for (const id of this._clockIds ?? [])
            Main.panel._rightBox.disconnect(id);
        this._clockIds = [];
        if (this._clock) {
            const {clock, parent, index} = this._clock;
            clock.get_parent()?.remove_child(clock);
            parent.insert_child_at_index(clock, index);
            this._clock = null;
        }

        for (const a of [this._batt, this._air, this._bt, this._volItem, this._wifi, this._gear, this._flag])
            a?.destroy();
        this._flag = null;
        this._qs._indicators.remove_child(this._cc);
        this._cc.destroy();

        for (const {ind, parent, index} of this._parked.reverse()) {
            this._holder.remove_child(ind);
            parent.insert_child_at_index(ind, index);
        }
        this._parked = [];
        this._holder.destroy();
        this._holder = null;
        this._qs = null;
    }
}
