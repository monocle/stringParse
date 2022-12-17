import stringParse from "../src/index.js";
import { expect, describe, test } from "../lib/testing/src/index.js";

function assertTokenValues(tokens, types, values) {
  values.forEach((value, i) => {
    expect(tokens[i].type).toBe(types[i]);
    expect(tokens[i].value).toBe(value);
  });
}

describe("stringParse(text, opts) can reduce the tokens", () => {
  test("when given an array of reducer functions", () => {
    const elems = [" ", "function", " ", "false", " ", "12"];
    const reducedElems = [" function", " false", " 12"];
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

    expect(tokens.length).toBe(types.length);
    assertTokenValues(tokens, types, reducedElems);
  });
});

describe("stringParse(text, opts) can change the type of a token given a", () => {
  test("one-to-one typeMap", () => {
    const elems = [" ", "function", " ", "false", " ", "this"];
    const types = ["ws", "declarator", "ws", "boolean", "ws", "word"];
    const opts = { typeMap: { declarator: "function", boolean: "false" } };
    const tokens = stringParse(elems.join(""), opts);

    expect(tokens.length).toBe(types.length);
    assertTokenValues(tokens, types, elems);
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
