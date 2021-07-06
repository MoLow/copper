import * as mathjs from 'mathjs';

type step = { step: string };
type Func<T = any, U extends step = any> = (arg: T) => Promise<U>;

export class BenchmarkerFlow<
    A = any,
    B extends step = any,
    C extends step = any,
    D extends step = any,
    E extends step = any,
    F extends step = any,
    G extends step = any,
> {
    private flow: Func[];

    constructor(
        private options: { iterations: number; name: string },
        a: Func<never, B>,
        b?: Func<B, C>,
        c?: Func<C, D>,
        d?: Func<D, E>,
        e?: Func<E, F>,
        f?: Func<F, G>,
    ) {
        this.flow = [a, b, c, d, e, f].filter(Boolean) as Func[];
    }

    async *[Symbol.asyncIterator]() {
        for (let i = 0; i < this.options.iterations; i++) {
            let prevResult: any;
            for (const item of this.flow) {
                const startTime = process.hrtime.bigint();
                prevResult = await item(prevResult);
                const endTime = process.hrtime.bigint();
                yield {
                    name: this.options.name,
                    step: prevResult.step,
                    duration: Number(endTime - startTime) / 1000000,
                };
            }
        }
    }
}

async function* aggregateRoundRobin(sources: AsyncIterator<any>[]) {
    do {
        const promiseFactory = sources.map((s) => s.next);
        for (const i in promiseFactory) {
            const r = await promiseFactory[i]();
            if (r.done) {
                sources.splice(Number(i), 1);
            } else {
                yield r.value;
            }
        }
    } while (sources.length > 0);
}

export class Benchmarker {
    private flows: BenchmarkerFlow[];
    private durations: Record<string, Record<string, number[]>> = {};

    constructor(...flows: BenchmarkerFlow[]) {
        this.flows = flows;
    }

    async run() {
        for await (const flow of aggregateRoundRobin(this.flows.map((f) => f[Symbol.asyncIterator]()))) {
            this.durations[flow.name] = this.durations[flow.name] || {};
            this.durations[flow.name][flow.step] = this.durations[flow.name][flow.step] || [];
            this.durations[flow.name][flow.step].push(flow.duration);
            console.log(flow.name, flow.step);
        }
    }

    static stats(numbers: number[]) {
        return {
            mean: mathjs.mean(numbers),
            stdev: mathjs.std(numbers),
            min: mathjs.min(numbers),
            max: mathjs.max(numbers),
            percentaile95: mathjs.quantileSeq(numbers, 0.95),
        };
    }

    get results() {
        return Object.keys(this.durations).reduce((acc, key) => {
            const durations = this.durations[key];
            return Object.assign(acc, {
                [key]: Object.keys(durations).reduce((acc, key) => {
                    return Object.assign(acc, { [key]: Benchmarker.stats(durations[key]) });
                }, {}),
            });
        }, {});
    }
}
