import { expect } from 'chai';
import { ConfigStore } from './configStore';

describe('configStore', () => {
    let store: ConfigStore<{ foo: string; bar: string }>;
    beforeEach(() => {
        store = new ConfigStore({ foo: 'bar', bar: 'baz' });
    });
    it('should return store value', () => {
        expect(store.value.foo).to.equal('bar');
    });
    it('should update store value', () => {
        store.value = { foo: 'baz' };
        expect(store.value.foo).to.equal('baz');
        expect(store.value.bar).to.equal('baz');
    });
    it('should reset store to defaults', () => {
        store.value.foo = 'baz';
        store.reset();
        expect(store.value.foo).to.equal('bar');
    });
});
