# stringParse

stringParse takes a string and breaks it into tokens.

## Usage

Calling `stringParse(text)` will create tokens of consecutive whitespace, digits or words. The remaining characters are split individually.

For example, given:

```javascript
const text = "  function(x = 1){}";
const tokens = stringParse(text);
```

The following tokens will be obtained:

```javascript
[
  { type: "ws", value: "  " },
  { type: "word", value: "function" },
  { type: "other", value: "(" },
  { type: "word", value: "x" },
  { type: "ws", value: " " },
  { type: "other", value: "=" },
  { type: "ws", value: " " },
  { type: "number", value: "1" },
  { type: "other", value: ")" },
  { type: "other", value: "{" },
  { type: "other", value: "}" },
];
```

## Convenience Options

### Concatenating tokens

A `concat` option can be provided to concatenate tokens based on token delimeters. Here is an example of how to create comment and string tokens:

```javascript
const text = "`bar was here` // TODO rename variable\n";
const options = {
  // Build comments before strings.
  concat: [
    {
      type: "comment",
      start: "//",
      stop: "\n",
      includeStartDelimeter: true,
      // includeStopDelimeter: false   [default]
    },
    {
      type: "string",
      start: "`",
      stop: "`",
      includeStartDelimeter: false,
    },
  ],
};
const tokens = stringParse(text, options);
```

This would give the following tokens:

```javascript
[
  { type: "other", value: "`" },
  { type: "string", value: "bar was here" },
  { type: "other", value: "`" },
  { type: "ws", value: " " },
  { type: "comment", value: "// TODO rename variable" },
  { type: "ws", value: "\n" },
];
```

### Changing token types

A `typeMap` option can be provided to replace the default types to something else:

```javascript
const text = "  function(x = 1){}";
const options = {
  typeMap: { keyword: ["function"] },
};
const tokens = stringParse(text, options);
```

This would change the `function` token to:

```javascript
{ type: "keyword": value: "function" }
```

### Array of reducing functions

More generally, an array of reducing functions can be provided:

```javascript
const mergeAll = (newTokens, token) => {
  if (newTokens.length === 0) {
    newTokens.push(token);
  } else {
    newTokens[newTokens.length - 1].value += token.value;
  }
  return newTokens;
};

const changeTypeToString = (newTokens, { type, value }) => {
  newTokens.push({ type: "string", value });
  return newTokens;
};

const opts = { reducers: [mergeAll, changeTypeToString] };
const tokens = stringParse(text, opts);
```

This would take all of the tokens and return a single token:

```javascript
{ type: "string": value: "  function(x = 1){}" }
```

### Sequence of processing

This is the sequence of token processing:

1. Create basic tokens (whitespace, numbers, words, other).
2. Perform `concat`enation, if provided, in the order given.
3. Execute `reducers`, if provided, in the order given.
