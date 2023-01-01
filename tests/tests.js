import stringParse from "../src/index.js";
import { expect, describe, test } from "../lib/testing/src/index.js";

function createTestTokens(reducedValues, opts) {
  const tokens = stringParse(reducedValues.join(""), opts);
  const tokenTypes = tokens.map((token) => token.type);
  const tokenValues = tokens.map((token) => token.value);
  return { tokens, tokenValues, tokenTypes };
}

describe("stringPase without options", () => {
  test("will create the appropriate tokens", () => {
    const reducedValues = [" ", "11", " ", "foo", "."];
    const types = ["ws", "number", "ws", "word", "other"];
    const { tokens, tokenValues, tokenTypes } = createTestTokens(reducedValues);

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });
});

describe("stringParse can reduce the tokens", () => {
  test("when given an array of reducer functions", () => {
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
    const { tokens, tokenValues, tokenTypes } = createTestTokens(
      reducedValues,
      opts
    );

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });
});

describe("stringParse has an option to change the type of a token given a", () => {
  test("one-to-one typeMap", () => {
    const reducedValues = [" ", "function", " ", "false", " ", "this"];
    const types = ["ws", "declarator", "ws", "boolean", "ws", "word"];
    const opts = { typeMap: { declarator: "function", boolean: "false" } };
    const { tokens, tokenValues, tokenTypes } = createTestTokens(
      reducedValues,
      opts
    );

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
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
    const { tokens, tokenValues, tokenTypes } = createTestTokens(
      reducedValues,
      opts
    );

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });

  describe("for comment creation that includes the stop delimeter, it handles", () => {
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

    test("text that includes the stop delimeter", () => {
      const reducedValues = ["aaa", " ", "/", "/", "this is a weird comment*/"];
      const types = ["word", "ws", "other", "other", "comment"];
      const { tokens, tokenValues, tokenTypes } = createTestTokens(
        reducedValues,
        opts
      );

      expect(tokens.length).toBe(types.length);
      expect(tokenValues).toBe(reducedValues);
      expect(tokenTypes).toBe(types);
    });

    test("text that doesn't include the stop delimeter at the end of the text (no loss of text)", () => {
      const reducedValues = ["aaa", " ", "/", "/", "this is a weird comment*"];
      const types = ["word", "ws", "other", "other", "comment"];
      const { tokens, tokenValues, tokenTypes } = createTestTokens(
        reducedValues,
        opts
      );

      expect(tokens.length).toBe(types.length);
      expect(tokenValues).toBe(reducedValues);
      expect(tokenTypes).toBe(types);
    });
  });

  describe("for string creation", () => {
    const opts = {
      concat: [
        {
          type: "string",
          start: "`",
          stop: "`",
        },
      ],
    };

    test("handles a single quote char", () => {
      const tokens = stringParse("`", opts);
      const token = tokens[0];

      expect(tokens.length).toBe(1);
      expect(token.type).toBe("other");
      expect(token.value).toBe("`");
    });
    test("handles two separate strings", () => {
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
      const { tokens, tokenValues, tokenTypes } = createTestTokens(
        reducedValues,
        opts
      );

      expect(tokens.length).toBe(types.length);
      expect(tokenValues).toBe(reducedValues);
      expect(tokenTypes).toBe(types);
    });
  });

  describe("can handle two chars by themselves", () => {
    const opts = {
      concat: [
        {
          type: "arrow",
          start: "=>",
          stop: "",
          includeStartDelimeter: true,
        },
      ],
    };

    test("not surounded by words", () => {
      const tokens = stringParse("=>", opts);
      const token = tokens[0];

      expect(tokens.length).toBe(1);
      expect(token.type).toBe("arrow");
      expect(token.value).toBe("=>");
    });

    test("surounded by words", () => {
      const reducedValues = ["foo", "=>", "bar"];
      const types = ["word", "arrow", "word"];
      const { tokens, tokenValues, tokenTypes } = createTestTokens(
        reducedValues,
        opts
      );

      expect(tokens.length).toBe(types.length);
      expect(tokenValues).toBe(reducedValues);
      expect(tokenTypes).toBe(types);
    });
  });
});

describe("stringParse with different options", () => {
  test("prioritizes reducing over remapping", () => {
    const opts = {
      typeMap: { declarator: "function" },
      concat: [
        {
          type: "string",
          start: "`",
          stop: "`",
        },
      ],
    };
    const reducedValues = ["`", "function", "`"];
    const types = ["other", "string", "other"];
    const { tokens, tokenValues, tokenTypes } = createTestTokens(
      reducedValues,
      opts
    );

    expect(tokens.length).toBe(types.length);
    expect(tokenValues).toBe(reducedValues);
    expect(tokenTypes).toBe(types);
  });
});
