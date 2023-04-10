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

function process(log, key, timestamp, value) {
    let result = parsePacket(value, timestamp);
    saveResult(log, key, timestamp, result);
}
function parsePacket(value, timestamp) {
    let view = new DataView(value.buffer, value.byteOffset, value.byteLength);
    let offset = 0;
    let result = new PhotonPipelineResult();
    result.latency = view.getFloat64(offset);
    result.timestamp = timestamp - result.latency;
    offset += 8;
    const numTargets = view.getInt8(offset);
    offset += 1;
    result.targets = [];
    for (let i = 0; i < numTargets; i++) {
        let target = new PhotonTrackedTarget();
        target.yaw = view.getFloat64(offset);
        offset += 8;
        target.pitch = view.getFloat64(offset);
        offset += 8;
        target.area = view.getFloat64(offset);
        offset += 8;
        target.skew = view.getFloat64(offset);
        offset += 8;
        target.fiducialId = view.getInt32(offset);
        offset += 4;
        target.bestCameraToTarget = parseTransform3d(view, offset);
        offset += 7 * 8;
        target.altCameraToTarget = parseTransform3d(view, offset);
        offset += 7 * 8;
        target.poseAmbiguity = view.getFloat64(offset);
        offset += 8;
        target.minAreaRectCorners = [];
        for (let j = 0; j < 4; j++) {
            let x = view.getFloat64(offset);
            offset += 8;
            let y = view.getFloat64(offset);
            offset += 8;
            target.minAreaRectCorners.push({ x: x, y: y });
        }
        target.detectedCorners = [];
        const numCorners = view.getInt8(offset);
        offset += 1;
        for (let j = 0; j < numCorners; j++) {
            let x = view.getFloat64(offset);
            offset += 8;
            let y = view.getFloat64(offset);
            offset += 8;
            target.detectedCorners.push({ x: x, y: y });
        }
        result.targets.push(target);
    }
    return result;
}
function saveResult(log, baseKey, timestamp, result) {
    log.putNumber(baseKey + "/latency", timestamp, result.latency);
    log.putNumber(baseKey + "/timestamp", timestamp, result.timestamp);
    for (const [idx, target] of result.targets.entries()) {
        Object.entries(target).forEach(([objectFieldName, objectFieldValue]) => {
            if (typeof objectFieldValue == "number") {
                log.putNumber(baseKey + `/target_${idx}/${objectFieldName}`, timestamp, Number(objectFieldValue));
            }
            if (Array.isArray(objectFieldValue)) {
                if (typeof objectFieldValue[0] == "number") {
                    log.putNumberArray(baseKey + `/target_${idx}/${objectFieldName}`, timestamp, objectFieldValue);
                }
                else if (typeof objectFieldValue[0] == "object") {
                    let xArray = [];
                    let yArray = [];
                    objectFieldValue.forEach((it) => {
                        xArray.push(it.x);
                        yArray.push(it.y);
                    });
                    log.putNumberArray(baseKey + `/target_${idx}/${objectFieldName}_x`, timestamp, xArray);
                    log.putNumberArray(baseKey + `/target_${idx}/${objectFieldName}_y`, timestamp, yArray);
                }
            }
        });
    }
}
function parseTransform3d(view, offset) {
    let tx = view.getFloat64(offset);
    offset += 8;
    let ty = view.getFloat64(offset);
    offset += 8;
    let tz = view.getFloat64(offset);
    offset += 8;
    let qw = view.getFloat64(offset);
    offset += 8;
    let qx = view.getFloat64(offset);
    offset += 8;
    let qy = view.getFloat64(offset);
    offset += 8;
    let qz = view.getFloat64(offset);
    offset += 8;
    return [tx, ty, tz, qw, qx, qy, qz];
}
class PhotonTrackedTarget {
    yaw = 0;
    pitch = 0;
    area = 0;
    skew = 0;
    fiducialId = 0;
    bestCameraToTarget = [];
    altCameraToTarget = [];
    poseAmbiguity = 0;
    minAreaRectCorners = [];
    detectedCorners = [];
}
class PhotonPipelineResult {
    latency = 0;
    timestamp = 0;
    targets = [];
}

const Schemas = new Map();
Schemas.set("rawBytes", process);

const HEADER_STRING = "WPILOG";
const HEADER_VERSION = 0x0100;
const CONTROL_ENTRY = 0;
const CONTROL_START = 0;
const CONTROL_FINISH = 1;
const CONTROL_SET_METADATA = 2;
const TEXT_DECODER = new TextDecoder("UTF-8");
new TextEncoder();

class WPILOGDecoderRecord {
    entry;
    timestamp;
    data;
    dataView;
    constructor(entry, timestamp, data) {
        this.entry = entry;
        this.timestamp = timestamp;
        this.data = data;
        this.dataView = new DataView(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    }
    getEntry() {
        return this.entry;
    }
    getTimestamp() {
        return this.timestamp;
    }
    isControl() {
        return this.entry == CONTROL_ENTRY;
    }
    getControlType() {
        return this.data[0];
    }
    isStart() {
        return this.isControl() && this.data.length >= 17 && this.getControlType() == CONTROL_START;
    }
    isFinish() {
        return this.isControl() && this.data.length == 5 && this.getControlType() == CONTROL_FINISH;
    }
    isSetMetadata() {
        return this.isControl() && this.data.length >= 9 && this.getControlType() == CONTROL_SET_METADATA;
    }
    getStartData() {
        if (!this.isStart())
            throw "Not a start control record";
        let stringResult;
        let entry = this.dataView.getUint32(1, true);
        stringResult = this.readInnerString(5);
        let name = stringResult.string;
        stringResult = this.readInnerString(stringResult.position);
        let type = stringResult.string;
        let metadata = this.readInnerString(stringResult.position).string;
        return {
            entry: entry,
            name: name,
            type: type,
            metadata: metadata
        };
    }
    getFinishEntry() {
        if (!this.isFinish())
            throw "Not a finish control record";
        return this.dataView.getUint32(1, true);
    }
    getSetMetadataData() {
        if (!this.isSetMetadata())
            throw "Not a set metadata control record";
        return {
            entry: this.dataView.getUint32(1, true),
            metadata: this.readInnerString(5).string
        };
    }
    getRaw() {
        return this.data;
    }
    getBoolean() {
        if (this.data.length != 1)
            throw "Not a boolean";
        return this.data[0] != 0;
    }
    getInteger() {
        if (this.data.length != 8)
            throw "Not an integer";
        return Number(this.dataView.getBigInt64(0, true));
    }
    getFloat() {
        if (this.data.length != 4)
            throw "Not a float";
        return this.dataView.getFloat32(0, true);
    }
    getDouble() {
        if (this.data.length != 8)
            throw "Not a double";
        return this.dataView.getFloat64(0, true);
    }
    getString() {
        return TEXT_DECODER.decode(this.data);
    }
    getBooleanArray() {
        let array = [];
        this.data.forEach((x) => {
            array.push(x != 0);
        });
        return array;
    }
    getIntegerArray() {
        if (this.data.length % 8 != 0)
            throw "Not an integer array";
        let array = [];
        for (let position = 0; position < this.data.length; position += 8) {
            array.push(Number(this.dataView.getBigInt64(position, true)));
        }
        return array;
    }
    getFloatArray() {
        if (this.data.length % 4 != 0)
            throw "Not a float array";
        let array = [];
        for (let position = 0; position < this.data.length; position += 4) {
            array.push(this.dataView.getFloat32(position, true));
        }
        return array;
    }
    getDoubleArray() {
        if (this.data.length % 8 != 0)
            throw "Not a double array";
        let array = [];
        for (let position = 0; position < this.data.length; position += 8) {
            array.push(this.dataView.getFloat64(position, true));
        }
        return array;
    }
    getStringArray() {
        let size = this.dataView.getUint32(0, true);
        if (size > (this.data.length - 4) / 4)
            throw "Not a string array";
        let array = [];
        let position = 4;
        for (let i = 0; i < size; i++) {
            let stringResult = this.readInnerString(position);
            array.push(stringResult.string);
            position = stringResult.position;
        }
        return array;
    }
    readInnerString(position) {
        let size = this.dataView.getUint32(position, true);
        let end = position + 4 + size;
        if (end > this.data.length)
            throw "Invalid string size";
        return {
            string: TEXT_DECODER.decode(this.data.subarray(position + 4, end)),
            position: end
        };
    }
}
class WPILOGDecoder {
    data;
    dataView;
    constructor(data) {
        this.data = data;
        this.dataView = new DataView(data.buffer);
    }
    isValid() {
        return (this.data.length >= 12 &&
            TEXT_DECODER.decode(this.data.subarray(0, 6)) == HEADER_STRING &&
            this.getVersion() == HEADER_VERSION);
    }
    getVersion() {
        if (this.data.length < 12)
            return 0;
        return this.dataView.getUint16(6, true);
    }
    getExtraHeader() {
        if (this.data.length < 12)
            return "";
        let size = this.dataView.getUint32(8, true);
        return TEXT_DECODER.decode(this.data.subarray(12, 12 + size));
    }
    readVariableInteger(position, length) {
        let value = 0;
        for (let i = 0; i < length; i++) {
            value |= this.data[position + i] << (i * 8);
        }
        return value;
    }
    forEach(callback) {
        if (!this.isValid())
            throw "Log is not valid";
        let extraHeaderSize = this.dataView.getUint32(8, true);
        let position = 12 + extraHeaderSize;
        while (true) {
            if (this.data.length < position + 4)
                break;
            let entryLength = (this.data[position] & 0x3) + 1;
            let sizeLength = ((this.data[position] >> 2) & 0x3) + 1;
            let timestampLength = ((this.data[position] >> 4) & 0x7) + 1;
            let headerLength = 1 + entryLength + sizeLength + timestampLength;
            if (this.data.length < position + headerLength)
                break;
            let entry = this.readVariableInteger(position + 1, entryLength);
            let size = this.readVariableInteger(position + 1 + entryLength, sizeLength);
            let timestamp = this.readVariableInteger(position + 1 + entryLength + sizeLength, timestampLength);
            if (this.data.length < position + headerLength + size)
                break;
            callback(new WPILOGDecoderRecord(entry, timestamp, this.data.subarray(position + headerLength, position + headerLength + size)));
            position += headerLength + size;
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
    let reader = new WPILOGDecoder(payload[0]);
    let entryIds = {};
    let entryTypes = {};
    try {
        reader.forEach((record) => {
            if (record.isControl()) {
                if (record.isStart()) {
                    let startData = record.getStartData();
                    entryIds[startData.entry] = startData.name;
                    entryTypes[startData.entry] = startData.type;
                    switch (startData.type) {
                        case "boolean":
                            log.createBlankField(startData.name, LoggableType$1.Boolean);
                            break;
                        case "int64":
                        case "float":
                        case "double":
                            log.createBlankField(startData.name, LoggableType$1.Number);
                            break;
                        case "string":
                        case "json":
                            log.createBlankField(startData.name, LoggableType$1.String);
                            break;
                        case "boolean[]":
                            log.createBlankField(startData.name, LoggableType$1.BooleanArray);
                            break;
                        case "int64[]":
                        case "float[]":
                        case "double[]":
                            log.createBlankField(startData.name, LoggableType$1.NumberArray);
                            break;
                        case "string[]":
                            log.createBlankField(startData.name, LoggableType$1.StringArray);
                            break;
                        default:
                            log.createBlankField(startData.name, LoggableType$1.Raw);
                            break;
                    }
                }
            }
            else {
                let key = entryIds[record.getEntry()];
                let type = entryTypes[record.getEntry()];
                let timestamp = record.getTimestamp() / 1000000.0;
                switch (type) {
                    case "boolean":
                        log.putBoolean(key, timestamp, record.getBoolean());
                        break;
                    case "int":
                    case "int64":
                        log.putNumber(key, timestamp, record.getInteger());
                        break;
                    case "float":
                        log.putNumber(key, timestamp, record.getFloat());
                        break;
                    case "double":
                        log.putNumber(key, timestamp, record.getDouble());
                        break;
                    case "string":
                    case "json":
                        log.putString(key, timestamp, record.getString());
                        break;
                    case "boolean[]":
                        log.putBooleanArray(key, timestamp, record.getBooleanArray());
                        break;
                    case "int64[]":
                        log.putNumberArray(key, timestamp, record.getIntegerArray());
                        break;
                    case "float[]":
                        log.putNumberArray(key, timestamp, record.getFloatArray());
                        break;
                    case "double[]":
                        log.putNumberArray(key, timestamp, record.getDoubleArray());
                        break;
                    case "string[]":
                        log.putStringArray(key, timestamp, record.getStringArray());
                        break;
                    default:
                        log.putRaw(key, timestamp, record.getRaw());
                        if (Schemas.has(type)) {
                            Schemas.get(type)(log, key, timestamp, record.getRaw());
                        }
                        break;
                }
            }
        });
    }
    catch (exception) {
        console.error(exception);
        reject();
        return;
    }
    resolve(log.toSerialized());
};
