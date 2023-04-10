'use strict';

function arraysEqual(a, b) {
    return (a.length == b.length &&
        a.every((value, index) => {
            return value === b[index];
        }));
}
function cleanFloat(float) {
    let output = Math.round(float * 1e6) / 1e6;
    if (output == -0)
        output = 0;
    return output;
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

const GROUPED_UNITS = {
    length: {
        meters: 1,
        inches: 1 / 0.0254,
        millimeters: 1000,
        centimeters: 100,
        kilometers: 0.001,
        feet: 1 / (0.0254 * 12),
        yards: 1 / (0.0254 * 12 * 3),
        miles: 1 / (0.0254 * 12 * 3 * 1760)
    },
    angle: {
        radians: 1,
        degrees: 180 / Math.PI,
        rotations: 1 / (Math.PI * 2),
        "Falcon counts": 2048 / (Math.PI * 2)
    },
    velocity: {
        "meters/second": 1,
        "inches/second": 1 / 0.0254,
        "feet/second": 1 / (0.0254 * 12),
        "miles/hour": 3600 / (0.0254 * 12 * 3 * 1760)
    },
    "angular velocity": {
        "radians/second": 1,
        "degrees/second": 180 / Math.PI,
        "rotations/second": 1 / (Math.PI * 2),
        "rotations/minute": 60 / (Math.PI * 2),
        "Falcon velocity": 2048 / (Math.PI * 2 * 10)
    },
    acceleration: {
        "meters/second^2": 1,
        "inches/second^2": 1 / 0.0254,
        "feet/second^2": 1 / (0.0254 * 12),
        "standard gravity": 1 / 9.80665
    },
    time: {
        seconds: 1,
        milliseconds: 1000,
        microseconds: 1000000,
        minutes: 1 / 60,
        hours: 1 / 3600,
        days: 1 / 86400
    },
    temperature: {
        celsius: 1,
        fahrenheit: 1
    },
    energy: {
        joule: 1,
        "watt hour": 1 / 3600,
        calorie: 1 / 4.184
    }
};
Object.assign({}, ...Object.values(GROUPED_UNITS));

function getLogValueText(value, type) {
    if (value === null) {
        return "null";
    }
    else if (type == LoggableType$1.Raw) {
        let array = value;
        let textArray = [];
        array.forEach((byte) => {
            textArray.push("0x" + (byte & 0xff).toString(16).padStart(2, "0"));
        });
        return "[" + textArray.toString() + "]";
    }
    else {
        return JSON.stringify(value);
    }
}

const HEADER_STRING = "WPILOG";
const HEADER_VERSION = 0x0100;
const CONTROL_ENTRY = 0;
const CONTROL_START = 0;
const CONTROL_FINISH = 1;
const CONTROL_SET_METADATA = 2;
new TextDecoder("UTF-8");
const TEXT_ENCODER = new TextEncoder();

class WPILOGEncoderRecord {
    entry;
    timestamp;
    data;
    constructor(entry, timestamp, data) {
        this.entry = entry;
        this.timestamp = timestamp;
        this.data = data;
    }
    static makeControlStart(timestamp, startRecordData) {
        let encodedName = TEXT_ENCODER.encode(startRecordData.name);
        let encodedType = TEXT_ENCODER.encode(startRecordData.type);
        let encodedMetadata = TEXT_ENCODER.encode(startRecordData.metadata);
        let data = new Uint8Array(1 + 4 + 4 + encodedName.length + 4 + encodedType.length + 4 + encodedMetadata.length);
        let dataView = new DataView(data.buffer);
        data[0] = CONTROL_START;
        dataView.setUint32(1, startRecordData.entry, true);
        dataView.setUint32(1 + 4, encodedName.length, true);
        data.set(encodedName, 1 + 4 + 4);
        dataView.setUint32(1 + 4 + 4 + encodedName.length, encodedType.length, true);
        data.set(encodedType, 1 + 4 + 4 + encodedName.length + 4);
        dataView.setUint32(1 + 4 + 4 + encodedName.length + 4 + encodedType.length, encodedMetadata.length, true);
        data.set(encodedMetadata, 1 + 4 + 4 + encodedName.length + 4 + encodedType.length + 4);
        return new WPILOGEncoderRecord(CONTROL_ENTRY, timestamp, data);
    }
    static makeControlFinish(timestamp, entry) {
        let data = new Uint8Array(1 + 4);
        data[0] = CONTROL_FINISH;
        new DataView(data.buffer).setUint32(1, entry, true);
        return new WPILOGEncoderRecord(CONTROL_ENTRY, timestamp, data);
    }
    static makeControlSetMetadata(timestamp, metadataRecordData) {
        let encodedMetadata = TEXT_ENCODER.encode(metadataRecordData.metadata);
        let data = new Uint8Array(1 + 4 + 4 + encodedMetadata.length);
        let dataView = new DataView(data.buffer);
        data[0] = CONTROL_SET_METADATA;
        dataView.setUint32(1, metadataRecordData.entry, true);
        data.set(encodedMetadata, 1 + 4);
        return new WPILOGEncoderRecord(CONTROL_ENTRY, timestamp, data);
    }
    static makeRaw(entry, timestamp, value) {
        return new WPILOGEncoderRecord(entry, timestamp, value);
    }
    static makeBoolean(entry, timestamp, value) {
        let data = new Uint8Array(1);
        data[0] = value ? 1 : 0;
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    static makeInteger(entry, timestamp, value) {
        let data = new Uint8Array(8);
        new DataView(data.buffer).setBigInt64(0, BigInt(value), true);
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    static makeFloat(entry, timestamp, value) {
        let data = new Uint8Array(4);
        new DataView(data.buffer).setFloat32(0, value, true);
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    static makeDouble(entry, timestamp, value) {
        let data = new Uint8Array(8);
        new DataView(data.buffer).setFloat64(0, value, true);
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    static makeString(entry, timestamp, value) {
        return new WPILOGEncoderRecord(entry, timestamp, TEXT_ENCODER.encode(value));
    }
    static makeBooleanArray(entry, timestamp, value) {
        let data = new Uint8Array(value.length);
        value.forEach((item, index) => {
            data[index] = item ? 1 : 0;
        });
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    static makeIntegerArray(entry, timestamp, value) {
        let data = new Uint8Array(value.length * 8);
        value.forEach((item, index) => {
            new DataView(data.buffer, index * 8).setBigInt64(0, BigInt(item), true);
        });
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    static makeFloatArray(entry, timestamp, value) {
        let data = new Uint8Array(value.length * 4);
        value.forEach((item, index) => {
            new DataView(data.buffer, index * 4).setFloat32(0, item, true);
        });
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    static makeDoubleArray(entry, timestamp, value) {
        let data = new Uint8Array(value.length * 8);
        value.forEach((item, index) => {
            new DataView(data.buffer, index * 8).setFloat64(0, item, true);
        });
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    static makeStringArray(entry, timestamp, value) {
        let encodedStrings = value.map((item) => TEXT_ENCODER.encode(item));
        let data = new Uint8Array(4 + value.length * 4 + encodedStrings.reduce((previous, current) => previous + current.length, 0));
        new DataView(data.buffer).setUint32(0, encodedStrings.length, true);
        let position = 4;
        encodedStrings.forEach((item) => {
            new DataView(data.buffer, position).setUint32(0, item.length, true);
            data.set(item, position + 4);
            position += 4 + item.length;
        });
        return new WPILOGEncoderRecord(entry, timestamp, data);
    }
    encodeInteger(int) {
        int = Math.floor(int);
        if (int == 0)
            return new Uint8Array(1);
        let length = Math.floor(Math.log(int) / Math.log(256)) + 1;
        let array = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            array[i] = (int >> (i * 8)) & 0xff;
        }
        return array;
    }
    getEncoded() {
        let entryData = this.encodeInteger(this.entry);
        let payloadSizeData = this.encodeInteger(this.data.length);
        let timestampData = this.encodeInteger(this.timestamp);
        let lengthBitfield = 0;
        lengthBitfield |= entryData.length - 1;
        lengthBitfield |= (payloadSizeData.length - 1) << 2;
        lengthBitfield |= (timestampData.length - 1) << 4;
        let array = new Uint8Array(1 + entryData.length + payloadSizeData.length + timestampData.length + this.data.length);
        array[0] = lengthBitfield;
        array.set(entryData, 1);
        array.set(payloadSizeData, 1 + entryData.length);
        array.set(timestampData, 1 + entryData.length + payloadSizeData.length);
        array.set(this.data, 1 + entryData.length + payloadSizeData.length + timestampData.length);
        return array;
    }
}
class WPILOGEncoder {
    extraHeader;
    records = [];
    constructor(extraHeader) {
        this.extraHeader = extraHeader;
    }
    add(record) {
        this.records.push(record);
    }
    getEncoded() {
        let encodedRecords = this.records.map((record) => record.getEncoded());
        let totalRecordLength = encodedRecords.reduce((previous, current) => previous + current.length, 0);
        let encodedHeader = TEXT_ENCODER.encode(HEADER_STRING);
        let encodedExtraHeader = TEXT_ENCODER.encode(this.extraHeader);
        let data = new Uint8Array(encodedHeader.length + 2 + 4 + encodedExtraHeader.length + totalRecordLength);
        let dataView = new DataView(data.buffer, 0);
        data.set(encodedHeader, 0);
        dataView.setUint16(encodedHeader.length, HEADER_VERSION, true);
        dataView.setUint32(encodedHeader.length + 2, encodedExtraHeader.length, true);
        data.set(encodedExtraHeader, encodedHeader.length + 2 + 4);
        let position = encodedHeader.length + 2 + 4 + encodedExtraHeader.length;
        encodedRecords.forEach((encodedRecord) => {
            data.set(encodedRecord, position);
            position += encodedRecord.length;
        });
        return data;
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
    try {
        let options = payload.options;
        let log = Log.fromSerialized(payload.log);
        let fields = [];
        let processTree = (data) => {
            Object.keys(data)
                .sort()
                .forEach((key) => {
                if (data[key].fullKey != null) {
                    fields.push(data[key].fullKey);
                }
                if (Object.keys(data[key].children).length > 0) {
                    processTree(data[key].children);
                }
            });
        };
        processTree(log.getFieldTree(false));
        if (options.prefixes !== "") {
            let filteredFields = [];
            options.prefixes.split(",").forEach((prefix) => {
                let prefixSeries = prefix.split(new RegExp(/\/|:/)).filter((item) => item.length > 0);
                fields.forEach((field) => {
                    let fieldSeries = field.split(new RegExp(/\/|:/)).filter((item) => item.length > 0);
                    if (fieldSeries.length < prefixSeries.length)
                        return;
                    if (prefixSeries.every((prefix, index) => fieldSeries[index].toLowerCase() == prefix.toLowerCase()) &&
                        !filteredFields.includes(field)) {
                        filteredFields.push(field);
                    }
                });
            });
            fields = filteredFields;
        }
        switch (options.format) {
            case "csv-table":
                resolve(generateCsvTable(log, fields, options.samplingMode == "fixed" ? options.samplingPeriod / 1000 : null));
                break;
            case "csv-list":
                resolve(generateCsvList(log, fields));
                break;
            case "wpilog":
                resolve(generateWPILOG(log, fields));
                break;
        }
    }
    catch {
        reject();
    }
};
function generateCsvTable(log, fields, samplingPeriodSecs) {
    let timestamps = log.getTimestamps(fields);
    if (samplingPeriodSecs !== null) {
        let minTime = Math.floor(timestamps[0] / samplingPeriodSecs) * samplingPeriodSecs;
        let maxTime = timestamps[timestamps.length - 1];
        timestamps = [];
        for (let timestamp = minTime; timestamp <= maxTime; timestamp += samplingPeriodSecs) {
            timestamps.push(cleanFloat(timestamp));
        }
    }
    let data = [["Timestamp"]];
    timestamps.forEach((timestamp) => {
        data.push([timestamp.toString()]);
    });
    fields.forEach((field) => {
        data[0].push(field);
        let fieldData = log.getRange(field, -Infinity, Infinity);
        let fieldType = log.getType(field);
        timestamps.forEach((timestamp, index) => {
            if (fieldData === undefined || fieldType === undefined)
                return;
            let nextIndex = fieldData.timestamps.findIndex((value) => value > timestamp);
            if (nextIndex == -1)
                nextIndex = fieldData.timestamps.length;
            let value = null;
            if (nextIndex != 0) {
                value = fieldData.values[nextIndex - 1];
            }
            data[index + 1].push(getLogValueText(value, fieldType).replaceAll(",", ";"));
        });
    });
    return data.map((x) => x.join(",")).join("\n");
}
function generateCsvList(log, fields) {
    let rows = [];
    fields.forEach((field) => {
        let fieldData = log.getRange(field, -Infinity, Infinity);
        let fieldType = log.getType(field);
        if (fieldData === undefined)
            return;
        fieldData.values.forEach((value, index) => {
            if (fieldData === undefined || fieldType === undefined)
                return;
            rows.push([fieldData.timestamps[index], field, getLogValueText(value, fieldType).replaceAll(",", ";")]);
        });
    });
    rows.sort((a, b) => a[0] - b[0]);
    rows.splice(0, 0, ["Timestamp", "Key", "Value"]);
    return rows.map((x) => x.join(",")).join("\n");
}
function generateWPILOG(log, fields) {
    let encoder = new WPILOGEncoder("AdvantageScope");
    fields.forEach((field, index) => {
        let fieldData = log.getRange(field, -Infinity, Infinity);
        let fieldType = log.getType(field);
        if (fieldData === undefined || fieldType === undefined)
            return;
        let entryId = index + 1;
        let typeStr = "";
        switch (fieldType) {
            case LoggableType$1.Raw:
                typeStr = "raw";
                break;
            case LoggableType$1.Boolean:
                typeStr = "boolean";
                break;
            case LoggableType$1.Number:
                typeStr = "double";
                break;
            case LoggableType$1.String:
                typeStr = "string";
                break;
            case LoggableType$1.BooleanArray:
                typeStr = "boolean[]";
                break;
            case LoggableType$1.NumberArray:
                typeStr = "double[]";
                break;
            case LoggableType$1.StringArray:
                typeStr = "string[]";
                break;
        }
        encoder.add(WPILOGEncoderRecord.makeControlStart(0, {
            entry: entryId,
            name: field,
            type: typeStr,
            metadata: ""
        }));
        fieldData.values.forEach((value, index) => {
            if (fieldData === undefined || fieldType === undefined)
                return;
            let timestamp = fieldData.timestamps[index] * 1000000;
            switch (fieldType) {
                case LoggableType$1.Raw:
                    encoder.add(WPILOGEncoderRecord.makeRaw(entryId, timestamp, value));
                    break;
                case LoggableType$1.Boolean:
                    encoder.add(WPILOGEncoderRecord.makeBoolean(entryId, timestamp, value));
                    break;
                case LoggableType$1.Number:
                    encoder.add(WPILOGEncoderRecord.makeDouble(entryId, timestamp, value));
                    break;
                case LoggableType$1.String:
                    encoder.add(WPILOGEncoderRecord.makeString(entryId, timestamp, value));
                    break;
                case LoggableType$1.BooleanArray:
                    encoder.add(WPILOGEncoderRecord.makeBooleanArray(entryId, timestamp, value));
                    break;
                case LoggableType$1.NumberArray:
                    encoder.add(WPILOGEncoderRecord.makeDoubleArray(entryId, timestamp, value));
                    break;
                case LoggableType$1.StringArray:
                    encoder.add(WPILOGEncoderRecord.makeStringArray(entryId, timestamp, value));
                    break;
            }
        });
    });
    return encoder.getEncoded();
}
