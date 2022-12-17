const _ = {
  isString(val) {
    return typeof val === "string" || val instanceof String;
  },
};

function createBasicTokens(text) {
  const ws = `(?<ws>\\s+)`;
  const number = `(?<number>\\d+)`;
  const word = `(?<word>\\w+)`;
  const other = `(?<other>[^\\s\\d\\w])`; // everything else is a single char

  const regex = new RegExp(`${ws}|${number}|${word}|${other}`, "g");

  return [...text.matchAll(regex)].map((match) => {
    const [key, value] = Object.entries(match.groups).find(([key, value]) => {
      return value;
    });

    return { type: key, value };
  });
}

function createTokenMap(typeMap) {
  return Object.entries(typeMap).reduce((all, [newType, value]) => {
    if (_.isString(value)) {
      all.set(value, newType);
    } else if (Array.isArray(value)) {
      value.forEach((val) => all.set(val, newType));
    }

    return all;
  }, new Map());
}

function remapTokens(tokenMap) {
  return ({ type, value }) => {
    const mapValue = tokenMap.get(value);
    const newType = mapValue || type;

    return { type: newType, value };
  };
}

function arrayReduce(tokens, [first, ...rest]) {
  if (!first) return tokens;

  const newTokens = tokens.reduce(first, []);

  return arrayReduce(newTokens, rest);
}

export default function stringParse(text, opts = { typeMap: {} }) {
  let { typeMap, reducers } = opts;
  const tokenMap = opts.typeMap ? createTokenMap(typeMap) : new Map();

  reducers = reducers || [];

  let tokens = createBasicTokens(text).map(remapTokens(tokenMap));

  return arrayReduce(tokens, reducers);
}
