export class ConfigStore<T> {
    private _default: T;
    constructor(private _value: T) {
        this._default = Object.assign({}, _value);
    }

    get value() {
        return this._value;
    }
    set value(val: Partial<T>) {
        Object.assign(this._value, val);
    }

    reset() {
        this._value = Object.assign({}, this._default);
    }
}
