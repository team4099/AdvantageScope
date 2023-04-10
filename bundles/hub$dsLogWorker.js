'use strict';

function arraysEqual(a, b) {
    return (a.length == b.length &&
        a.every((value, index) => {
            return value === b[index];
        }));
}

var LoggableType;
(function (LoggableType) {
    LoggableType[LoggableType["Raw"] = 0] = "Raw";
    LoggableType[LoggableType["Boolean"] = 1] = "Boolean";
    LoggableType[LoggableType["Number"] = 2] = "Number";
    LoggableType[LoggableType["String"] = 3] = "String";
    LoggableType[LoggableType["BooleanArray"] = 4] = "BooleanArray";
    LoggableType[LoggableType["NumberArray"] = 5] = "NumberArray";
    LoggableType[LoggableType["StringArray"] = 6] = "StringArray";
})(LoggableType || (LoggableType = {}));
var LoggableType$1 = LoggableType;

class LogField {
    type;
    data = { timestamps: [], values: [] };
    constructor(type) {
        this.type = type;
    }
    getType() {
        return this.type;
    }
    getTimestamps() {
        return this.data.timestamps;
    }
    getRange(start, end) {
        let timestamps;
        let values;
        let startValueIndex = this.data.timestamps.findIndex((x) => x > start);
        if (startValueIndex == -1) {
            startValueIndex = this.data.timestamps.length - 1;
        }
        else if (startValueIndex != 0) {
            startValueIndex -= 1;
        }
        let endValueIndex = this.data.timestamps.findIndex((x) => x >= end);
        if (endValueIndex == -1 || endValueIndex == this.data.timestamps.length - 1) {
            timestamps = this.data.timestamps.slice(startValueIndex);
            values = this.data.values.slice(startValueIndex);
        }
        else {
            timestamps = this.data.timestamps.slice(startValueIndex, endValueIndex + 1);
            values = this.data.values.slice(startValueIndex, endValueIndex + 1);
        }
        return { timestamps: timestamps, values: values };
    }
    getRaw(start, end) {
        if (this.type == LoggableType$1.Raw)
            return this.getRange(start, end);
    }
    getBoolean(start, end) {
        if (this.type == LoggableType$1.Boolean)
            return this.getRange(start, end);
    }
    getNumber(start, end) {
        if (this.type == LoggableType$1.Number)
            return this.getRange(start, end);
    }
    getString(start, end) {
        if (this.type == LoggableType$1.String)
            return this.getRange(start, end);
    }
    getBooleanArray(start, end) {
        if (this.type == LoggableType$1.BooleanArray)
            return this.getRange(start, end);
    }
    getNumberArray(start, end) {
        if (this.type == LoggableType$1.NumberArray)
            return this.getRange(start, end);
    }
    getStringArray(start, end) {
        if (this.type == LoggableType$1.StringArray)
            return this.getRange(start, end);
    }
    areEqual(type, a, b) {
        switch (type) {
            case LoggableType$1.Boolean:
            case LoggableType$1.Number:
            case LoggableType$1.String:
                return a == b;
            case LoggableType$1.BooleanArray:
            case LoggableType$1.NumberArray:
            case LoggableType$1.StringArray:
                return arraysEqual(a, b);
            case LoggableType$1.Raw:
                return arraysEqual(Array.from(a), Array.from(b));
        }
    }
    putData(timestamp, value) {
        if (value === null)
            return;
        if (this.data.timestamps.includes(timestamp)) {
            this.data.values[this.data.timestamps.indexOf(timestamp)] = value;
            return;
        }
        let insertIndex;
        if (this.data.timestamps.length > 0 && timestamp > this.data.timestamps[this.data.timestamps.length - 1]) {
            insertIndex = this.data.timestamps.length;
        }
        else {
            insertIndex = this.data.timestamps.findIndex((x) => x > timestamp);
            if (insertIndex == -1) {
                insertIndex = this.data.timestamps.length;
            }
        }
        if (insertIndex > 0 && this.areEqual(this.type, value, this.data.values[insertIndex - 1])) ;
        else if (insertIndex < this.data.values.length &&
            this.areEqual(this.type, value, this.data.values[insertIndex])) {
            this.data.timestamps[insertIndex] = timestamp;
        }
        else {
            this.data.timestamps.splice(insertIndex, 0, timestamp);
            this.data.values.splice(insertIndex, 0, value);
        }
    }
    putRaw(timestamp, value) {
        if (this.type == LoggableType$1.Raw)
            this.putData(timestamp, value);
    }
    putBoolean(timestamp, value) {
        if (this.type == LoggableType$1.Boolean)
            this.putData(timestamp, value);
    }
    putNumber(timestamp, value) {
        if (this.type == LoggableType$1.Number)
            this.putData(timestamp, value);
    }
    putString(timestamp, value) {
        if (this.type == LoggableType$1.String)
            this.putData(timestamp, value);
    }
    putBooleanArray(timestamp, value) {
        if (this.type == LoggableType$1.BooleanArray)
            this.putData(timestamp, value);
    }
    putNumberArray(timestamp, value) {
        if (this.type == LoggableType$1.NumberArray)
            this.putData(timestamp, value);
    }
    putStringArray(timestamp, value) {
        if (this.type == LoggableType$1.StringArray)
            this.putData(timestamp, value);
    }
    toSerialized() {
        return {
            type: this.type,
            timestamps: this.data.timestamps,
            values: this.data.values
        };
    }
    static fromSerialized(serializedData) {
        let field = new LogField(serializedData.type);
        field.data = {
            timestamps: serializedData.timestamps,
            values: serializedData.values
        };
        return field;
    }
}

class Log {
    DEFAULT_TIMESTAMP_RANGE = [0, 10];
    fields = {};
    arrayLengths = {};
    arrayItemFields = [];
    timestampRange = null;
    timestampSetCache = {};
    createBlankField(key, type) {
        if (key in this.fields)
            return;
        this.fields[key] = new LogField(type);
        if (type == LoggableType$1.BooleanArray || type == LoggableType$1.NumberArray || type == LoggableType$1.StringArray) {
            this.arrayLengths[key] = 0;
        }
    }
    updateTimestampRange(timestamp) {
        if (this.timestampRange == null) {
            this.timestampRange = [timestamp, timestamp];
        }
        else if (timestamp < this.timestampRange[0]) {
            this.timestampRange[0] = timestamp;
        }
        else if (timestamp > this.timestampRange[1]) {
            this.timestampRange[1] = timestamp;
        }
    }
    processTimestamp(key, timestamp) {
        this.updateTimestampRange(timestamp);
        Object.values(this.timestampSetCache).forEach((cache) => {
            if (cache.keys.includes(key) && !cache.timestamps.includes(timestamp)) {
                let insertIndex = cache.timestamps.findIndex((x) => x > timestamp);
                if (insertIndex == -1) {
                    insertIndex = cache.timestamps.length;
                }
                cache.timestamps.splice(insertIndex, 0, timestamp);
            }
        });
    }
    getFieldKeys() {
        return Object.keys(this.fields);
    }
    getFieldCount() {
        return Object.keys(this.fields).filter((field) => !this.arrayItemFields.includes(field)).length;
    }
    getType(key) {
        if (key in this.fields) {
            return this.fields[key].getType();
        }
        else {
            return undefined;
        }
    }
    isArrayField(key) {
        return this.arrayItemFields.includes(key);
    }
    getTimestamps(keys, uuid = null) {
        let output = [];
        keys = keys.filter((key) => key in this.fields);
        if (keys.length > 1) {
            let saveCache = false;
            if (uuid != null) {
                if (uuid in this.timestampSetCache && arraysEqual(this.timestampSetCache[uuid].keys, keys)) {
                    return [...this.timestampSetCache[uuid].timestamps];
                }
                this.timestampSetCache[uuid] = {
                    keys: keys,
                    timestamps: []
                };
                saveCache = true;
            }
            output = [...new Set(keys.map((key) => this.fields[key].getTimestamps()).flat())];
            output.sort((a, b) => a - b);
            if (saveCache && uuid)
                this.timestampSetCache[uuid].timestamps = output;
        }
        else if (keys.length == 1) {
            output = [...this.fields[keys[0]].getTimestamps()];
        }
        return output;
    }
    getTimestampRange() {
        if (this.timestampRange == null) {
            return [...this.DEFAULT_TIMESTAMP_RANGE];
        }
        else {
            return [...this.timestampRange];
        }
    }
    getLastTimestamp() {
        let timestamps = this.getTimestamps(this.getFieldKeys());
        return timestamps[timestamps.length - 1];
    }
    getFieldTree(includeArrayItems = true, prefix = "") {
        let root = {};
        Object.keys(this.fields).forEach((key) => {
            if (!includeArrayItems && this.arrayItemFields.includes(key))
                return;
            if (!key.startsWith(prefix))
                return;
            let position = { fullKey: null, children: root };
            key = key.slice(prefix.length);
            key
                .slice(key.startsWith("/") ? 1 : 0)
                .split(new RegExp(/\/|:/))
                .forEach((table) => {
                if (table == "")
                    return;
                if (!(table in position.children)) {
                    position.children[table] = { fullKey: null, children: {} };
                }
                position = position.children[table];
            });
            position.fullKey = key;
        });
        return root;
    }
    getRange(key, start, end) {
        if (key in this.fields)
            return this.fields[key].getRange(start, end);
    }
    getRaw(key, start, end) {
        if (key in this.fields)
            return this.fields[key].getRaw(start, end);
    }
    getBoolean(key, start, end) {
        if (key in this.fields)
            return this.fields[key].getBoolean(start, end);
    }
    getNumber(key, start, end) {
        if (key in this.fields)
            return this.fields[key].getNumber(start, end);
    }
    getString(key, start, end) {
        if (key in this.fields)
            return this.fields[key].getString(start, end);
    }
    getBooleanArray(key, start, end) {
        if (key in this.fields)
            return this.fields[key].getBooleanArray(start, end);
    }
    getNumberArray(key, start, end) {
        if (key in this.fields)
            return this.fields[key].getNumberArray(start, end);
    }
    getStringArray(key, start, end) {
        if (key in this.fields)
            return this.fields[key].getStringArray(start, end);
    }
    putRaw(key, timestamp, value) {
        if (this.arrayItemFields.includes(key))
            return;
        this.createBlankField(key, LoggableType$1.Raw);
        this.fields[key].putRaw(timestamp, value);
        if (this.fields[key].getType() == LoggableType$1.Raw) {
            this.processTimestamp(key, timestamp);
        }
    }
    putBoolean(key, timestamp, value) {
        if (this.arrayItemFields.includes(key))
            return;
        this.createBlankField(key, LoggableType$1.Boolean);
        this.fields[key].putBoolean(timestamp, value);
        if (this.fields[key].getType() == LoggableType$1.Boolean) {
            this.processTimestamp(key, timestamp);
        }
    }
    putNumber(key, timestamp, value) {
        if (this.arrayItemFields.includes(key))
            return;
        this.createBlankField(key, LoggableType$1.Number);
        this.fields[key].putNumber(timestamp, value);
        if (this.fields[key].getType() == LoggableType$1.Number) {
            this.processTimestamp(key, timestamp);
        }
    }
    putString(key, timestamp, value) {
        if (this.arrayItemFields.includes(key))
            return;
        this.createBlankField(key, LoggableType$1.String);
        this.fields[key].putString(timestamp, value);
        if (this.fields[key].getType() == LoggableType$1.String) {
            this.processTimestamp(key, timestamp);
        }
    }
    putBooleanArray(key, timestamp, value) {
        this.createBlankField(key, LoggableType$1.BooleanArray);
        if (this.fields[key].getType() == LoggableType$1.BooleanArray) {
            this.processTimestamp(key, timestamp);
            this.fields[key].putBooleanArray(timestamp, value);
            if (value.length > this.arrayLengths[key]) {
                for (let i = this.arrayLengths[key]; i < value.length; i++) {
                    this.fields[key + "/" + i.toString()] = new LogField(LoggableType$1.Boolean);
                    this.arrayItemFields.push(key + "/" + i.toString());
                }
                this.arrayLengths[key] = value.length;
            }
            for (let i = 0; i < value.length; i++) {
                this.processTimestamp(key + "/" + i.toString(), timestamp);
                this.fields[key + "/" + i.toString()].putBoolean(timestamp, value[i]);
            }
        }
    }
    putNumberArray(key, timestamp, value) {
        this.createBlankField(key, LoggableType$1.NumberArray);
        if (this.fields[key].getType() == LoggableType$1.NumberArray) {
            this.processTimestamp(key, timestamp);
            this.fields[key].putNumberArray(timestamp, value);
            if (value.length > this.arrayLengths[key]) {
                for (let i = this.arrayLengths[key]; i < value.length; i++) {
                    this.fields[key + "/" + i.toString()] = new LogField(LoggableType$1.Number);
                    this.arrayItemFields.push(key + "/" + i.toString());
                }
                this.arrayLengths[key] = value.length;
            }
            for (let i = 0; i < value.length; i++) {
                this.processTimestamp(key + "/" + i.toString(), timestamp);
                this.fields[key + "/" + i.toString()].putNumber(timestamp, value[i]);
            }
        }
    }
    putStringArray(key, timestamp, value) {
        this.createBlankField(key, LoggableType$1.StringArray);
        if (this.fields[key].getType() == LoggableType$1.StringArray) {
            this.processTimestamp(key, timestamp);
            this.fields[key].putStringArray(timestamp, value);
            if (value.length > this.arrayLengths[key]) {
                for (let i = this.arrayLengths[key]; i < value.length; i++) {
                    this.fields[key + "/" + i.toString()] = new LogField(LoggableType$1.String);
                    this.arrayItemFields.push(key + "/" + i.toString());
                }
                this.arrayLengths[key] = value.length;
            }
            for (let i = 0; i < value.length; i++) {
                this.processTimestamp(key + "/" + i.toString(), timestamp);
                this.fields[key + "/" + i.toString()].putString(timestamp, value[i]);
            }
        }
    }
    toSerialized() {
        let result = {
            fields: {},
            arrayLengths: this.arrayLengths,
            arrayItemFields: this.arrayItemFields,
            timestampRange: this.timestampRange
        };
        Object.entries(this.fields).forEach(([key, value]) => {
            result.fields[key] = value.toSerialized();
        });
        return result;
    }
    static fromSerialized(serializedData) {
        let log = new Log();
        Object.entries(serializedData.fields).forEach(([key, value]) => {
            log.fields[key] = LogField.fromSerialized(value);
        });
        log.arrayLengths = serializedData.arrayLengths;
        log.arrayItemFields = serializedData.arrayItemFields;
        log.timestampRange = serializedData.timestampRange;
        return log;
    }
    static mergeLogs(firstLog, secondLog, timestampOffset) {
        let firstSerialized = firstLog.toSerialized();
        let secondSerialized = secondLog.toSerialized();
        Object.values(secondSerialized.fields).forEach((field) => {
            let newField = field;
            newField.timestamps = newField.timestamps.map((timestamp) => timestamp + timestampOffset);
        });
        if (secondSerialized.timestampRange) {
            secondSerialized.timestampRange = secondSerialized.timestampRange.map((timestamp) => timestamp + timestampOffset);
        }
        let log = new Log();
        Object.entries(firstSerialized.fields).forEach(([key, value]) => {
            log.fields[key] = LogField.fromSerialized(value);
        });
        Object.entries(secondSerialized.fields).forEach(([key, value]) => {
            log.fields[key] = LogField.fromSerialized(value);
        });
        log.arrayLengths = { ...firstSerialized.arrayLengths, ...secondSerialized.arrayLengths };
        log.arrayItemFields = [...firstSerialized.arrayItemFields, ...secondSerialized.arrayItemFields];
        if (firstSerialized.timestampRange && secondSerialized.timestampRange) {
            log.timestampRange = [
                Math.min(firstSerialized.timestampRange[0], secondSerialized.timestampRange[0]),
                Math.max(firstSerialized.timestampRange[1], secondSerialized.timestampRange[1])
            ];
        }
        else if (firstSerialized.timestampRange) {
            log.timestampRange = firstSerialized.timestampRange;
        }
        else if (secondSerialized.timestampRange) {
            log.timestampRange = secondSerialized.timestampRange;
        }
        return log;
    }
}

function convertLVTime(seconds, fractional) {
    let time = -2082826800;
    time += Number(seconds);
    time += Number(fractional) / Math.pow(2, 64);
    return time;
}
function getPDType(id) {
    if (id == 33)
        return PowerDistributionType.REV;
    if (id == 25)
        return PowerDistributionType.CTRE;
    return PowerDistributionType.None;
}
var PowerDistributionType;
(function (PowerDistributionType) {
    PowerDistributionType[PowerDistributionType["REV"] = 0] = "REV";
    PowerDistributionType[PowerDistributionType["CTRE"] = 1] = "CTRE";
    PowerDistributionType[PowerDistributionType["None"] = 2] = "None";
})(PowerDistributionType || (PowerDistributionType = {}));

class DSEventsReader {
    data;
    dataView;
    textDecoder = new TextDecoder("UTF-8");
    constructor(data) {
        this.data = data;
        this.dataView = new DataView(data.buffer);
    }
    getVersion() {
        return this.dataView.getInt32(0);
    }
    isSupportedVersion() {
        return this.getVersion() == 4;
    }
    getTimestamp() {
        return convertLVTime(this.dataView.getBigInt64(4), this.dataView.getBigUint64(12));
    }
    forEach(callback) {
        if (!this.isSupportedVersion())
            throw "Log is not a supported version";
        let position = 4 + 8 + 8;
        let startTime = this.getTimestamp();
        while (true) {
            let timestamp = convertLVTime(this.dataView.getBigInt64(position), this.dataView.getBigUint64(position + 8));
            position += 8 + 8;
            let length = this.dataView.getInt32(position);
            position += 4;
            let text = this.textDecoder.decode(this.data.subarray(position, position + length));
            position += length;
            let adjustedTimestamp = timestamp - startTime;
            ["<TagVersion>", "<time>", "<count>", "<flags>", "<Code>", "<location>", "<stack>"].forEach((tag) => {
                while (text.includes(tag)) {
                    let tagIndex = text.indexOf(tag);
                    let nextIndex = text.indexOf("<", tagIndex + 1);
                    text = text.slice(0, tagIndex) + text.slice(nextIndex);
                }
            });
            text = text.replaceAll("<message> ", "");
            text = text.replaceAll("<details> ", "");
            text = text.trim();
            callback({
                timestamp: adjustedTimestamp,
                text: text
            });
            if (position >= this.data.length) {
                break;
            }
        }
    }
}

class DSLogReader {
    PERIOD_SECS = 0.02;
    data;
    dataView;
    constructor(data) {
        this.data = data;
        this.dataView = new DataView(data.buffer);
    }
    getVersion() {
        return this.dataView.getInt32(0);
    }
    isSupportedVersion() {
        return this.getVersion() == 4;
    }
    getTimestamp() {
        return convertLVTime(this.dataView.getBigInt64(4), this.dataView.getBigUint64(12));
    }
    forEach(callback) {
        if (!this.isSupportedVersion())
            throw "Log is not a supported version";
        let position = 4 + 8 + 8;
        let timestamp = 0;
        let lastBatteryVolts = 0;
        while (true) {
            let mask = this.dataView.getUint8(position + 5);
            let batteryVolts = this.dataView.getUint16(position + 2) / Math.pow(2, 8);
            if (batteryVolts > 20) {
                batteryVolts = lastBatteryVolts;
            }
            else {
                lastBatteryVolts = batteryVolts;
            }
            let entry = {
                timestamp: timestamp,
                tripTimeMs: this.dataView.getUint8(position) * 0.5,
                packetLoss: Math.min(Math.max(this.dataView.getInt8(position + 1) * 4 * 0.01, 0), 1),
                batteryVolts: batteryVolts,
                rioCpuUtilization: this.dataView.getUint8(position + 4) * 0.5 * 0.01,
                brownout: (mask & (1 << 7)) == 0,
                watchdog: (mask & (1 << 6)) == 0,
                dsTeleop: (mask & (1 << 5)) == 0,
                dsDisabled: (mask & (1 << 3)) == 0,
                robotTeleop: (mask & (1 << 2)) == 0,
                robotAuto: (mask & (1 << 1)) == 0,
                robotDisabled: (mask & 1) == 0,
                canUtilization: this.dataView.getUint8(position + 6) * 0.5 * 0.01,
                wifiDb: this.dataView.getUint8(position + 7) * 0.5,
                wifiMb: this.dataView.getUint16(position + 8) / Math.pow(2, 8),
                powerDistributionCurrents: []
            };
            position += 10;
            let pdType = getPDType(this.dataView.getUint8(position + 3));
            position += 5;
            let currents = [];
            switch (pdType) {
                case PowerDistributionType.REV:
                    let ints = [];
                    for (let i = 0; i < 6; ++i) {
                        ints.push(this.dataView.getUint32(position, true));
                        position += 4;
                    }
                    let finalArrayREV = new Uint8Array(4);
                    finalArrayREV.set(this.data.subarray(position, position + 2), 0);
                    ints[6] = new DataView(finalArrayREV.buffer).getUint32(0);
                    position += 3;
                    let dataBytes = this.data.subarray(position, position + 4);
                    position += 4;
                    for (let i = 0; i < 20; ++i) {
                        let dataIndex = Math.floor(i / 3);
                        let dataOffset = i % 3;
                        let data = ints[dataIndex];
                        let num = data << (32 - (dataOffset + 1) * 10);
                        num = num >>> 22;
                        currents[i] = num / 8;
                    }
                    for (let i = 0; i < 4; ++i) {
                        currents[i + 20] = dataBytes[i] / 16;
                    }
                    position += 1;
                    break;
                case PowerDistributionType.CTRE:
                    let booleanData = [];
                    this.data.subarray(position, position + 21).forEach((byte) => {
                        for (let i = 0; i < 8; i++) {
                            booleanData.push((byte & (1 << i)) != 0);
                        }
                    });
                    let currentPositions = [0, 10, 20, 30, 40, 50, 64, 74, 84, 94, 104, 114, 128, 138, 148, 158];
                    currentPositions.forEach((currentPosition) => {
                        let value = 0;
                        for (let i = 0; i < 8; i++) {
                            value += booleanData[currentPosition + i] ? Math.pow(2, i) : 0;
                        }
                        currents.push(value / 16);
                    });
                    position += 21 + 3;
                    break;
            }
            entry.powerDistributionCurrents = currents;
            callback(entry);
            timestamp += this.PERIOD_SECS;
            if (position >= this.data.length) {
                break;
            }
        }
    }
}

self.onmessage = (event) => {
    let { id, payload } = event.data;
    function resolve(result) {
        self.postMessage({ id: id, payload: result });
    }
    function reject() {
        self.postMessage({ id: id });
    }
    let log = new Log();
    if (payload[0] !== null) {
        let dsLog = new DSLogReader(payload[0]);
        if (!dsLog.isSupportedVersion()) {
            reject();
            return;
        }
        dsLog.forEach((entry) => {
            log.putNumber("/DSLog/TripTimeMS", entry.timestamp, entry.tripTimeMs);
            log.putNumber("/DSLog/PacketLoss", entry.timestamp, entry.packetLoss);
            log.putNumber("/DSLog/BatteryVoltage", entry.timestamp, entry.batteryVolts);
            log.putNumber("/DSLog/RioCPUUtilization", entry.timestamp, entry.rioCpuUtilization);
            log.putBoolean("/DSLog/Status/Brownout", entry.timestamp, entry.brownout);
            log.putBoolean("/DSLog/Status/Watchdog", entry.timestamp, entry.watchdog);
            log.putBoolean("/DSLog/Status/DSTeleop", entry.timestamp, entry.dsTeleop);
            log.putBoolean("/DSLog/Status/DSDisabled", entry.timestamp, entry.dsDisabled);
            log.putBoolean("/DSLog/Status/RobotTeleop", entry.timestamp, entry.robotTeleop);
            log.putBoolean("/DSLog/Status/RobotAuto", entry.timestamp, entry.robotAuto);
            log.putBoolean("/DSLog/Status/RobotDisabled", entry.timestamp, entry.robotDisabled);
            log.putNumber("/DSLog/CANUtilization", entry.timestamp, entry.canUtilization);
            log.putNumberArray("/DSLog/PowerDistributionCurrents", entry.timestamp, entry.powerDistributionCurrents);
        });
    }
    if (payload[1] !== null) {
        let dsEvents = new DSEventsReader(payload[1]);
        if (!dsEvents.isSupportedVersion()) {
            reject();
            return;
        }
        dsEvents.forEach((entry) => {
            log.putString("/DSEvents", entry.timestamp, entry.text);
        });
    }
    resolve(log.toSerialized());
};
