import stringParse from "../src/index.js";
import { expect, describe, test } from "../lib/testing/src/index.js";

describe("stringPase without options", () => {
  test("will create the appropriate tokens", () => {
    const values = [" ", "11", " ", "foo", "."];
    const types = ["ws", "number", "ws", "word", "other"];
    const tokens = stringParse(values.join(""));
    const tokenTypes = tokens.map((token) => token.type);
    const tokenValues = tokens.map((token) => token.value);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(values);
    expect(tokenTypes).toBe(types);
  });
});

describe("stringParse can reduce the tokens", () => {
  test("when given an array of reducer functions", () => {
    const elems = [" ", "function", " ", "false", " ", "12"];
    const reducedValues = [" function", " false", " 12"];
    const types = ["word", "word", "word"];

    const mergeDouble = (newTokens, token, i) => {
      if (i % 2 === 0) {
        newTokens.push(token);
      } else {
        newTokens[newTokens.length - 1].value += token.value;
      }
      return newTokens;
    };

    const changeTypeToWord = (newTokens, { value }) => {
      newTokens.push({ type: "word", value });
      return newTokens;
    };

    const opts = { reducers: [mergeDouble, changeTypeToWord] };
    const tokens = stringParse(elems.join(""), opts);
    const tokenTypes = tokens.map((token) => token.type);
    const tokenValues = tokens.map((token) => token.value);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });
});

describe("stringParse has an option to change the type of a token given a", () => {
  test("one-to-one typeMap", () => {
    const elems = [" ", "function", " ", "false", " ", "this"];
    const types = ["ws", "declarator", "ws", "boolean", "ws", "word"];
    const opts = { typeMap: { declarator: "function", boolean: "false" } };
    const tokens = stringParse(elems.join(""), opts);
    const tokenTypes = tokens.map((token) => token.type);
    const tokenValues = tokens.map((token) => token.value);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(elems);
    expect(tokenTypes).toBe(types);
  });

  test("one-to-many typeMap", () => {
    const words = ["class", "const", "constructor"];
    const opts = { typeMap: { declarator: words } };

    words.forEach((word) => {
      const tokens = stringParse(word, opts);

      expect(tokens.length).toBe(1);
      expect(tokens[0].type).toBe("declarator");
    });
  });
});

describe("stringParse has an option to concatenate tokens and", () => {
  test("has a includeStartDelimeter option", () => {
    // prettier-ignore
    const reducedValues = [
      ' ', 'let', ' ', 'foo', ' ', '=', ' ', '`', 'bar was here', '`',
      ';', ' ', '// TODO rename variable', '\n', ' ', 'baz'
    ];
    // prettier-ignore
    const types = [
      'ws', 'word', 'ws', 'word', 'ws', 'other', 'ws', 'other', 'string', 'other',
      'other', 'ws', 'comment', 'newline', 'ws', 'word'
    ];
    const opts = {
      concat: [
        {
          type: "comment",
          start: "//",
          stop: "\n",
          includeStartDelimeter: true,
          // includeStopDelimeter defaults to false
        },
        { type: "string", start: "`", stop: "`", includeStartDelimeter: false },
      ],
    };

    const tokens = stringParse(reducedValues.join(""), opts);
    const tokenTypes = tokens.map((token) => token.type);
    const tokenValues = tokens.map((token) => token.value);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });

  test("has a includeStopDelimeter option", () => {
    const reducedValues = ["aaa", " ", "/", "/", "this is a weird comment*/"];
    const types = ["word", "ws", "other", "other", "comment"];
    const opts = {
      concat: [
        {
          type: "comment",
          start: "//",
          stop: "*/",
          // includeStartDelimeter defaults to false
          includeStopDelimeter: true,
        },
      ],
    };

    const tokens = stringParse(reducedValues.join(""), opts);
    const tokenTypes = tokens.map((token) => token.type);
    const tokenValues = tokens.map((token) => token.value);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });

  test("can handle two separate strings", () => {
    const reducedValues = ["`", "string1", "`", " ", "`", "string2", "`"];
    const types = [
      "other",
      "string",
      "other",
      "ws",
      "other",
      "string",
      "other",
    ];
    const opts = {
      concat: [
        { type: "string", start: "`", stop: "`", includeStartDelimeter: false },
      ],
    };
    const tokens = stringParse(reducedValues.join(""), opts);
    const tokenTypes = tokens.map((token) => token.type);
    const tokenValues = tokens.map((token) => token.value);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });

  test("can handle two chars by themselves", () => {
    const reducedValues = ["foo", "=>", "bar"];
    const types = ["word", "arrow", "word"];
    const opts = {
      concat: [
        {
          type: "arrow",
          start: "=>",
          stop: "",
          includeStartDelimeter: true,
          includeStopDelimeter: true,
        },
      ],
    };

    const tokens = stringParse(reducedValues.join(""), opts);
    const tokenTypes = tokens.map((token) => token.type);
    const tokenValues = tokens.map((token) => token.value);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });
});