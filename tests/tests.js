import stringParse from "../src/index.js";
import { expect, describe, test } from "../lib/testing/src/index.js";

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

    const changeTypeToWord = (newTokens, { type, value }) => {
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

describe("stringParse has an option to concatenate tokens and has a", () => {
  test("includeStartDelimeter option", () => {
    // prettier-ignore
    const reducedValues = [
      'let', ' ', 'foo', ' ', '=', ' ', '`', 'bar was here', '`',
      ';', ' ', '// TODO rename variable', '\n'
    ];
    // prettier-ignore
    const types = [
      'word', 'ws', 'word', 'ws', 'other', 'ws', 'other', 'string', 'other',
      'other', 'ws', 'comment', 'ws'
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
        // comments should be built before strings
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

  test("includeStopDelimeter option", () => {
    const reducedValues = ["aaa", " ", "/", "/ this is a weird comment*/"];
    const types = ["word", "ws", "other", "comment"];
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

    console.log(tokens);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });
});
