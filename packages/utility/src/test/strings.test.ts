import { expect } from 'chai';
import {
  capitalize,
  decodeFromBase64,
  decodeFromBase64JsonString,
  encodeToBase64,
  encodeToBase64JsonString,
  explode,
  nodent,
  oneline,
  undent,
} from '../lib/strings.js';

describe('Strings', function () {
  it('can nodent string literals', function () {
    const interp1 = 'hello';
    const interp2 = 'goodbye';
    const nodented = nodent`
      Here is a:
        multine string ${interp1}
        look
    at it goooo ${interp2}
            weeee!
    `;
    const expected = `Here is a:
multine string ${interp1}
look
at it goooo ${interp2}
weeee!`;
    expect(expected).to.equal(nodented);
  });

  it('can undent string literals', function () {
    const interp1 = 'hello';
    const interp2 = 'goodbye';
    const dedented = undent`
      Here is a:
        multine string ${interp1}
        look

    at it goooo ${interp2}
            weeee!
    `;
    const expected = `  Here is a:
    multine string ${interp1}
    look

at it goooo ${interp2}
        weeee!`;
    expect(expected).to.equal(dedented);
  });

  it('can undent string literals with multiline interps', function () {
    const multineInterp = '{\n  ohNo: 10,\n  yay:"meh"\n}\n';
    let dedented = undent`
      Here is a:
      ${multineInterp}
        And another line.
    `;
    let expected = `Here is a:
{
  ohNo: 10,
  yay:"meh"
}

  And another line.`;

    expect(expected).to.equal(dedented);

    dedented = undent`
      Here is a: ${multineInterp} And another line.
    `;
    expected = `Here is a: {
             ohNo: 10,
             yay:"meh"
           }
            And another line.`;
    expect(expected).to.equal(dedented);
  });

  it('can oneline string literals', function () {
    const interp1 = 'hello';
    const interp2 = 'goodbye';
    const onelined = oneline`
      Here is a:
        multine string ${interp1}
        look
    at it goooo ${interp2}
            weeee!
    `;
    const expected = `Here is a: multine string ${interp1} look at it goooo ${interp2} weeee!`;
    expect(expected).to.equal(onelined);
  });

  it('can encode/decode base64', function () {
    const originalText = 'Hello World';
    const knownEncoding = 'SGVsbG8gV29ybGQ=';
    expect(encodeToBase64(originalText)).to.equal(knownEncoding);
    expect(decodeFromBase64(knownEncoding)).to.equal(originalText);
    expect(encodeToBase64(Buffer.from(originalText))).to.equal(knownEncoding);
  });

  it('can encode/decode JavaScript structures via Base64', function () {
    const dataStructure = { hello: 'world' };
    const encodedStringifiedStructure = 'eyJoZWxsbyI6IndvcmxkIn0=';
    expect(encodeToBase64JsonString(dataStructure)).to.equal(
      encodedStringifiedStructure,
    );
    expect(decodeFromBase64JsonString(encodedStringifiedStructure)).to.eql(
      dataStructure,
    );
  });

  it('can capitalize strings', function () {
    expect(capitalize('hello world')).to.equal('Hello world');
  });

  it('can explode strings', function () {
    expect(explode('hello, world,,, ')).to.eql(['hello', 'world']);
    expect(
      explode('hello, world,,, ', { keepEmpty: true, sep: ',', noTrim: true }),
      'should be able to keep nullstrings',
    ).to.eql(['hello', ' world', '', '', ' ']);
    expect(
      explode('hello, world,good,bye ', { limit: 2 }),
      'should be able to limit total returned values',
    ).to.eql(['hello', 'world']);
    expect(
      explode('hello, hello,world,world ', { unique: true }).sort(),
      'should be filterable by uniqueness',
    ).to.eql(['hello', 'world'].sort());
  });
});
