import test from 'ava';

import RomajiConvert from './index';

test('conversion', t => {
    t.plan(1);

    const converter = new RomajiConvert();
    return converter.convert('ななひら')
        .then(r => {
            t.is(r, 'na na hira')
            converter.close();
        })
        .catch(e => {
            console.error(e);
            t.fail();
        });
});