import { createConfig, http } from "wagmi";
import { mainnet } from "viem/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { isAddress, type Address } from "viem";

/** Site metadata: the same values as the <title>, description and og tags in index.html. */
export const SITE_NAME = "IMD EDGE";
export const SITE_DESCRIPTION = "Pick a result, pay 1 IMD, and the IMD swarm analyses your call.";

/** Ethereum Mainnet, chain id 1. */
export const chain = mainnet;
export const PUBLIC_RPC_URL = "https://ethereum-rpc.publicnode.com";

/**
 * The verified original IMD token on Ethereum: listed for Ethereum in the IMD docs
 * (https://imd.fun/skill/onchain.md) and in api.imd.fun/requests/capabilities for chain 1;
 * name() "Identity.md", symbol() "IMD", 18 decimals, read onchain on 2026-11-27.
 */
export const IMD_TOKEN: Address = "0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7";
/** The IMD swarm's Intake v2 on every chain (same docs, same capabilities response). */
export const IMD_INTAKE: Address = "0xa43e6F75ee006411F79Ac1C84120606C2330DE82";
/** The creator wallet from the brief. Receives 0.5 IMD of every prediction. */
export const CREATOR_WALLET: Address = "0x83027AD9d0D5374335086c539dADD1db983441B0";

/**
 * The deployed ImdEdgePayments contract (contracts/src/ImdEdgePayments.sol). Owner-settable:
 * build with VITE_PAYMENT_CONTRACT=0x... after deploying and verifying it on Etherscan.
 * Empty means mainnet payments are not active, and the pay control says so instead of charging.
 */
const configured = (import.meta.env.VITE_PAYMENT_CONTRACT ?? "").trim();
export const PAYMENT_CONTRACT: Address | null = isAddress(configured) ? (configured as Address) : null;

export const PRICE_WEI = 10n ** 18n; // exactly 1 IMD
export const SWARM_SHARE_WEI = 5n * 10n ** 17n;
export const CREATOR_SHARE_WEI = 5n * 10n ** 17n;

export const IMD_API = "https://api.imd.fun";
export const EXPLORER = "https://explorer.imd.fun";
export const ETHERSCAN = "https://etherscan.io";

/**
 * Sports data: TheSportsDB v1. "123" is the provider's published free key; an owner with the
 * premium subscription can build with VITE_SPORTSDB_KEY to lift the free tier's limits.
 */
export const SPORTSDB_KEY = (import.meta.env.VITE_SPORTSDB_KEY ?? "").trim() || "123";

export const config = createConfig({
  chains: [chain],
  // EIP-6963 discovery lists every installed extension (MetaMask, Rabby, ...) under its own name
  multiInjectedProviderDiscovery: true,
  connectors: [injected(), coinbaseWallet({ appName: SITE_NAME })],
  transports: { [chain.id]: http(PUBLIC_RPC_URL) },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const paymentsAbi = [
  {
    type: "function", name: "predict", stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "bytes32" }, { name: "pick", type: "uint8" }, { name: "body", type: "bytes" }],
    outputs: [{ name: "requestId", type: "bytes32" }],
  },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;
