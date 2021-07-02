import { FastifyPluginCallback } from 'fastify';
import { ElementHandle, Page } from 'puppeteer';
import { WebdriverError } from '../../../common/errors';

const W3C_ELEMENT_ID = 'element-6066-11e4-a52e-4f735466cecf';
export const elementHandles = new (class {
    private pages = new WeakMap<Page, Map<string, ElementHandle>>();

    private getPageMap(page: Page) {
        if (this.pages.has(page)) {
            return this.pages.get(page) as Map<string, ElementHandle>;
        }
        const elementsMap = new Map<string, ElementHandle>();
        this.pages.set(page, elementsMap);
        return elementsMap;
    }

    getElementId(element: ElementHandle) {
        return element._remoteObject.objectId ?? '';
    }

    set(page: Page, element: ElementHandle) {
        const elementsMap = this.getPageMap(page);
        const elementId = this.getElementId(element);

        if (elementsMap.has(elementId)) {
            return elementsMap.get(elementId);
        } else {
            elementsMap.set(elementId, element);
        }
    }

    get(page: Page, elementId: string) {
        const elementsMap = this.getPageMap(page);
        return elementsMap.get(elementId);
    }
})();

export const elements: FastifyPluginCallback = (app, opts, done) => {
    app.post<{ Body: { using: 'css selector' | 'xpath'; value: string } }>('/element', async (req) => {
        // we intentionally ignore most locator strategies that are not CSS selectors or xpath
        // If someone is interested in implementing the other ones it should be easy and be my guest.
        const { using, value } = req.body;
        if (!using || !value) {
            throw new WebdriverError('missing either using or value');
        }
        let elementHandle: ElementHandle<Element> | null = null;
        if (using === 'css selector') {
            elementHandle = await req.puppeteer.page.$(value);
        }
        if (using === 'xpath') {
            elementHandle = (await req.puppeteer.page.$x(value))[0];
        }
        if (!elementHandle) {
            throw new WebdriverError('no such element');
        }

        elementHandles.set(req.puppeteer.page, elementHandle);

        return { status: 0, value: { [W3C_ELEMENT_ID]: elementHandles.getElementId(elementHandle) }, state: 'success' };
    });

    app.get<{ Params: { elementId: string } }>('/element/:elementId/text', async (req) => {
        const { elementId } = req.params;
        if (!elementId) {
            throw new Error('missing element id');
        }
        const elementHandle = elementHandles.get(req.puppeteer.page, elementId);
        if (!elementHandle) {
            throw new Error(`element ${elementId} does not exist`);
        }

        const value = await elementHandle.evaluate(/* istanbul ignore next */ (el) => el.innerHTML);

        return { status: 0, value, state: 'success' };
    });

    app.post<{ Params: { elementId: string } }>('/element/:elementId/click', async (req) => {
        const { elementId } = req.params;
        if (!elementId) {
            throw new Error('missing element id');
        }
        const elementHandle = elementHandles.get(req.puppeteer.page, elementId);
        if (!elementHandle) {
            throw new Error(`element ${elementId} does not exist`);
        }

        await elementHandle.click();

        return { status: 0, value: null, state: 'success' };
    });

    app.post<{ Params: { elementId: string }; Body: { value: string | string[] } }>(
        '/element/:elementId/value',
        async (req) => {
            const { elementId } = req.params;
            if (!elementId) {
                throw new Error('missing element id');
            }
            const elementHandle = elementHandles.get(req.puppeteer.page, elementId);
            if (!elementHandle) {
                throw new Error(`element ${elementId} does not exist`);
            }
            const text = Array.isArray(req.body.value) ? req.body.value.join('') : req.body.value;
            await elementHandle.type(text);

            return { status: 0, value: null, state: 'success' };
        },
    );

    app.post<{ Params: { elementId: string } }>('/element/:elementId/clear', async (req) => {
        const { elementId } = req.params;
        if (!elementId) {
            throw new Error('missing element id');
        }
        const elementHandle = elementHandles.get(req.puppeteer.page, elementId);
        if (!elementHandle) {
            throw new Error(`element ${elementId} does not exist`);
        }
        await elementHandle.type('');

        return { status: 0, value: null, state: 'success' };
    });

    done();
};
