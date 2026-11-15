import crypto from 'node:crypto';

// Letters and digits without look-alikes (no 0/O, 1/I/L), because people type codes from a screen.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 characters
const LENGTH = 8; // 31^8 ≈ 850 billion possible codes

// crypto.randomInt is a secure random source and picks every character with equal chance.
export function generateInviteCode() {
  let code = '';
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return code;
}

// What the user typed or scanned -> the stored form: "k7mx-4qpt " -> "K7MX4QPT".
export function normalizeInviteCode(input) {
  return typeof input === 'string' ? input.toUpperCase().replace(/[\s-]/g, '') : '';
}
