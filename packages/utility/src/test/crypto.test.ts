import { expect } from 'chai';
import { decrypt, encrypt, md5, randomString, sha256 } from '../lib/crypto.js';

describe('Crypto', function () {
  it('can create an md5 checksum', function () {
    const sourceText = 'hello world';
    expect({
      hex: md5(sourceText),
      b64: md5(sourceText, 'base64'),
    }).to.eql({
      hex: '5eb63bbbe01eeed093cb22bb8f5acdc3',
      b64: 'XrY7u+Ae7tCTyyK7j1rNww==',
    });
  });
  it('can create an sha256 checksum', function () {
    const sourceText = 'hello world';
    expect({
      hex: sha256(sourceText),
      b64: sha256(sourceText, 'base64'),
    }).to.eql({
      hex: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
      b64: 'uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=',
    });
  });
  it('can encrypt/decrypt a string or buffer', function () {
    const key = '00000000000000000000000000000000';
    const string = 'Hello World';
    const buffer = Buffer.from(string);
    expect(decrypt(encrypt(string, key), key).toString()).to.equal(string);
    expect(decrypt(encrypt(buffer, key), key).toString()).to.equal(string);
  });
  it('can create a random Base64 string', function () {
    const str = randomString(20, 'base64');
    expect(str.match(/^[a-zA-Z0-9+/]{20}$/)).to.not.be.null;
  });
  it('can create a random hex string', function () {
    const str = randomString(20, 'hex');
    expect(str.match(/^[a-f0-9]{20}$/)).to.not.be.null;
  });
  it('can create a random string with a custom charset', function () {
    const chars = ['12', '3'];
    const str = randomString(20, chars);
    expect(str.match(/^[123]{20}$/)).to.not.be.null;
    // Each character should appear at least once
    for (const char of chars.join('')) {
      expect(str.includes(char)).to.be.true;
    }
  });
});
