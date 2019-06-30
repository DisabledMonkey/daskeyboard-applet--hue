const iohook = require('iohook'); // not working when run as applet

class QHook {
    static on(app,callback) {
        let hook = new QHook(app,{ ctrlKey:true, shiftKey:true },callback);
        
    }

    constructor(app,options,callback) {
        this.app = app;
        this.callback = callback;
        if (typeof options == 'undefined') {
            options = {};
        }
        this.options = options;
        iohook.on('keydown',this.onKeyDown.bind(this));
        iohook.start();
    }

    onKeyDown(event) {
        let zone = this.passes(event);
        if (zone) {
            this.callback({
                zone: zone, 
                app: this.app
            });
        }
    }

    passes(event) {
        if (this.options.ctrlKey && !event.ctrlKey) { return false; }
        if (this.options.shiftKey && !event.shiftKey) { return false; }

        let zone = this.key2zone(event.rawcode);
        return this.inZone(zone); 
    }

    inZone(zone) {
        return (zone.x == this.app.geometry.origin.x && zone.y == this.app.geometry.origin.y ? zone : false);
    }

    key2zone(key) {
        let char = String.fromCharCode(key);
        switch (char) {
            // row 0
                // no esc
            case 'p': return {x:3,y:0}
            case 'q': return {x:4,y:0}
            case 'r': return {x:5,y:0}
            case 's': return {x:6,y:0}
            case 't': return {x:8,y:0}
            case 'u': return {x:9,y:0}
            case 'v': return {x:10,y:0}
            case 'w': return {x:11,y:0}
            case 'x': return {x:12,y:0}
            case 'y': return {x:13,y:0}
            case 'z': return {x:14,y:0}
            case '{': return {x:15,y:0}
            case ',': return {x:16,y:0}
            case '³': return {x:20,y:0}
            case '°': return {x:21,y:0}

            // row 1
            case 'À': return {x:0,y:1}
            case '0': return {x:1,y:1}
            case '1': return {x:2,y:1}
            case '2': return {x:3,y:1}
            case '3': return {x:4,y:1}
            case '4': return {x:5,y:1}
            case '5': return {x:6,y:1}
            case '6': return {x:7,y:1}
            case '7': return {x:8,y:1}
            case '8': return {x:9,y:1}
            case '9': return {x:10,y:1}
            case '½': return {x:12,y:1}
            case '»': return {x:13,y:1}
                // no backspace
            case '-': return {x:16,y:1}
            case '$': return {x:17,y:1}
            case '!': return {x:18,y:1}
                // no numlock
            case 'o': return {x:20,y:1}
            case 'j': return {x:21,y:1}
            case 'm': return {x:22,y:1}

            // row 2
                // no tab
            case 'Q': return {x:2,y:2}
            case 'W': return {x:3,y:2}
            case 'E': return {x:4,y:2}
            case 'R': return {x:5,y:2}
            case 'T': return {x:6,y:2}
            case 'Y': return {x:7,y:2}
            case 'U': return {x:8,y:2}
            case 'I': return {x:9,y:2}
            case 'O': return {x:10,y:2}
            case 'P': return {x:11,y:2}
            case 'Û': return {x:12,y:2}
            case 'Ý': return {x:13,y:2}
            case 'Ü': return {x:15,y:2}
            case '.': return {x:16,y:2}
            case '#': return {x:17,y:2}
            case '"': return {x:18,y:2}
            case 'g': return {x:19,y:2}
            case 'h': return {x:20,y:2}
            case 'i': return {x:21,y:2}
            case 'k': return {x:22,y:2}

            // row 3
                // no caps
            case 'A': return {x:3,y:3}
            case 'S': return {x:4,y:3}
            case 'D': return {x:5,y:3}
            case 'F': return {x:6,y:3}
            case 'G': return {x:7,y:3}
            case 'H': return {x:8,y:3}
            case 'J': return {x:9,y:3}
            case 'K': return {x:10,y:3}
            case 'L': return {x:11,y:3}
            case 'º': return {x:12,y:3}
            case 'Þ': return {x:13,y:3}
            case 'd': return {x:19,y:3}
            case 'e': return {x:20,y:3}
            case 'f': return {x:21,y:3}

            // row 4
                // no shift
            case 'Z': return {x:3,y:4}
            case 'X': return {x:4,y:4}
            case 'C': return {x:5,y:4}
            case 'V': return {x:6,y:4}
            case 'B': return {x:7,y:4}
            case 'N': return {x:8,y:4}
            case 'M': return {x:9,y:4}
            case '¼': return {x:10,y:4}
            case '¾': return {x:11,y:4}
            case '¿': return {x:12,y:4}
            case '&': return {x:17,y:4}
            case 'a': return {x:19,y:4}
            case 'b': return {x:20,y:4}
            case 'c': return {x:21,y:4}
            
            // row 5
            case ' ': return {x:7,y:5}
            case '%': return {x:16,y:5}
            case '(': return {x:17,y:5}
            case "'": return {x:18,y:5}
            case '`': return {x:20,y:5}
            case 'n': return {x:21,y:5}
            
        }
        return {x:-1,y:-1}
    }
}
module.exports = {
    QHook: QHook
};