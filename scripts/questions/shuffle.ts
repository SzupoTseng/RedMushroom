/**
 * 共用：把選項打亂，並回報正確答案的新 key。
 *
 * 所有模板都把正確答案寫在 '1'，會被孩子發現「永遠選 1」的捷徑。
 * 這個 helper 在 seed 時間把選項重新洗牌、重新編號 1..N，
 * 並回報正確答案在新編號中的位置。
 *
 * sorting 題（answer 如 '1,2,3,4'）保持不洗，因為 answer 本身是順序。
 */

export interface ShuffleResult {
  options: Record<string, string>;
  answer: string;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffleSingleChoice(
  options: Record<string, string>,
  answer: string
): ShuffleResult {
  // 排序題的 answer 是逗號分隔序列，原樣回傳。
  if (answer.includes(',')) {
    return { options, answer };
  }

  const entries = Object.entries(options);
  shuffle(entries);

  const newOptions: Record<string, string> = {};
  let newAnswer = answer;
  entries.forEach(([oldKey, value], idx) => {
    const newKey = String(idx + 1);
    newOptions[newKey] = value;
    if (oldKey === answer) newAnswer = newKey;
  });
  return { options: newOptions, answer: newAnswer };
}
