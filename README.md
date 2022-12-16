# stringParse

(This project is currently under early development.)

stringParse takes a string and breaks it into tokens.

# Usage

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

Alternatively, a mapping parameter can be provided to replace the default types to something else:

```javascript
const typeMap = { keyword: ["function"] };
const tokens = stringParse(text, { typeMap });
```

This would change the `function` token to:

```javascript
{ type: "keyword": value: "function" }
```
