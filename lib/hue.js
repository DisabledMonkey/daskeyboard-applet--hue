const v3 = require('node-hue-api').v3;
const discovery = v3.discovery;
const hueApi = v3.api;
const GroupLightState = v3.lightStates.GroupLightState;

var EventSource = require('eventsource')
var os = require("os");
const rgb = require('./rgb');
const settings = require("settings-store");
settings.init({
    appName: "daskeyboard-applet--hue",
    publisherName: "DisabledMonkey",
    reverseDNS: "com.disabledmonkey.daskeyboard.hue"
});

const q = require('daskeyboard-applet');
const logger = q.logger;

class HueBridge {
    constructor(obj) {
        obj && Object.assign(this, obj);
        this.id = obj.config.name;
    }

    static async find(id) {
        let bridges = [];
        try {
            let hbridges = await discovery.nupnpSearch();
            for (let hbridge of hbridges) {
                let bridge = new HueBridge(hbridge);
                logger.info('Found Bridge: ' + bridge);
                await bridge.init(); // try to login
                if (typeof id != 'undefined' && id == bridge.id) {
                    return bridge;
                }
                bridges.push(bridge);
            }
        } catch (e) {
            logger.error(e);
        }
        return bridges;
    }

    async init() {
        this.loggedIn = false;
        this.setupApi = await hueApi.createLocal(this.ipaddress).connect();
        this.user = settings.value('bridge' + this.id, null); // if we already have registered this application with this bridge!
        if (this.user) {
            await this.login();
        } else {
            // try for the next 60 seconds to register (give user time to run and hit button on their hue bridge)
            await this.registerLoop(60);
        }
    }

    async registerLoop(attempt, seconds) {
        if (attempt <= 0) { return false; }
        attempt--;
        seconds = seconds || 1000;
        await setTimeout(function () {
            if (!this.loggedIn) {
                this.register();
                this.registerLoop(attempt, seconds);
            }
        }.bind(this), seconds);
    }

    async register() {
        logger.info('Register Bridge: ' + this.id);
        try {
            this.user = await this.setupApi.users.createUser('Das Keyboard Q', os.hostname()); // need to make sure this happens shortly after the hue bridge button has been pushed.
            await this.login();
            return true;
        } catch (error) {
            logger.error(error);
        }
        return false;
    }

    async login() {
        logger.info('Login Bridge: ' + this.id);
        this.api = await hueApi.createLocal(this.ipaddress).connect(this.user.username); //new HueApi(this.ipaddress, this.user);
        this.bridgeConfig = (await this.api.configuration.getConfiguration()).data;

        settings.setValue('bridge' + this.id, this.user);
        this.loggedIn = true;
        return this;
    }

    async on(onmessage, onerror) {
        // start loading 
        logger.info('Wait for server side events!');
        let url = 'https://' + this.ipaddress + '/eventstream/clip/v2';
        let streamConfig = {
            headers: {
                'hue-application-key': this.user.username,
                'Accept': 'text/event-stream'
            }
        };
        this.eventSource = new EventSource(url, streamConfig);
        this.eventSource.onmessage = onmessage;
        this.eventSource.onerror = onerror;
    }

    async groups() {
        let groups = [];
        try {
            let allgroups = await this.api.groups.getAll();
            for (let group of allgroups) {
                groups.push(new HueGroup(this, group));
            }
        } catch (error) {
            // just ignore errors
        }
        return groups;
    }

    async group(id) {
        let groups = await this.groups();
        return groups.find(group => group.id == id);
    }
}

class HueGroup {
    constructor(bridge, obj) {
        Object.assign(this, obj);
        Object.assign(this, obj.data);
        this.bridge = bridge;
        this.color = '#00ff00';
        this.refreshRate = 5000;

    }

    get api() {
        return this.bridge.api;
    }

    async light() {
        return await this.api.lights.getLightAttributesAndState(this.lights[0]);
    }

    async scheduleRefresh() {
        return await this.refresh();
    }

    async refresh() {
        let g = await this.bridge.group(this.id);
        Object.assign(this, g);
        // get color from first light in group
        let l = await this.light();
        let light = new HueLight(this.bridge, l);
        this.color = light.hex;
        return this;
    }

    async toggle() {
        await this.refresh();
        let state = new GroupLightState();
        switch (this.state.any_on) {
            case true: state.off(); break;
            case false: state.on(); break;
        }
        await this.api.groups.setGroupState(this.id, state);
    }
}

class HueLight {
    constructor(bridge, obj) {
        Object.assign(this, obj);
        Object.assign(this, obj.data);
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
        return '#' + this.intToHex(rgb[0]) + this.intToHex(rgb[1]) + this.intToHex(rgb[2]);
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