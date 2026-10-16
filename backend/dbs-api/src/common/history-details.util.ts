export type HistoryParam = {
  id?: string | number | null;
  name?: string | null;
  type?: string | null;
  value?: string | null;
};

export function formatHistoryValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'boolean':
    case 'bigint':
      return value.toString();
    case 'symbol':
      return value.description ?? '';
    case 'function':
      return value.name || '[function]';
    case 'object':
      if (value instanceof Date) {
        return value.toISOString();
      }

      try {
        return JSON.stringify(value);
      } catch {
        return '[object]';
      }
  }

  return '';
}

export function hasHistoryValueChanged(
  previous: unknown,
  next: unknown,
): boolean {
  return formatHistoryValue(previous) !== formatHistoryValue(next);
}

export function describeFieldChange(
  label: string,
  previous: unknown,
  next: unknown,
): string | null {
  if (!hasHistoryValueChanged(previous, next)) {
    return null;
  }

  return `${label} de '${formatHistoryValue(previous)}' a '${formatHistoryValue(next)}'`;
}

function getParamIdKey(param: HistoryParam): string | null {
  if (param.id === undefined || param.id === null) {
    return null;
  }

  const id = String(param.id).trim();
  return id ? id : null;
}

function getParamName(param: HistoryParam): string {
  const name = formatHistoryValue(param.name).trim();
  return name || 'sans nom';
}

function findMatchingParamIndex(
  param: HistoryParam,
  candidates: HistoryParam[],
  usedIndexes: Set<number>,
): number {
  const idKey = getParamIdKey(param);

  if (idKey) {
    const indexById = candidates.findIndex(
      (candidate, index) =>
        !usedIndexes.has(index) && getParamIdKey(candidate) === idKey,
    );

    if (indexById !== -1) {
      return indexById;
    }
  }

  const name = getParamName(param);
  return candidates.findIndex(
    (candidate, index) =>
      !usedIndexes.has(index) && getParamName(candidate) === name,
  );
}

export function describeParamChanges(
  previousParams: HistoryParam[] = [],
  nextParams: HistoryParam[] = [],
): string[] {
  const changes: string[] = [];
  const matchedPreviousIndexes = new Set<number>();

  for (const nextParam of nextParams) {
    const previousIndex = findMatchingParamIndex(
      nextParam,
      previousParams,
      matchedPreviousIndexes,
    );

    if (previousIndex === -1) {
      changes.push(
        `ajout du parametre '${getParamName(nextParam)}' = '${formatHistoryValue(nextParam.value)}'`,
      );
      continue;
    }

    matchedPreviousIndexes.add(previousIndex);
    const previousParam = previousParams[previousIndex];
    const previousName = getParamName(previousParam);
    const nextName = getParamName(nextParam);

    if (previousName !== nextName) {
      changes.push(`renommage du parametre '${previousName}' en '${nextName}'`);
    }

    if (hasHistoryValueChanged(previousParam.value, nextParam.value)) {
      changes.push(
        `parametre '${nextName}' de '${formatHistoryValue(previousParam.value)}' a '${formatHistoryValue(nextParam.value)}'`,
      );
    }

    if (hasHistoryValueChanged(previousParam.type, nextParam.type)) {
      changes.push(
        `type du parametre '${nextName}' de '${formatHistoryValue(previousParam.type)}' a '${formatHistoryValue(nextParam.type)}'`,
      );
    }
  }

  previousParams.forEach((previousParam, index) => {
    if (matchedPreviousIndexes.has(index)) {
      return;
    }

    changes.push(
      `suppression du parametre '${getParamName(previousParam)}' (ancienne valeur: '${formatHistoryValue(previousParam.value)}')`,
    );
  });

  return changes;
}
