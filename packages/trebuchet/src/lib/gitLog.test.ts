import { ok } from 'assert';
import { expect } from 'chai';
import { omit } from '@bscotch/utility';
import { GitLog } from './gitLog.js';
import {
  GitLogChangeDescription,
  GitLogChangeDescriptionPatternGroups,
} from './gitLog.types.js';

const rawLogTemplate = {
  refs: '',
  author_email: '',
  author_name: '',
  body: '',
  date: '',
  message: '',
  hash: '',
};

describe('GitLog class', function () {
  it('can use emoji and string aliases for message types', function () {
    for (const config of GitLog.changeDescriptionConfig) {
      for (const label of config.labels) {
        const message = `${label}: ${config.name}`;
        const log = GitLog.parseMessage(message)[0];
        expect(config.labels).to.include(log.type);
        expect(log.bump).to.equal(config.bump);
      }
    }
  });

  it('change-description regex works for single-line descriptions', function () {
    const parts = 'type(scope): message'.match(GitLog.changeDescriptionPattern)
      ?.groups as GitLogChangeDescriptionPatternGroups | undefined;
    expect(parts).to.be.ok;
    expect(parts?.type).to.equal('type');
    expect(parts?.scope).to.equal('scope');
    expect(parts?.title).to.equal('message');

    expect(
      'type!: message\ncontinue'.match(GitLog.changeDescriptionPattern)?.groups,
    ).to.eql({
      type: 'type',
      title: 'message\ncontinue',
      breaking: '!',
      scope: undefined,
    } as GitLogChangeDescriptionPatternGroups);
  });

  it('can convert back and forth between description strings & messages', function () {
    const descriptions: (GitLogChangeDescription & {
      asString: string;
    })[] = [
      {
        title: 'changed something',
        type: 'feat',
        scope: undefined,
        breaking: false,
        bump: 'minor',
        body: undefined,
        asString: `feat: changed something`,
      },
      {
        title: 'changed something major',
        type: 'fix',
        breaking: true,
        scope: undefined,
        bump: 'major',
        body: undefined,
        asString: `fix!: changed something major`,
      },
      {
        title: 'need some more space to\ndescribe this one!',
        type: 'docs',
        scope: 'some-scope',
        body: 'Here are a bunch\nmore details!\n\nIt just keeps going!',
        breaking: false,
        bump: 'patch',
        asString: `docs(some-scope): need some more space to\ndescribe this one!\n\nHere are a bunch\nmore details!\n\nIt just keeps going!`,
      },
    ];

    // As individual descriptions
    for (const description of descriptions) {
      const asString = GitLog.serializeParsedMessage(description);
      expect(asString).to.equal(description.asString);

      const parsed = GitLog.parseMessage(asString)[0];
      expect(parsed).to.eql(omit(description, ['asString']));
    }

    // As a single description
    const asString = GitLog.serializeParsedMessage(descriptions);
    expect(asString).to.equal(descriptions.map((d) => d.asString).join('\n\n'));

    const parsed = GitLog.parseMessage(asString);
    expect(parsed).to.eql(descriptions.map((d) => omit(d, ['asString'])));
  });

  it('can infer the max bump from a collection of changes', function () {
    const cases = [
      {
        messages: [
          'feat: some feature',
          'chore: some chore',
          'test: some test',
        ],
        bump: 'minor',
      },
      {
        messages: ['fix: some fix', 'chore: some chore'],
        bump: 'patch',
      },
      {
        messages: ['fix!: some fix', 'test: some test'],
        bump: 'major',
      },
    ];
    for (const testCase of cases) {
      const multilog = GitLog.parseMessage(testCase.messages.join('\n\n'));
      expect(GitLog.maxBump(multilog)).to.equal(testCase.bump);

      const logs = testCase.messages
        .map((message) => GitLog.parseMessage(message))
        .flat(1);
      expect(GitLog.maxBump(logs)).to.equal(testCase.bump);
    }
  });

  it('can parse tags', function () {
    const projectName = '@test/project';
    const version = '1.0.0';
    const tag = `${projectName}@${version}`;

    const tagParsed = GitLog.parseTag(tag);
    ok(
      tagParsed,
      'projectVersionTag must be a valid project tag (version suffix optional)',
    );
    expect(tagParsed).to.be.an('object');
    expect(tagParsed.tag).to.equal(tag);
    expect(tagParsed.name).to.equal(projectName);
    expect(tagParsed.version).to.equal(version);

    const tags = ['one', tag, 'v1.2.3'];
    const log = new GitLog({
      ...rawLogTemplate,
      refs: `tag: ${tags.join(', tag: ')}`,
    });

    expect(log.tags).to.deep.equal(tags);
    expect(log.projectVersionTags).to.deep.equal([tagParsed]);
  });

  it('can correctly identify project version tags', function () {
    const projectName = '@test/project';
    const version = '1.0.0';
    const tag = `${projectName}@${version}`;
    const log = new GitLog({
      ...rawLogTemplate,
      refs: `tag: ${tag}, tag: other-tag`,
    });
    expect(log.hasProjectVersionTag(projectName)).to.be.true;
    expect(log.hasProjectVersionTag(tag)).to.be.true;
    expect(log.hasProjectVersionTag('other-tag')).to.be.false;
    expect(log.hasProjectVersionTag(`${projectName}@${version}-beta`)).to.be
      .false;
  });
});
