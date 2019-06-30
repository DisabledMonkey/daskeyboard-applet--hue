const q = require('daskeyboard-applet');
const logger = q.logger;
const HueBridge = require('./lib/hue.js').HueBridge;
//const QHook = require('./lib/q-hook.js').QHook;

class HueQ extends q.DesktopApp {
    constructor() {
        super();
        this.pollingInterval = 1000;
        this._rooms = null;
        this._room = null;
        //QHook.on(this,this.toggle.bind(this));
    }

    async run() {
        try {
            let room = await this.room();
            room.refresh();
            return new q.Signal({
                points: this.points(),
                name: 'Hue',
                message: this.message(),
                link: {
                    url: '', // wish something like this could trigger applet code! possibly protocols hueq://togglelights/5 etc.
                    label: 'Toggle Light!'
                },
                isMuted: true,
            });
        } catch (e) {
            return new q.Signal({
                points: [[new q.Point('#ff0000', q.Effects.BLINK)]],
                name: 'Hue',
                message: 'Failed to retrieve light information!',
                isMuted: true
            });
        }
    }

    message() {
        return this._room.name + ' lights are ' + (this._room.state.any_on ? 'on' : 'off') + '!';
    }

    points() {
        return [[new q.Point(this.color())]];
    }

    color() {
        return (this._room.state.any_on ? 
                (this.config.useLightColor ? this._room.color : this.config.onColor) : 
                this.config.offColor);
    }

    async rooms() {
        if (!this._rooms) {
            // get all rooms for all logged in bridges
            this._rooms = [];
            let bridges = await HueBridge.find();
            for (let b in bridges) {
                let bridge = bridges[b];
                if (bridge.loggedIn) {
                    let groups = await bridge.groups();
                    for (let g in groups) {
                        let group = groups[g];
                        if (group.type == 'Room') {
                            this._rooms.push(group);
                        }
                    }
                }
            }
        }
        return this._rooms;
    }

    async room() {
        if (!this._room) {
            let rconf = this.config.room;
            let r = rconf.split('-');
            let bridges = await HueBridge.find();
            for (let b in bridges) {
                let bridge = bridges[b];
                if (bridge.loggedIn && r[0]==bridge.id) {
                    this._room = await bridge.group(r[1]);
                }
            }
        }
        return this._room;
    }

    async toggle() {
        let room = await this.room();
        room.toggle();
    }

    async options(question) {
        switch (question) {
            case 'room':
                let options = [];
                let rooms = await this.rooms();
                if (rooms.length>0) {
                    for (let r in rooms) {
                        let room = rooms[r];
                        options.push({ key: room.bridge.id+'-'+room.id, value: room.name });
                    }
                } else {
                    options.push({ key: 0, value: 'Press the button on your hue bridge! Attempting to connect for the next 60 seconds.' });
                }
                return options;
        }
    }
}

module.exports = {
    HueQ: HueQ
};
const hueQ = new HueQ();