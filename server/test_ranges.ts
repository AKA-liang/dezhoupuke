import { RANGES, preflopStrength } from './src/ai/ranges.js';

// Test order independence
const a = preflopStrength('A', 'K', true, RANGES.balanced);
const b = preflopStrength('K', 'A', true, RANGES.balanced);
console.log('AKs:', a, 'KAs:', b, 'Same:', a === b);

// Test known values
console.log('AA:', preflopStrength('A', 'A', false, RANGES.balanced));
console.log('72o:', preflopStrength('7', '2', false, RANGES.balanced));
console.log('JTs:', preflopStrength('J', 'T', true, RANGES.balanced));
console.log('Ranges OK');
