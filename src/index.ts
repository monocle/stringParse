interface Token {
  type: string;
  value: string;
}

type TokenReducer = (
  newTokens: Token[],
  curToken: Token,
  idx?: number,
  origTokens?: Token[]
) => Token[];

const NullToken: Token = { type: "", value: "" };

const _ = {
  isString(val: any) {
    return typeof val === "string" || val instanceof String;
  },
  assertExists(property: string, message: string) {
    if (!property) {
      throw new Error(message);
    }
  },
  arrayReduce: function arrayReduce(
    tokens: Token[],
    reducers: TokenReducer[]
  ): Token[] {
    if (reducers.length === 0) return tokens;

    const [first, ...rest] = reducers;
    const newTokens = tokens.reduce(first, []);

    return arrayReduce(newTokens, rest);
  },
};

function createBasicTokens(text: string) {
  const ws = `(?<ws>\\s+)`;
  const number = `(?<number>\\d+)`;
  const word = `(?<word>\\w+)`;
  const newline = `(?<newline>\\n+)`;
  const other = `(?<other>[^\\s\\d\\w])`; // everything else is a single char

  const regex = new RegExp(`${newline}|${ws}|${number}|${word}|${other}`, "g");

  return [...text.matchAll(regex)].map((match) => {
    const [key, value] = Object.entries(match.groups).find(([, value]) => {
      return value;
    });

    return { type: key, value };
  });
}

// ------------------------ typeMap ---------------------
function createTokenMap(typeMap = {}) {
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
  return ({ type, value }: Token) => {
    const mapValue = tokenMap.get(value);
    const newType = mapValue || type;

    return { type: newType, value };
  };
}

// ------------------------ concat ---------------------
function isSignal(pattern: string, tokens: Token[], idx: number) {
  return pattern.split("").every((char, i) => {
    const token = tokens[idx + i];

    if (!token) return false;
    return char === token.value;
  });
}

function createConcatReducer(settings) {
  _.assertExists(
    settings.type,
    `[stringParse] A type must be provided to concat.`
  );
  _.assertExists(
    settings.start,
    `[stringParse] A startDelimeter must be provided to concat.`
  );

  let tempToken: Token = { ...NullToken };
  let skipNum = 0;

  function collectDelimeter({
    type,
    idx,
    origTokens,
    tempToken,
  }: {
    type: string;
    idx: number;
    origTokens: Token[];
    tempToken: Token;
  }) {
    const delimeter = settings[type];
    const len = delimeter.length;
    let tokens: Token[] = [];

    if (
      (type === "start" && settings.includeStartDelimeter) ||
      (type === "stop" && settings.includeStopDelimeter)
    ) {
      tempToken.value += delimeter;
    } else {
      for (let i = 0; i < len; i++) {
        if (origTokens[idx + i]) {
          tokens.push({ ...origTokens[idx + i] });
        }
      }
    }

    return [len, tempToken, tokens];
  }

  return (
    newTokens: Token[],
    curToken: Token,
    idx: number,
    origTokens: Token[]
  ) => {
    const isCollecting = tempToken.type !== "";
    const type = settings.type;
    let delimTokens = [];

    skipNum--;

    if (skipNum > 0) return newTokens;

    if (!isCollecting && isSignal(settings.start, origTokens, idx)) {
      tempToken = { ...NullToken, type };

      [skipNum, tempToken, delimTokens] = collectDelimeter({
        type: "start",
        idx,
        origTokens,
        tempToken,
      });

      newTokens = newTokens.concat(delimTokens);
    } else if (isCollecting && isSignal(settings.stop, origTokens, idx)) {
      [skipNum, tempToken, delimTokens] = collectDelimeter({
        type: "stop",
        idx,
        origTokens,
        tempToken,
      });

      newTokens = newTokens.concat(tempToken).concat(delimTokens);

      if (settings.stop === "") {
        newTokens.push({ ...curToken });
      }

      tempToken = { ...NullToken };
    } else if (isCollecting) {
      tempToken.value += curToken.value;
    } else {
      newTokens.push({ ...curToken });
    }

    return newTokens;
  };
}

function createConcatReducers(concat: TokenReducer[]) {
  return concat.map((settings) => {
    return createConcatReducer({
      includeStartDelimeter: false,
      includeStopDelimeter: false,
      ...settings,
    });
  });
}

interface StringParseOptions {
  typeMap: [];
  concat: [];
  reducers: [];
}

export default function stringParse(
  text: string,
  opts: StringParseOptions = { typeMap: [], concat: [], reducers: [] }
) {
  const { typeMap = [], concat = [], reducers = [] } = opts;
  const tokenMap = createTokenMap(typeMap);
  const concatReducers = createConcatReducers(concat);
  // Reducing should happen before remapping tokens.
  // Custom reducers should happen after convenience reducers
  // since the user can run custom reducers manually after
  // stringParse().
  let tokens = createBasicTokens(text);
  tokens = _.arrayReduce(tokens, concatReducers.concat(reducers));

  return tokens.map(remapTokens(tokenMap));
}
