import { getRandomBytes } from 'expo-crypto';
export const vaultRandom = (length: number) => getRandomBytes(length);
