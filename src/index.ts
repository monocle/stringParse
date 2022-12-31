interface Token {
  type: string;
  value: string;
}

interface ConcatReducerSetting {
  type: string;
  start: string;
  stop?: string;
  includeStartDelimeter?: boolean;
  includeStopDelimeter?: boolean;
}

type TokenReducer = (
  newTokens: Token[],
  curToken: Token,
  idx: number,
  origTokens: Token[]
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
    const [first, ...rest] = reducers;

    if (!first) {
      return tokens;
    }
    const newTokens = tokens.reduce<Token[]>(first, []);

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
    const matchGroups = match.groups ?? {};

    const [key, value] = <[string, string]>Object.entries(matchGroups).find(
      ([, value]) => {
        return value;
      }
    );

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

function remapTokens(tokenMap: Map<string, string>) {
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

function createConcatReducer(setting: ConcatReducerSetting) {
  let skipNum = 0;
  let tempToken: Token = { ...NullToken };
  const stop = setting.stop ?? "\n";
  const includeStartDelimeter = setting.includeStartDelimeter ?? false;
  const includeStopDelimeter = setting.includeStopDelimeter ?? false;

  function collectDelimeter({
    startOrStop,
    idx,
    origTokens,
    tempToken,
  }: {
    startOrStop: "start" | "stop";
    idx: number;
    origTokens: Token[];
    tempToken: Token;
  }): [number, Token, Token[]] {
    const delimeter = setting[startOrStop];

    if (!delimeter) {
      return [0, tempToken, []];
    }

    const len = delimeter.length;
    let tokens: Token[] = [];

    if (
      (startOrStop === "start" && includeStartDelimeter) ||
      (startOrStop === "stop" && includeStopDelimeter)
    ) {
      tempToken.value += delimeter;
    } else {
      for (let i = 0; i < len; i++) {
        const nextToken = origTokens[idx + i];

        if (nextToken) {
          tokens.push(nextToken);
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
  ): Token[] => {
    const isCollecting = tempToken.type !== "";
    const type = setting.type;
    const origLen = origTokens.length;
    let delimTokens = [];

    skipNum--;

    if (skipNum > 0) return newTokens;

    if (!isCollecting && isSignal(setting.start, origTokens, idx)) {
      tempToken = { ...NullToken, type };

      [skipNum, tempToken, delimTokens] = collectDelimeter({
        startOrStop: "start",
        idx,
        origTokens,
        tempToken,
      });

      newTokens = newTokens.concat(delimTokens);
    } else if (isCollecting && isSignal(stop, origTokens, idx)) {
      [skipNum, tempToken, delimTokens] = collectDelimeter({
        startOrStop: "stop",
        idx,
        origTokens,
        tempToken,
      });

      newTokens = newTokens.concat(tempToken).concat(delimTokens);

      if (stop === "") {
        newTokens.push({ ...curToken });
      }

      tempToken = { ...NullToken };
    } else if (isCollecting) {
      tempToken.value += curToken.value;
    } else {
      newTokens.push({ ...curToken });
    }

    if (
      tempToken.value !== "" &&
      (idx === origLen - 1 || idx + skipNum >= origLen)
    ) {
      newTokens.push({ ...tempToken });
    }

    return newTokens;
  };
}

function createConcatReducers(concat: ConcatReducerSetting[]) {
  return concat.map((setting) => {
    return createConcatReducer(setting);
  });
}

export default function stringParse(
  text: string,
  opts = { typeMap: [], concat: [], reducers: [] }
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
