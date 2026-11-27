import { useEffect, useRef } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { WALLET_ICONS } from "./wallet-icons";
import { OPEN_IN, isMobileBrowser } from "./open-in";
import { chain } from "./config";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const svgSrc = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** The one connect control, its states, and the wallet sheet (controlled by the page). */
export function ConnectControl({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const { address, isConnected, chainId } = useConnection();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (isConnected && address) {
    if (chainId !== chain.id) {
      return (
        <button className="btn btn-primary" onClick={() => switchChain({ chainId: chain.id })} disabled={switching}>
          {switching ? "Switching…" : `Switch to ${chain.name}`}
        </button>
      );
    }
    return (
      <button className="btn btn-quiet" onClick={() => disconnect()} title="Disconnect this wallet">
        <span className="mono">{short(address)}</span> · Disconnect
      </button>
    );
  }
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)} aria-haspopup="dialog">
        Connect
      </button>
      {open && <Sheet onClose={() => setOpen(false)} />}
    </>
  );
}

function Sheet({ onClose }: { onClose: () => void }) {
  const mobile = isMobileBrowser();
  const { isConnected } = useConnection();
  const connectors = useConnectors();
  const { connect, isPending, variables, error, reset } = useConnect();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      back?.focus?.();
    };
  }, [onClose]);
  useEffect(() => {
    if (isConnected) onClose();
  }, [isConnected, onClose]);

  // EIP-6963 names each installed extension; the generic injected row only shows when none was found.
  const named = connectors.some((c) => c.type === "injected" && c.id !== "injected");
  const listed = [...connectors.filter((c) => c.type === "injected"), ...connectors.filter((c) => c.type !== "injected")].filter(
    (c) => !(c.id === "injected" && named),
  );
  const label = (c: Connector) =>
    c.id === "injected" ? "Browser wallet" : c.id === "coinbaseWalletSDK" && mobile ? "Coinbase Smart Wallet" : c.name;
  const icon = (c: Connector) => c.icon ?? (WALLET_ICONS[c.id] ? svgSrc(WALLET_ICONS[c.id]!) : undefined);
  const rejected = error ? (/reject|denied|cancel/i.test(error.message) ? "Request declined in the wallet. Choose a wallet to try again." : "That wallet did not connect. Try again or pick another.") : null;

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 id="sheet-title">Connect a wallet</h2>
          <button ref={closeRef} className="x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-rows">
          {mobile &&
            OPEN_IN.map((w) => (
              <a key={w.id} className="row" href={w.href(location.href)}>
                <span className="ic">{WALLET_ICONS[w.id] ? <img width={28} height={28} src={svgSrc(WALLET_ICONS[w.id]!)} alt="" /> : null}</span>
                <span>Open in {w.name}</span>
              </a>
            ))}
          {listed
            .filter((c) => !mobile || c.type !== "injected")
            .map((c) => (
              <button
                key={c.uid}
                className="row"
                onClick={() => {
                  reset();
                  connect({ connector: c });
                }}
                disabled={isPending}
              >
                <span className="ic">{icon(c) ? <img width={28} height={28} src={icon(c)} alt="" /> : null}</span>
                <span>
                  {label(c)}
                  {isPending && variables?.connector === c ? " · opening…" : ""}
                </span>
              </button>
            ))}
        </div>
        <p className="sheet-note" role="status">
          {rejected ?? "MetaMask and Rabby show up here by name when installed."}
        </p>
      </div>
    </div>
  );
}
