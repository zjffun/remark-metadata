# remark-metadata

[![NPM](https://img.shields.io/npm/v/remark-metadata.svg)](https://npmjs.org/packages/remark-metadata/)
[![Travis CI](https://img.shields.io/travis/temando/remark-metadata.svg)](https://travis-ci.org/temando/remark-metadata)
[![MIT License](https://img.shields.io/github/license/temando/remark-metadata.svg)](https://en.wikipedia.org/wiki/MIT_License)

Adds meta data about a Markdown file to a Markdown file, formatted as [Front Matter](https://jekyllrb.com/docs/frontmatter/).

The following meta data is added:

- `lastModifiedAt` using one of the following heuristics:
  1. the `vFile` has the property `data.lastModifiedAt` defined
  1. if [`git`](https://git-scm.com/) exists, the commit time of the file
  1. the `mtime` reported by Node's `stat` method.

## Installation

```sh
$ npm install remark-metadata
```

Requires [`remark-frontmatter`](https://github.com/wooorm/remark-frontmatter).

## Usage

Given a file, `example.md`, which contains the following Markdown:

```md
---
title: Example
---

# Example

This is an example
```

Using remark like follows:

```js
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
        return new Date(modifiedTime).getTime() - new Date(createdTime).getTime();
      },
      // object
      title:{
        value: funcion({ modifiedTime, createdTime, vFile }){
          return vFile;
        },
        shouldUpdate(newValue, oldValue) {
          if(oldVaule !== undefined){
            return true;
          }
        },
      }
    },
  })
  .process(example, function (err, file) {
    if (err) throw err;
    console.log(String(file));
  });
```

This will output the following Markdown:

```md
---
title: Example
lastModifiedDate: 'Tue, 28 Nov 2017 02:44:25 GMT'
---

# Example

This is an example
```

If a file has no Front Matter, it will be added by this plugin.

### Options

The plugin has the following options:

- `git`: Enables determining modification dates using git (defaults: `true`)
- `metadata`: An object describe each metadata.
- `metadata[key]`: A string value, or a function will be called with some information and using its return value, or an object contain options below.
- `metadata[key].shouldUpdate`: A function will be called with old and new value arguments of this metadata. The metadata will update, if this function return truthy.
- `metadata[key].value`: A string or a function, like `metadata[key]`.
