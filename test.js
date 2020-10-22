/* eslint-disable */
var vfile = require('to-vfile');
var remark = require('remark');
var frontmatter = require('remark-frontmatter');
var metadata = require('remark-metadata');

var example = vfile.readSync('example.md');

remark()
  .use(frontmatter)
  .use(metadata, {
    git: true,
    metadata: {
      // string
      tag: 'remark-metadata',
      // build-in options
      created: metadata.CREATED_TIME,
      updated: metadata.LAST_MODIFIED_TIME,
      // function
      duration({ modifiedTime, createdTime, vFile }) {
        return (
          new Date(modifiedTime).getTime() - new Date(createdTime).getTime()
        );
      },
      // object
      title: {
        value({ modifiedTime, createdTime, vFile }) {
          return vFile.basename;
        },
        shouldUpdate(newValue, oldValue) {
          if (oldValue === 'Example') {
            return true;
          }
          return false;
        },
      },
    },
  })
  .process(example, function (err, file) {
    if (err) throw err;
    console.log(String(file));
  });
