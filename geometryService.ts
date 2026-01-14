
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
  
  [[row + 1, col - 1], [row + 1, col + 1]].forEach(([r, c]) => {
    if (r >= 0 && r < 4 && c >= 0 && c < 8) results.push(r * 8 + c);
  });
  return results;
};

export const getOposicaoRelogio = (index: number) => {
  if (index >= 12) return -1;
  return (index + 6) % 12;
};

export const getEixoConceitualRelogio = (index: number): string | null => {
  if (index === 2 || index === 8) return "Eixo Horizontal (Expansão e Visão de Futuro)";
  if (index === 5 || index === 11) return "Eixo Vertical (Inconsciente e Espiritualidade)";
  if (index === 1 || index === 7) return "Eixo Social (Matéria vs Transformação)";
  if (index === 3 || index === 9) return "Eixo Emocional (Base vs Realização)";
  return null;
};
