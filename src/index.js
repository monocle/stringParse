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

function arrayReduce(tokens, reducers = []) {
  if (reducers.length === 0) return tokens;

  const [first, ...rest] = reducers;

  const newTokens = tokens.reduce(first, []);

  return arrayReduce(newTokens, rest);
}

// ------------------------ concat ---------------------
function isAtTokenPos(targetStr, tokens, idx) {
  return targetStr.split("").every((char, i) => {
    return char === tokens[idx + i].value;
  });
}

function tokenReducer(
  type,
  startDelimeter,
  endDelimeter,
  includeStartDelimeter
) {
  if (!startDelimeter) {
    throw new Error(
      "[stringParse] A start delimeter must be provided for the concat option"
    );
  }

  let tempToken = undefined;

  return (newTokens, curToken, idx, origTokens) => {
    const startDelimFirstChar = startDelimeter[0];
    const isBuilding = !!tempToken;
    const isFinishedBuilding =
      isBuilding && isAtTokenPos(endDelimeter, origTokens, idx + 1);
    const shouldContinueBuilding = isBuilding && !isFinishedBuilding;
    const shouldStartBuilding =
      !isBuilding && isAtTokenPos(startDelimeter, origTokens, idx);

    if (shouldStartBuilding) {
      if (includeStartDelimeter) {
        tempToken = { type, value: startDelimFirstChar };
      }
    } else if (shouldContinueBuilding) {
      tempToken.value += curToken.value;
    } else if (isFinishedBuilding) {
      tempToken.value += curToken.value;
      newTokens.push({ ...tempToken });

      tempToken = undefined;
    } else {
      newTokens.push(curToken);
    }

    return newTokens;
  };
}

function createConcatReducers(concat = []) {
  return concat.map(({ type, start, end, includeStartDelimeter }) => {
    return tokenReducer(type, start, end, includeStartDelimeter);
  });
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
  tokens = arrayReduce(tokens, concatReducers.concat(reducers));

  return tokens.map(remapTokens(tokenMap));
}
