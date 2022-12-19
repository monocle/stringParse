const _ = {
  isString(val) {
    return typeof val === "string" || val instanceof String;
  },
  assertExists(thing, message) {
    if (!thing) {
      throw new Error(message);
    }
  },
};

_.arrayReduce = function arrayReduce(tokens, reducers = []) {
  if (reducers.length === 0) return tokens;

  const [first, ...rest] = reducers;
  const newTokens = tokens.reduce(first, []);

  return arrayReduce(newTokens, rest);
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
  return ({ type, value }) => {
    const mapValue = tokenMap.get(value);
    const newType = mapValue || type;

    return { type: newType, value };
  };
}

// ------------------------ concat ---------------------
function isAtTokenPos(targetStr, tokens, idx) {
  return targetStr.split("").every((char, i) => {
    const nextToken = tokens[idx + i];

    if (!nextToken) return false;
    return char === nextToken.value;
  });
}

function createConcatReducer(
  type,
  startDelimeter,
  stopDelimeter = "\n",
  includeStartDelimeter = false,
  includeStopDelimeter = false
) {
  _.assertExists(type, `[stringParse] A type must be provided to concat.`);
  _.assertExists(
    startDelimeter,
    `[stringParse] A startDelimeter must be provided to concat.`
  );

  let tempToken = undefined;
  let stopDelimeterRemaining = 0;

  return (newTokens, curToken, idx, origTokens) => {
    const startDelimFirstChar = startDelimeter[0];
    const isBuilding = !!tempToken;
    const isFinishedBuilding =
      isBuilding && isAtTokenPos(stopDelimeter, origTokens, idx);
    const shouldContinueBuilding = isBuilding && !isFinishedBuilding;
    const shouldStartBuilding =
      !isBuilding && isAtTokenPos(startDelimeter, origTokens, idx);
    const isBuildingStopDelimeter = stopDelimeterRemaining > 0;

    if (shouldStartBuilding) {
      if (includeStartDelimeter) {
        tempToken = { type, value: startDelimFirstChar };
      } else {
        newTokens.push(curToken);
        tempToken = { type, value: "" };
      }
    } else if (shouldContinueBuilding) {
      tempToken.value += curToken.value;

      if (isBuildingStopDelimeter) {
        stopDelimeterRemaining -= 1;

        if (stopDelimeterRemaining === 0) {
          newTokens.push({ ...tempToken });
          tempToken = undefined;
        }
      }
    } else if (isFinishedBuilding && !includeStopDelimeter) {
      newTokens.push({ ...tempToken });
      newTokens.push(curToken);
      tempToken = undefined;
    } else if (isFinishedBuilding && includeStopDelimeter) {
      tempToken.value += curToken.value;

      stopDelimeterRemaining = stopDelimeter.length - 1;

      if (stopDelimeterRemaining === 0) {
        tempToken = undefined;
      }
    } else {
      newTokens.push(curToken);
    }

    return newTokens;
  };
}

function createConcatReducers(concat = []) {
  return concat.map(
    ({ type, start, stop, includeStartDelimeter, includeStopDelimeter }) => {
      return createConcatReducer(
        type,
        start,
        stop,
        includeStartDelimeter,
        includeStopDelimeter
      );
    }
  );
}

export default function stringParse(text, opts) {
  const { typeMap, concat } = opts;
  const tokenMap = createTokenMap(typeMap);
  const concatReducers = createConcatReducers(concat);
  let reducers = opts.reducers || [];

  // Reducing should happen before remapping tokens.
  // Custom reducers should happen after convenience reducers
  // since the user can run custom reducers manually after
  // stringParse().
  let tokens = createBasicTokens(text);
  tokens = _.arrayReduce(tokens, concatReducers.concat(reducers));

  return tokens.map(remapTokens(tokenMap));
}
