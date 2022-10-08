export function shortenedAddress(address: string, headLength = 8) {
  return `${address.slice(0, headLength)}...${address.slice(
    address.length - (headLength - 2),
  )}`;
}

export function normalizeChainId(chainId: string | number): number {
  if (typeof chainId === 'string') {
    const isHex = chainId.trim().substring(0, 2);

    return Number.parseInt(chainId, isHex === '0x' ? 16 : 10);
  }
  return chainId;
}
