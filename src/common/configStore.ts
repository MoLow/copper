export class ConfigStore<T> {
    constructor(private _value: T) {}

    get value() {
        return this._value;
    }
    set value(val: Partial<T>) {
        Object.assign(this._value, val);
    }
}
