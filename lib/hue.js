const HueLib = require('node-hue-api');
const HueApi = HueLib.HueApi;
const rgb = require('./rgb');
const settings = require("settings-store");
settings.init({
    appName: "daskeyboard-applet--hue", 
    publisherName: "DisabledMonkey",
    reverseDNS: "com.disabledmonkey.daskeyboard.hue"
});

class HueBridge {
    constructor(obj) {
        obj && Object.assign(this, obj);
        this.loggedIn = false;
        this.user = settings.value('bridge' + this.id,null); // if we already have registered this application with this bridge!
        if (this.user) {
            this.login();
        } else {
            // try for the next 60 seconds to register (give user time to run and hit button on their hue bridge)
            this.registerLoop(60);
        }
    }

    static async find(id) {
        let bridges = [];
        let hbridges = await HueLib.nupnpSearch();
        for (let b in hbridges) {
            let bridge = new HueBridge(hbridges[b]);
            if (typeof id != 'undefined' && id==bridge.id) {
                return bridge;
            }
            bridges.push(bridge);
        }
        return bridges;
    }

    async registerLoop(attempt,seconds) {
        if (attempt <= 0) { return false; }
        attempt--;
        seconds = seconds || 1000;
        setTimeout(function () {
            if (!this.loggedIn) {
                this.register();
                this.registerLoop(attempt,seconds);
            }
        }.bind(this), seconds);
    }

    async register() {
        try {
            let h = new HueApi();
            this.user = await h.registerUser(this.ipaddress, 'Das Keyboard Q'); // need to make sure this happens shortly after the hue bridge button has been pushed.
            this.login();
            return true;
        } catch (error) {
            // just ignore errors
        }
        return false;
    }

    login() {
        this.api = new HueApi(this.ipaddress, this.user);
        settings.setValue('bridge' + this.id, this.user);
        this.loggedIn = true;
        return this;
    }

    async groups() {
        let groups = [];
        try {
            let allgroups = await this.api.groups();
            for (let g in allgroups) {
                groups.push(new HueGroup(this,allgroups[g])); 
            }
        } catch (error) {
            // just ignore errors
        }
        return groups;
    }

    async group(id) {
        let groups = await this.groups();
        for (let g in groups) {
            let group = groups[g];
            if (group.id==id) {
                return group;
            }
        }
        return null;
    }
}

class HueGroup {
    constructor(bridge,obj) {
        obj && Object.assign(this, obj);
        this.bridge = bridge;
        this.color = '#00ff00';
    }

    get api() {
        return this.bridge.api;
    }

    async refresh() {
        let g = await this.bridge.group(this.id);
        Object.assign(this, g);
        // get color from first light in group
        let light = new HueLight(this.bridge,await this.api.getLightStatus(this.lights[0])); 
        this.color = light.hex;
        return this;
    }

    async toggle() {
        this.refresh();
        let state = HueLib.lightState.create();
        switch (this.state.any_on) {
            case true: state.off(); break;
            case false: state.on(); break;
        }
        this.api.setGroupLightState(this.id, state);
    }
}

class HueLight {
    constructor(bridge,obj) {
        obj && Object.assign(this, obj);
        this.bridge = bridge;
    }

    get hex() {
        return this.rgbToHex(this.rgb);
    }

    get rgb() {
        if (this.state.xy) {
            return rgb.convertXYtoRGB(this.state.xy[0], this.state.xy[1], this.state.bri / 254);
        }
        return rgb.convertXYtoRGB(0.3227, 0.329, this.state.bri / 254); // white light
    }

    rgbToHex(rgb) {
        return '#'+this.intToHex(rgb[0])+this.intToHex(rgb[1])+this.intToHex(rgb[2]);
    }

    intToHex(i) {
        let hex = Number(i).toString(16);
        if (hex.length < 2) {
            hex = "0" + hex;
        }
        return hex;
    }
}

module.exports = {
    HueBridge: HueBridge,
    HueGroup: HueGroup
};