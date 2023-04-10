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

class RLOGDecoder {
    SUPPORTED_LOG_REVISIONS = [1];
    STRING_DECODER = new TextDecoder("UTF-8");
    MIN_TIMESTAMP_STEP = 0.0001;
    MAX_TIMESTAMP_STEP = 15.0;
    logRevision = null;
    lastTimestamp = null;
    lastTimestampCorrupted = null;
    keyIDs = {};
    decode(log, dataArray) {
        let dataBuffer = new DataView(dataArray.buffer);
        let offset = 0;
        function shiftOffset(shift) {
            return (offset += shift) - shift;
        }
        try {
            if (this.logRevision == null) {
                this.logRevision = dataArray[shiftOffset(1)];
                if (!this.SUPPORTED_LOG_REVISIONS.includes(this.logRevision)) {
                    return false;
                }
            }
            shiftOffset(1);
            mainLoop: while (true) {
                if (offset >= dataArray.length)
                    break mainLoop;
                let timestamp = dataBuffer.getFloat64(shiftOffset(8));
                if (this.lastTimestamp != null &&
                    (isNaN(timestamp) ||
                        timestamp == null ||
                        timestamp < this.lastTimestamp + this.MIN_TIMESTAMP_STEP ||
                        timestamp > this.lastTimestamp + this.MAX_TIMESTAMP_STEP)) {
                    if (this.lastTimestamp != this.lastTimestampCorrupted) {
                        console.warn("Corrupted log data skipped near " +
                            this.lastTimestamp.toFixed(2) +
                            " seconds (byte " +
                            (offset - 8).toString() +
                            ")");
                    }
                    this.lastTimestampCorrupted = this.lastTimestamp;
                    offset -= 7;
                    continue;
                }
                this.lastTimestamp = timestamp;
                readLoop: while (true) {
                    let type = dataArray[shiftOffset(1)];
                    if (type == undefined)
                        break readLoop;
                    switch (type) {
                        case 0:
                            break readLoop;
                        case 1:
                            let keyID = dataBuffer.getInt16(shiftOffset(2));
                            let length = dataBuffer.getInt16(shiftOffset(2));
                            let newKey = this.STRING_DECODER.decode(dataArray.subarray(offset, offset + length));
                            offset += length;
                            this.keyIDs[keyID] = newKey;
                            break;
                        case 2:
                            let key = this.keyIDs[dataBuffer.getInt16(shiftOffset(2))];
                            switch (dataArray[shiftOffset(1)]) {
                                case 0:
                                    let previousType = log.getType(key);
                                    switch (previousType) {
                                        case LoggableType$1.Raw:
                                            log.putRaw(key, timestamp, new Uint8Array());
                                            break;
                                        case LoggableType$1.Boolean:
                                            log.putBoolean(key, timestamp, false);
                                            break;
                                        case LoggableType$1.Number:
                                            log.putNumber(key, timestamp, 0);
                                            break;
                                        case LoggableType$1.String:
                                            log.putString(key, timestamp, "");
                                            break;
                                        case LoggableType$1.BooleanArray:
                                            log.putBooleanArray(key, timestamp, []);
                                            break;
                                        case LoggableType$1.NumberArray:
                                            log.putNumberArray(key, timestamp, []);
                                            break;
                                        case LoggableType$1.StringArray:
                                            log.putStringArray(key, timestamp, []);
                                            break;
                                    }
                                    break;
                                case 1:
                                    log.putBoolean(key, timestamp, dataArray[shiftOffset(1)] != 0);
                                    break;
                                case 9:
                                    log.putRaw(key, timestamp, new Uint8Array([dataArray[shiftOffset(1)]]));
                                    break;
                                case 3:
                                    log.putNumber(key, timestamp, dataBuffer.getInt32(shiftOffset(4)));
                                    break;
                                case 5:
                                    log.putNumber(key, timestamp, dataBuffer.getFloat64(shiftOffset(8)));
                                    break;
                                case 7:
                                    let stringLength = dataBuffer.getInt16(shiftOffset(2));
                                    let string = this.STRING_DECODER.decode(dataArray.subarray(offset, offset + stringLength));
                                    offset += stringLength;
                                    log.putString(key, timestamp, string);
                                    break;
                                case 2:
                                    let booleanArrayLength = dataBuffer.getInt16(shiftOffset(2));
                                    let booleanArray = [];
                                    for (let i = 0; i < booleanArrayLength; i++) {
                                        booleanArray.push(dataArray[shiftOffset(1)] != 0);
                                    }
                                    log.putBooleanArray(key, timestamp, booleanArray);
                                    break;
                                case 10:
                                    let byteArrayLength = dataBuffer.getInt16(shiftOffset(2));
                                    let byteArray = [];
                                    for (let i = 0; i < byteArrayLength; i++) {
                                        byteArray.push(dataArray[shiftOffset(1)]);
                                    }
                                    log.putRaw(key, timestamp, new Uint8Array(byteArray));
                                    break;
                                case 4:
                                    let integerArrayLength = dataBuffer.getInt16(shiftOffset(2));
                                    let integerArray = [];
                                    for (let i = 0; i < integerArrayLength; i++) {
                                        integerArray.push(dataBuffer.getInt32(shiftOffset(4)));
                                    }
                                    log.putNumberArray(key, timestamp, integerArray);
                                    break;
                                case 6:
                                    let doubleArrayLength = dataBuffer.getInt16(shiftOffset(2));
                                    let doubleArray = [];
                                    for (let i = 0; i < doubleArrayLength; i++) {
                                        doubleArray.push(dataBuffer.getFloat64(shiftOffset(8)));
                                    }
                                    log.putNumberArray(key, timestamp, doubleArray);
                                    break;
                                case 8:
                                    let stringArraylength = dataBuffer.getInt16(shiftOffset(2));
                                    let stringArray = [];
                                    for (let i = 0; i < stringArraylength; i++) {
                                        let stringLength = dataBuffer.getInt16(shiftOffset(2));
                                        stringArray.push(this.STRING_DECODER.decode(dataArray.subarray(offset, offset + stringLength)));
                                        offset += stringLength;
                                    }
                                    log.putStringArray(key, timestamp, stringArray);
                                    break;
                            }
                            break;
                    }
                }
            }
            return true;
        }
        catch {
            return false;
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
    let decoder = new RLOGDecoder();
    let success = decoder.decode(log, payload[0]);
    if (success) {
        resolve(log.toSerialized());
    }
    else {
        reject();
    }
};
