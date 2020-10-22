const path = require('path');
const parse = require('remark-parse');
const frontmatter = require('remark-frontmatter');
const stringify = require('remark-stringify');
const toVFile = require('to-vfile');
const unified = require('unified');
const metadata = require('../src/');

const fixturesDir = path.join(__dirname, '/fixtures');
const runtimeDir = path.join(__dirname, '/runtime');
const remark = unified().use(parse).use(stringify).use(frontmatter)
  .freeze();

// Utility function to add metadata to a vFile.
function addMetadata(vFile, destinationFilePath) {
  // eslint-disable-next-line no-param-reassign
  vFile.data = {
    destinationFilePath,
    destinationDir: path.dirname(destinationFilePath),
  };
}

describe('remark-metadata', () => {
  describe('src file name with spaces should work fine', () => {
    const srcFile = `${fixturesDir}/file name with spaces.md`;
    const destFile = `${runtimeDir}/file name with spaces.md`;
    let vfile;

    beforeEach(() => {
      vfile = toVFile.readSync(srcFile);
      addMetadata(vfile, destFile);
    });

    it('when using git', () => {
      const result = remark()
        .use(frontmatter)
        .use(metadata, {
          git: true,
          metadata: {
            created: metadata.CREATED_TIME,
            updated: metadata.LAST_MODIFIED_TIME,
          },
        });

      // should be "created: 'DATE'"
      expect(result).not.toContain("created: ''");

      // should be "updated: 'DATE'"
      expect(result).not.toContain("updated: ''");
    });

    it('when using stat', () => {
      const result = remark()
        .use(metadata, {
          git: false,
          metadata: {
            created: metadata.CREATED_TIME,
            updated: metadata.LAST_MODIFIED_TIME,
          },
        })
        .processSync(vfile)
        .toString();

      // should be "created: 'DATE'"
      expect(result).not.toContain("created: ''");

      // should be "updated: 'DATE'"
      expect(result).not.toContain("updated: ''");
    });
  });

  describe('adds metadata to existing front matter', () => {
    const srcFile = `${fixturesDir}/existing.md`;
    const destFile = `${runtimeDir}/existing.md`;
    let vfile;

    beforeEach(() => {
      vfile = toVFile.readSync(srcFile);
      addMetadata(vfile, destFile);
    });

    it('when provide shouldUpdate option', () => {
      const mockFn = jest.fn();
      const result = remark()
        .use(metadata, {
          metadata: {
            lastModifiedAt: {
              value: metadata.LAST_MODIFIED_TIME,
              shouldUpdate(newValue, oldValue) {
                mockFn();
                expect(newValue).not.toBeFalsy();
                expect(oldValue).toBe('Thu, 22 Oct 2020 06:47:56 GMT');

                return false;
              },
            },
          },
        })
        .processSync(vfile)
        .toString();

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result).toContain("lastModifiedAt: 'Thu, 22 Oct 2020 06:47:56 GMT'");
    });

    it('when does not provide shouldUpdate option', () => {
      const result = remark()
        .use(metadata, {
          metadata: {
            lastModifiedAt: {
              value: metadata.LAST_MODIFIED_TIME,
            },
          },
        })
        .processSync(vfile)
        .toString();

      expect(result).not.toContain('lastModifiedAt: Thu, 22 Oct 2020 06:47:56 GMT');
    });

    it('when provide string metadata', () => {
      const result = remark()
        .use(metadata, {
          metadata: {
            foo: 'bar',
          },
        })
        .processSync(vfile)
        .toString();

      expect(result).toContain('foo: bar');
    });

    it('when provide function metadata', () => {
      const mockFn = jest.fn();
      const result = remark()
        .use(metadata, {
          metadata: {
            foo({ modifiedTime, createdTime, vFile }) {
              mockFn();
              expect(modifiedTime).toBeTruthy();
              expect(createdTime).toBeTruthy();
              expect(vFile).toBeTruthy();

              return 'bar';
            },
          },
        })
        .processSync(vfile)
        .toString();

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result).toContain('foo: bar');
    });

    it('when using stat', () => {
      const result = remark()
        .use(metadata, {
          git: false,
          metadata: {
            createdAt: metadata.CREATED_TIME,
            lastModifiedAt: metadata.LAST_MODIFIED_TIME,
          },
        })
        .processSync(vfile)
        .toString();
      expect(result).toContain('createdAt:');
      expect(result).toContain('lastModifiedAt:');
    });
  });

  describe('adds metadata as new front matter', () => {
    const srcFile = `${fixturesDir}/no.md`;
    const destFile = `${runtimeDir}/no.md`;
    let vfile;

    beforeEach(() => {
      vfile = toVFile.readSync(srcFile);
      addMetadata(vfile, destFile);
    });

    it('when provide metadata', () => {
      const result = remark()
        .use(metadata, {
          metadata: { lastModifiedAt: metadata.LAST_MODIFIED_TIME },
        })
        .processSync(vfile)
        .toString();
      expect(result).toContain('lastModifiedAt:');
    });

    it('when does not provide metadata', () => {
      const result = remark().use(metadata).processSync(vfile).toString();
      expect(result).toContain('{}');
    });
  });
});
