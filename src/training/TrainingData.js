// Training positions for visualization and calculation exercises
export const TRAINING_POSITIONS = [
  // Tactical positions - varying difficulty
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', name: 'Scholar\'s Mate Threat', difficulty: 1, solution: 'Qxf7#', theme: 'checkmate' },
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', name: 'Italian Game', difficulty: 1, solution: 'Ng5', theme: 'attack' },
  { fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2', name: 'Alekhine Defense', difficulty: 2, solution: 'e5', theme: 'space' },
  { fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 6 5', name: 'Giuoco Piano', difficulty: 2, solution: 'c3', theme: 'center' },
  { fen: 'r2qkb1r/ppp2ppp/2n1bn2/3pp3/4P3/1BN2N2/PPPP1PPP/R1BQK2R w KQkq d6 0 5', name: 'Central Tension', difficulty: 3, solution: 'exd5', theme: 'tactics' },
  { fen: 'r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQR1K1 w kq - 7 6', name: 'Open Game', difficulty: 3, solution: 'Nd5', theme: 'outpost' },
  { fen: 'r1bqr1k1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8', name: 'Middlegame Tactics', difficulty: 4, solution: 'Bg5', theme: 'pin' },
  { fen: '2rq1rk1/pp1bppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 4 10', name: 'Dragon Sicilian', difficulty: 4, solution: 'Bh6', theme: 'attack' },
  { fen: 'r1bq1rk1/2ppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 w - - 0 8', name: 'Ruy Lopez', difficulty: 5, solution: 'c3', theme: 'positional' },
  { fen: 'r2q1rk1/pppb1ppp/2n1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQ - 0 7', name: 'QGD Position', difficulty: 5, solution: 'cxd5', theme: 'structure' }
];

// Coordinate training data
export const SQUARES = [];
const files = ['a','b','c','d','e','f','g','h'];
const ranks = ['1','2','3','4','5','6','7','8'];
files.forEach(f => ranks.forEach(r => SQUARES.push(f + r)));

// Endgame positions for training
export const ENDGAME_POSITIONS = [
  { fen: '4k3/8/8/8/8/8/4KQ2/8 w - - 0 1', name: 'K+Q vs K', difficulty: 1, goal: 'Checkmate' },
  { fen: '4k3/8/8/8/8/8/4KR2/8 w - - 0 1', name: 'K+R vs K', difficulty: 2, goal: 'Checkmate' },
  { fen: '8/8/8/8/8/4k3/4P3/4K3 w - - 0 1', name: 'K+P vs K', difficulty: 2, goal: 'Promote' },
  { fen: '4k3/8/8/8/8/8/3BKB2/8 w - - 0 1', name: 'K+2B vs K', difficulty: 3, goal: 'Checkmate' },
  { fen: '8/8/8/3k4/8/8/R3K3/8 w - - 0 1', name: 'K+R vs K Technique', difficulty: 3, goal: 'Checkmate' },
  { fen: '8/5pk1/8/8/8/8/6PP/6K1 w - - 0 1', name: 'Pawn Endgame', difficulty: 4, goal: 'Win' }
];

// Pattern recognition themes
export const TACTICAL_THEMES = [
  'fork', 'pin', 'skewer', 'discovery', 'deflection', 'decoy',
  'removal-of-guard', 'overloading', 'interference', 'zwischenzug',
  'back-rank', 'smothered-mate', 'greek-gift', 'clearance'
];
