import { useState } from "react";
import { useConnection, useReadContracts, useSwitchChain, useWriteContract, useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { formatUnits, keccak256, stringToHex, toHex } from "viem";
import { CREATOR_WALLET, ETHERSCAN, IMD_TOKEN, PAYMENT_CONTRACT, PRICE_WEI, chain, erc20Abi, paymentsAbi } from "./config";
import type { Fixture } from "./sports";
import { buildBody, pickLabel, type Pick } from "./brief";
import type { SavedPrediction } from "./store";

type Step = "idle" | "approving" | "paying";

const fmt = (v: bigint) => Number(formatUnits(v, 18)).toLocaleString("en", { maximumFractionDigits: 4 });

/** Price breakdown and the pay flow for one picked result. */
export function PayPanel({
  fixture,
  pick,
  onConnect,
  onPaid,
}: {
  fixture: Fixture;
  pick: Pick;
  onConnect: () => void;
  onPaid: (p: SavedPrediction) => void;
}) {
  const { address, isConnected, chainId } = useConnection();
  const { switchChain } = useSwitchChain();
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<Step>("idle");
  const [note, setNote] = useState<string | null>(null);
  const [paidTx, setPaidTx] = useState<`0x${string}` | null>(null);

  const ready = isConnected && !!address && chainId === chain.id && !!PAYMENT_CONTRACT;
  const reads = useReadContracts({
    allowFailure: false,
    query: { enabled: ready },
    contracts: ready
      ? [
          { address: IMD_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [address!] },
          { address: IMD_TOKEN, abi: erc20Abi, functionName: "allowance", args: [address!, PAYMENT_CONTRACT!] },
          { address: PAYMENT_CONTRACT!, abi: paymentsAbi, functionName: "paused" },
        ]
      : [],
  });
  const [balance, allowance, paused] = (reads.data ?? []) as [bigint?, bigint?, boolean?];

  const fail = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setNote(/reject|denied|cancel/i.test(msg) ? "Declined in the wallet. Nothing was charged." : "The transaction did not go through. Check your wallet and try again.");
    setStep("idle");
  };

  async function approve() {
    setNote(null);
    setStep("approving");
    try {
      const hash = await writeContractAsync({ address: IMD_TOKEN, abi: erc20Abi, functionName: "approve", args: [PAYMENT_CONTRACT!, PRICE_WEI] });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      await reads.refetch();
      setStep("idle");
    } catch (e) {
      fail(e);
    }
  }

  async function pay() {
    setNote(null);
    setStep("paying");
    try {
      const body = JSON.stringify(buildBody(fixture, pick));
      const hash = await writeContractAsync({
        address: PAYMENT_CONTRACT!,
        abi: paymentsAbi,
        functionName: "predict",
        args: [keccak256(toHex(`thesportsdb:${fixture.id}`)), pick, stringToHex(body)],
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status !== "success") throw new Error("reverted");
      setPaidTx(hash);
      onPaid({
        tx: hash,
        fixtureId: fixture.id,
        match: `${fixture.home} vs ${fixture.away}`,
        pick: pickLabel(fixture, pick),
        kickoff: fixture.kickoff,
        paidAt: new Date().toISOString(),
      });
      await reads.refetch();
      setStep("idle");
    } catch (e) {
      fail(e);
    }
  }

  let action: JSX.Element;
  let hint: string | null = null;
  if (!PAYMENT_CONTRACT) {
    action = <button className="btn btn-primary btn-block" disabled>Pay 1 IMD</button>;
    hint = "Mainnet payments open once the IMD EDGE payment contract is deployed and verified. Nothing can be charged yet.";
  } else if (!isConnected) {
    action = <button className="btn btn-primary btn-block" onClick={onConnect}>Connect to pay 1 IMD</button>;
  } else if (chainId !== chain.id) {
    action = <button className="btn btn-primary btn-block" onClick={() => switchChain({ chainId: chain.id })}>Switch to {chain.name}</button>;
  } else if (reads.isLoading || balance === undefined) {
    action = <button className="btn btn-primary btn-block" disabled>Checking your IMD…</button>;
  } else if (paused) {
    action = <button className="btn btn-primary btn-block" disabled>Pay 1 IMD</button>;
    hint = "Payments are paused by the contract owner.";
  } else if (balance < PRICE_WEI) {
    action = <button className="btn btn-primary btn-block" disabled>Pay 1 IMD</button>;
    hint = `This wallet holds ${fmt(balance)} IMD. A prediction needs 1 IMD on Ethereum.`;
  } else if ((allowance ?? 0n) < PRICE_WEI) {
    action = (
      <button className="btn btn-primary btn-block" onClick={approve} disabled={step !== "idle"}>
        {step === "approving" ? "Approving in wallet…" : "Approve 1 IMD"}
      </button>
    );
    hint = "Step 1 of 2: let the payment contract take exactly 1 IMD.";
  } else {
    action = (
      <button className="btn btn-primary btn-block" onClick={pay} disabled={step !== "idle"}>
        {step === "paying" ? "Confirm in wallet…" : "Pay 1 IMD and get analysis"}
      </button>
    );
    hint = "Step 2 of 2: one transaction pays both shares.";
  }

  return (
    <div className="pay">
      <dl className="split">
        <div>
          <dt>Swarm analysis</dt>
          <dd className="num">0.5 IMD</dd>
        </div>
        <div>
          <dt>Creator</dt>
          <dd className="num">0.5 IMD</dd>
        </div>
        <div className="split-total">
          <dt>Total</dt>
          <dd className="num">1 IMD</dd>
        </div>
      </dl>
      {paidTx ? (
        <p className="ok" role="status">
          Paid. The swarm is writing your analysis; follow it under Your predictions.{" "}
          <a href={`${ETHERSCAN}/tx/${paidTx}`} target="_blank" rel="noreferrer">View transaction</a>
        </p>
      ) : (
        <>
          {action}
          <p className="hint" role="status">{note ?? hint}</p>
        </>
      )}
      <p className="fine">
        0.5 IMD goes to creator wallet <a className="mono" href={`${ETHERSCAN}/address/${CREATOR_WALLET}`} target="_blank" rel="noreferrer">{CREATOR_WALLET.slice(0, 6)}…{CREATOR_WALLET.slice(-4)}</a> in the same transaction.
      </p>
    </div>
  );
}
