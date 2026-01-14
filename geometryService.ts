
export const getMoldura = () => [0, 7, 24, 31];

export const getEspelhamentos = (index: number) => {
  if (index >= 32) return []; // Somente para a grade 8x4

  const row = Math.floor(index / 8);
  const col = index % 8;

  const mirrorH = row * 8 + (7 - col);
  const mirrorV = (3 - row) * 8 + col;
  const mirrorD = (3 - row) * 8 + (7 - col);

  return [mirrorH, mirrorV, mirrorD].filter(i => i >= 0 && i < 32 && i !== index);
};

export const getCavalo = (index: number) => {
  if (index >= 32) return [];

  const row = Math.floor(index / 8);
  const col = index % 8;
  const moves = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2]
  ];

  return moves.map(([dr, dc]) => {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < 4 && nc >= 0 && nc < 8) return nr * 8 + nc;
    return -1;
  }).filter(i => i !== -1);
};

export const getDiagonaisSuperiores = (index: number) => {
  if (index >= 32) return [];
  const row = Math.floor(index / 8);
  const col = index % 8;
  const results: number[] = [];
  
  // Superior Esquerda e Superior Direita (apenas um nível para modulação imediata)
  [[row - 1, col - 1], [row - 1, col + 1]].forEach(([r, c]) => {
    if (r >= 0 && r < 4 && c >= 0 && c < 8) results.push(r * 8 + c);
  });
  return results;
};

export const getDiagonaisInferiores = (index: number) => {
  if (index >= 32) return [];
  const row = Math.floor(index / 8);
  const col = index % 8;
  const results: number[] = [];
  
  // Inferior Esquerda e Inferior Direita
  [[row + 1, col - 1], [row + 1, col + 1]].forEach(([r, c]) => {
    if (r >= 0 && r < 4 && c >= 0 && c < 8) results.push(r * 8 + c);
  });
  return results;
};

export const getOposicaoRelogio = (index: number) => {
  return (index + 6) % 12;
};
