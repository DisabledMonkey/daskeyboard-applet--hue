const q = require('daskeyboard-applet');
const logger = q.logger;
const HueBridge = require('./lib/hue.js').HueBridge;

class HueQ extends q.DesktopApp {
    constructor() {
        super();
        this.pollingInterval = 1000 * 60 * 30; // only poll rarely, as we will only poll when we get events from hue
        logger.info("Hue Q ready to go!");
    }

    async processConfig(config) {
        logger.info("Process Config");
        let success = await super.processConfig(config);
        if (success) {
            if (typeof this.config.room != 'undefined') {
                logger.info("Listen for Hue Events!");
                this.bridgeId = this.config.room.split('-')[0];
                this.bridge = await HueBridge.find(this.bridgeId);
                this.roomId = this.config.room.split('-')[1];
                this.room = await this.bridge.group(this.roomId);
                this.bridge.on(this.onEvent.bind(this), this.onError.bind(this)); // after we loaded config, register for hue bridge events
            }
        }
    }

    async onEvent(message) {
        let events = JSON.parse(message.data);
        let doRefresh = false;
        if (this.room) {
            for (let event of events) {
                for (let item of event.data) {
                    if (item.owner.rtype == 'room') {
                        let roomId = item.id_v1.split('/').filter(i => i)[1];
                        if (roomId == this.room.id) {
                            doRefresh = true;
                        }
                    }
                }
            }
        }
        if (doRefresh) {
            this.poll();
        }
    }

    async onError(event) {
        console.error(event);
    }

    async handleFlash() {
        this.toggle(); // override flash functionality to toggle lights on/off
    }

    async run() {
        try {
            await this.room.refresh();
            let signal = {
                points: this.points(),
                name: 'Philips Hue',
                message: this.message(),
                isMuted: true,
            };
            logger.info(`${JSON.stringify(signal)}`);
            return new q.Signal(signal);
        } catch (e) {
            logger.error(`Sending error signal: ${e}`);
            setTimeout(this.poll.bind(this), 5000); // try again in 5 seconds if we fail!
            return new q.Signal({
                points: [[new q.Point('#ff0000', q.Effects.BLINK)]],
                name: 'Philips Hue',
                message: 'Failed to retrieve light information!',
                isMuted: true
            });
        }
    }

    message() {
        return this.room.name + ' lights are ' + (this.room.state.any_on ? 'on' : 'off') + '!';
    }

    points() {
        return [[new q.Point(this.color())]];
    }

    color() {
        return (this.room.state.any_on ?
            (this.config.useLightColor ? this.room.color : this.config.onColor) :
            this.config.offColor);
    }

    async rooms() {
        if (!this._rooms) {
            logger.info("Connecting to Bridges and getting Rooms");
            // get all rooms for all logged in bridges
            this._rooms = [];
            let bridges = await HueBridge.find();
            for (let bridge of bridges) {
                if (bridge.loggedIn) {
                    let groups = await bridge.groups();
                    for (let group of groups) {
                        if (group.type == 'Room') {
                            this._rooms.push(group);
                        }
                    }
                } else {
                    logger.info("Bridge: " + bridge.id + ' not logged in!');
                }
            }
            if (bridges.length == 0) {
                logger.info("No Bridges Found!");
            }
        }
        return this._rooms;
    }

    async toggle() {
        this.room.toggle();
    }

    async options(question) {
        switch (question) {
            case 'room':
                let options = [];
                let rooms = await this.rooms();
                if (rooms.length > 0) {
                    for (let room of rooms) {
                        options.push({ key: room.bridge.id + '-' + room.id, value: room.name });
                    }
                } else {
                    options.push({ key: 0, value: 'Please press the button on your hue bridge and start this configuration again.' });
                }
                return options;
        }
    }
}

module.exports = {
    HueQ: HueQ
};
const hueQ = new HueQ();