# stringParse

(This project is currently under early development.)

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

### Changing token types

A `typeMap` option can be provided to replace the default types to something else:

```javascript
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
